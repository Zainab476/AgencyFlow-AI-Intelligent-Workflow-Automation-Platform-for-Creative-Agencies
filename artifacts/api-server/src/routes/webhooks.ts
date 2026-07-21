import { Router } from "express";
import crypto from "crypto";
import {
  db,
  webhookConfigsTable,
  workflowExecutionLogsTable,
  inboundWebhookTokensTable,
  projectsTable,
  clientsTable,
  tasksTable,
  projectMembersTable,
  notificationsTable,
  documentsTable,
} from "@workspace/db";
import { eq, and, desc, gte, lte, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { analyzeProject } from "../lib/ai/analyzer";
import { generateDocumentContent } from "../lib/ai/generator";
import { sendEmail } from "../lib/webhooks/email";
import type { DocumentType } from "../lib/ai/generator";

const router = Router();

// ─── Inbound action endpoint (no user-session auth, uses token) ─────────────
// POST /api/webhooks/action/:token/:action
router.post("/action/:token/:action", async (req, res) => {
  const { token, action } = req.params as Record<string, string>;

  // Validate token
  const [tokenRow] = await db
    .select()
    .from(inboundWebhookTokensTable)
    .where(
      and(
        eq(inboundWebhookTokensTable.token, token)
      )
    )
    .limit(1);

  if (!tokenRow || tokenRow.revokedAt !== null) {
    res.status(401).json({ error: "Invalid or revoked token" });
    return;
  }

  const userId = tokenRow.userId;
  const requestBody = req.body as Record<string, unknown>;
  const start = Date.now();
  let responsePayload: Record<string, unknown> = {};
  let status = "success";
  let error: string | null = null;

  try {
    switch (action) {
      case "analyze": {
        const { projectId } = requestBody as { projectId: number };
        if (!projectId) throw new Error("projectId is required");

        const [row] = await db
          .select({ project: projectsTable, clientName: clientsTable.companyName })
          .from(projectsTable)
          .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
          .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
          .limit(1);

        if (!row) throw new Error("Project not found");

        const [taskCountRow] = await db
          .select({ count: count() })
          .from(tasksTable)
          .where(eq(tasksTable.projectId, projectId));

        const [memberCountRow] = await db
          .select({ count: count() })
          .from(projectMembersTable)
          .where(eq(projectMembersTable.projectId, projectId));

        const analysis = await analyzeProject({
          campaignName: row.project.campaignName,
          status: row.project.status,
          budget: row.project.budget !== null ? Number(row.project.budget) : null,
          startDate: row.project.startDate,
          endDate: row.project.endDate,
          clientName: row.clientName ?? null,
          taskCount: taskCountRow?.count ?? 0,
          memberCount: memberCountRow?.count ?? 0,
        });

        responsePayload = { analysis };
        break;
      }

      case "generate-document": {
        const { projectId, type } = requestBody as { projectId: number; type: DocumentType };
        if (!projectId || !type) throw new Error("projectId and type are required");

        const validTypes: DocumentType[] = ["proposal", "contract", "presentation", "invoice"];
        if (!validTypes.includes(type)) throw new Error("Invalid document type");

        const [row] = await db
          .select({ project: projectsTable, clientName: clientsTable.companyName })
          .from(projectsTable)
          .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
          .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
          .limit(1);

        if (!row) throw new Error("Project not found");

        const { title, content } = await generateDocumentContent(type, {
          campaignName: row.project.campaignName,
          clientName: row.clientName ?? "Client",
          status: row.project.status,
          budget: row.project.budget !== null ? Number(row.project.budget) : null,
          startDate: row.project.startDate,
          endDate: row.project.endDate,
          agencyName: "AgencyFlow Creative Studio",
        });

        const [saved] = await db
          .insert(documentsTable)
          .values({ userId, projectId, type, title, content })
          .returning();

        responsePayload = { document: { id: saved!.id, title, type } };
        break;
      }

      case "notify": {
        const { message, title: notifTitle } = requestBody as {
          message: string;
          title?: string;
          projectId?: number;
        };
        if (!message) throw new Error("message is required");

        await db.insert(notificationsTable).values({
          userId,
          type: "assignment",
          title: notifTitle ?? "Workflow Notification",
          message,
          projectId: (requestBody.projectId as number | undefined) ?? null,
          taskId: null,
          read: false,
        });

        responsePayload = { success: true };
        break;
      }

      case "send-email": {
        const { to, subject, message, projectName, projectLink } = requestBody as {
          to: string;
          subject: string;
          message: string;
          projectName?: string;
          projectLink?: string;
        };
        if (!to || !subject || !message) throw new Error("to, subject, and message are required");

        const result = await sendEmail({
          to,
          subject,
          projectName: projectName ?? "AgencyFlow Project",
          message,
          projectLink,
        });

        if (result.error) throw new Error(result.error);
        responsePayload = { success: true, emailId: result.id };
        break;
      }

      default:
        res.status(404).json({ error: `Unknown action: ${action}` });
        return;
    }
  } catch (err) {
    status = "error";
    error = err instanceof Error ? err.message : "Action failed";
    responsePayload = { error };
  }

  const durationMs = Date.now() - start;

  // Log the inbound call
  await db.insert(workflowExecutionLogsTable).values({
    userId,
    webhookConfigId: tokenRow.webhookConfigId ?? null,
    direction: "inbound",
    eventOrAction: action,
    status,
    requestBody: requestBody as any,
    responseBody: responsePayload as any,
    durationMs,
    error,
  }).catch(() => {});

  if (status === "error") {
    res.status(400).json(responsePayload);
  } else {
    res.json(responsePayload);
  }
});

// ─── Protected routes below ──────────────────────────────────────────────────
router.use(requireAuth);

// ── Webhook Configs CRUD ─────────────────────────────────────────────────────

// GET /api/webhooks/configs
router.get("/configs", async (req, res) => {
  const userId = req.user!.userId;
  const configs = await db
    .select()
    .from(webhookConfigsTable)
    .where(eq(webhookConfigsTable.userId, userId))
    .orderBy(desc(webhookConfigsTable.createdAt));
  res.json(configs.map(formatConfig));
});

// POST /api/webhooks/configs
router.post("/configs", async (req, res) => {
  const userId = req.user!.userId;
  const { name, url, secret, eventTypes, active } = req.body as {
    name: string;
    url: string;
    secret?: string;
    eventTypes: string[];
    active?: boolean;
  };

  if (!name || !url || !Array.isArray(eventTypes)) {
    res.status(400).json({ error: "name, url, and eventTypes are required" });
    return;
  }

  const generatedSecret = secret || crypto.randomBytes(32).toString("hex");

  const [config] = await db
    .insert(webhookConfigsTable)
    .values({
      userId,
      name,
      url,
      secret: generatedSecret,
      eventTypes,
      active: active ?? true,
    })
    .returning();

  res.status(201).json(formatConfig(config!));
});

// GET /api/webhooks/configs/:id
router.get("/configs/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt((req.params as Record<string, string>)["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [config] = await db
    .select()
    .from(webhookConfigsTable)
    .where(and(eq(webhookConfigsTable.id, id), eq(webhookConfigsTable.userId, userId)))
    .limit(1);

  if (!config) { res.status(404).json({ error: "Config not found" }); return; }
  res.json(formatConfig(config));
});

// PUT /api/webhooks/configs/:id
router.put("/configs/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt((req.params as Record<string, string>)["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { name, url, secret, eventTypes, active } = req.body as {
    name?: string;
    url?: string;
    secret?: string;
    eventTypes?: string[];
    active?: boolean;
  };

  const updateData: Partial<typeof webhookConfigsTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (name !== undefined) updateData.name = name;
  if (url !== undefined) updateData.url = url;
  if (secret !== undefined) updateData.secret = secret;
  if (eventTypes !== undefined) updateData.eventTypes = eventTypes;
  if (active !== undefined) updateData.active = active;

  const [updated] = await db
    .update(webhookConfigsTable)
    .set(updateData)
    .where(and(eq(webhookConfigsTable.id, id), eq(webhookConfigsTable.userId, userId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Config not found" }); return; }
  res.json(formatConfig(updated));
});

// DELETE /api/webhooks/configs/:id
router.delete("/configs/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt((req.params as Record<string, string>)["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [deleted] = await db
    .delete(webhookConfigsTable)
    .where(and(eq(webhookConfigsTable.id, id), eq(webhookConfigsTable.userId, userId)))
    .returning({ id: webhookConfigsTable.id });

  if (!deleted) { res.status(404).json({ error: "Config not found" }); return; }
  res.json({ success: true });
});

// POST /api/webhooks/configs/:id/trigger  (manual trigger)
router.post("/configs/:id/trigger", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt((req.params as Record<string, string>)["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [config] = await db
    .select()
    .from(webhookConfigsTable)
    .where(and(eq(webhookConfigsTable.id, id), eq(webhookConfigsTable.userId, userId)))
    .limit(1);

  if (!config) { res.status(404).json({ error: "Config not found" }); return; }

  const payload = req.body as Record<string, unknown>;
  const body = JSON.stringify({ event: "manual.trigger", payload, timestamp: new Date().toISOString() });

  const signature = crypto
    .createHmac("sha256", config.secret)
    .update(body)
    .digest("hex");

  const start = Date.now();
  let status = "success";
  let responseBody: unknown = null;
  let error: string | null = null;

  try {
    const r = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AgencyFlow-Signature": `sha256=${signature}`,
        "X-AgencyFlow-Event": "manual.trigger",
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    const text = await r.text().catch(() => "");
    try { responseBody = JSON.parse(text); } catch { responseBody = text; }
    if (!r.ok) { status = "error"; error = `HTTP ${r.status}`; }
  } catch (err) {
    status = "error";
    error = err instanceof Error ? err.message : "Request failed";
  }

  const durationMs = Date.now() - start;

  await db.insert(workflowExecutionLogsTable).values({
    userId,
    webhookConfigId: config.id,
    direction: "outbound",
    eventOrAction: "manual.trigger",
    status,
    requestBody: JSON.parse(body),
    responseBody: responseBody as any,
    durationMs,
    error,
  }).catch(() => {});

  res.json({ success: status === "success", status, durationMs, error, response: responseBody });
});

// ── Inbound Tokens ────────────────────────────────────────────────────────────

// GET /api/webhooks/tokens
router.get("/tokens", async (req, res) => {
  const userId = req.user!.userId;
  const tokens = await db
    .select()
    .from(inboundWebhookTokensTable)
    .where(eq(inboundWebhookTokensTable.userId, userId))
    .orderBy(desc(inboundWebhookTokensTable.createdAt));
  res.json(tokens.map(formatToken));
});

// POST /api/webhooks/tokens
router.post("/tokens", async (req, res) => {
  const userId = req.user!.userId;
  const { name, description, webhookConfigId } = req.body as {
    name: string;
    description?: string;
    webhookConfigId?: number;
  };

  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const token = crypto.randomBytes(32).toString("hex");

  const [created] = await db
    .insert(inboundWebhookTokensTable)
    .values({ userId, token, name, description: description ?? null, webhookConfigId: webhookConfigId ?? null })
    .returning();

  res.status(201).json(formatToken(created!));
});

// DELETE /api/webhooks/tokens/:id (revoke)
router.delete("/tokens/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt((req.params as Record<string, string>)["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [updated] = await db
    .update(inboundWebhookTokensTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(inboundWebhookTokensTable.id, id), eq(inboundWebhookTokensTable.userId, userId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Token not found" }); return; }
  res.json({ success: true });
});

// POST /api/webhooks/tokens/:id/rotate
router.post("/tokens/:id/rotate", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt((req.params as Record<string, string>)["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [existing] = await db
    .select()
    .from(inboundWebhookTokensTable)
    .where(and(eq(inboundWebhookTokensTable.id, id), eq(inboundWebhookTokensTable.userId, userId)))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Token not found" }); return; }

  // Revoke old token and create a new one
  await db
    .update(inboundWebhookTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(inboundWebhookTokensTable.id, id));

  const newToken = crypto.randomBytes(32).toString("hex");
  const [created] = await db
    .insert(inboundWebhookTokensTable)
    .values({
      userId,
      token: newToken,
      name: existing.name,
      description: existing.description,
      webhookConfigId: existing.webhookConfigId,
    })
    .returning();

  res.json(formatToken(created!));
});

// ── Execution Logs ─────────────────────────────────────────────────────────────

// GET /api/webhooks/logs
router.get("/logs", async (req, res) => {
  const userId = req.user!.userId;
  const { direction, status, dateFrom, dateTo, limit: limitParam, offset: offsetParam } = req.query;

  const conditions = [eq(workflowExecutionLogsTable.userId, userId)];
  if (direction) conditions.push(eq(workflowExecutionLogsTable.direction, String(direction)));
  if (status) conditions.push(eq(workflowExecutionLogsTable.status, String(status)));
  if (dateFrom) conditions.push(gte(workflowExecutionLogsTable.createdAt, new Date(String(dateFrom))));
  if (dateTo) conditions.push(lte(workflowExecutionLogsTable.createdAt, new Date(String(dateTo))));

  const limitVal = Math.min(parseInt(String(limitParam ?? "50")), 200);
  const offsetVal = parseInt(String(offsetParam ?? "0")) || 0;

  const logs = await db
    .select()
    .from(workflowExecutionLogsTable)
    .where(and(...conditions))
    .orderBy(desc(workflowExecutionLogsTable.createdAt))
    .limit(limitVal)
    .offset(offsetVal);

  res.json(logs.map(formatLog));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatConfig(c: typeof webhookConfigsTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    url: c.url,
    secret: c.secret,
    eventTypes: c.eventTypes as string[],
    active: c.active,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function formatToken(t: typeof inboundWebhookTokensTable.$inferSelect) {
  return {
    id: t.id,
    webhookConfigId: t.webhookConfigId,
    token: t.token,
    name: t.name,
    description: t.description,
    revokedAt: t.revokedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

function formatLog(l: typeof workflowExecutionLogsTable.$inferSelect) {
  return {
    id: l.id,
    webhookConfigId: l.webhookConfigId,
    direction: l.direction,
    eventOrAction: l.eventOrAction,
    status: l.status,
    requestBody: l.requestBody,
    responseBody: l.responseBody,
    durationMs: l.durationMs,
    error: l.error,
    createdAt: l.createdAt.toISOString(),
  };
}

export default router;
