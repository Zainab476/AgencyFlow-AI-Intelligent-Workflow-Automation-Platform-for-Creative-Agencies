import { Router } from "express";
import { db, projectsTable, clientsTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateProjectBody, UpdateProjectBody } from "@workspace/api-zod";
import { logActivity } from "../lib/activity";
import { emitWebhookEvent } from "../lib/webhooks/emitter";

const router = Router();

router.use(requireAuth);

function formatProject(p: typeof projectsTable.$inferSelect, clientName?: string | null) {
  return {
    id: p.id,
    clientId: p.clientId,
    clientName: clientName ?? null,
    campaignName: p.campaignName,
    budget: p.budget !== null ? Number(p.budget) : null,
    startDate: p.startDate ?? null,
    endDate: p.endDate ?? null,
    status: p.status,
    campaignType: p.campaignType ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

// GET /api/projects
router.get("/", async (req, res) => {
  const userId = req.user!.userId;
  const { clientId, status, search } = req.query;

  const rows = await db
    .select({
      project: projectsTable,
      clientName: clientsTable.companyName,
    })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(
      and(
        eq(projectsTable.userId, userId),
        clientId ? eq(projectsTable.clientId, Number(clientId)) : undefined,
        status ? eq(projectsTable.status, status as "planning" | "active" | "on_hold" | "completed" | "cancelled") : undefined,
        search ? ilike(projectsTable.campaignName, `%${search}%`) : undefined,
      ),
    )
    .orderBy(sql`${projectsTable.createdAt} desc`);

  res.json(rows.map((r) => formatProject(r.project, r.clientName)));
});

// POST /api/projects
router.post("/", async (req, res) => {
  const userId = req.user!.userId;
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { clientId, campaignName, budget, startDate, endDate, status, campaignType } = parsed.data;

  // Verify client belongs to user
  const [client] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.userId, userId)))
    .limit(1);

  if (!client) {
    res.status(400).json({ error: "Client not found" });
    return;
  }

  const [project] = await db
    .insert(projectsTable)
    .values({
      userId,
      clientId,
      campaignName,
      budget: budget !== undefined ? String(budget) : null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      status: status ?? "planning",
      campaignType: campaignType ?? null,
    })
    .returning();

  await logActivity({
    userId,
    projectId: project!.id,
    action: "project_created",
    description: `Campaign "${campaignName}" created`,
  });

  // Fire outbound webhook (non-blocking)
  emitWebhookEvent(userId, "project.created", {
    projectId: project!.id,
    campaignName,
    clientId,
    status: project!.status,
    createdAt: project!.createdAt.toISOString(),
  }).catch(() => {});

  res.status(201).json(formatProject(project!, client.companyName));
});

// GET /api/projects/:id
router.get("/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const [row] = await db
    .select({
      project: projectsTable,
      clientName: clientsTable.companyName,
    })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, userId)))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(formatProject(row.project, row.clientName));
});

// PUT /api/projects/:id
router.put("/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [existing] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, userId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const { budget, ...rest } = parsed.data;
  const updateData: Partial<typeof projectsTable.$inferInsert> = { ...rest };
  if (budget !== undefined) {
    updateData.budget = String(budget);
  }

  const [updated] = await db
    .update(projectsTable)
    .set(updateData)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, userId)))
    .returning();

  const [clientRow] = await db
    .select({ companyName: clientsTable.companyName })
    .from(clientsTable)
    .where(eq(clientsTable.id, updated.clientId))
    .limit(1);

  await logActivity({
    userId,
    projectId: id,
    action: "project_updated",
    description: `Campaign "${updated!.campaignName}" updated`,
  });

  emitWebhookEvent(userId, "project.updated", {
    projectId: id,
    campaignName: updated!.campaignName,
    status: updated!.status,
    updatedAt: new Date().toISOString(),
  }).catch(() => {});

  res.json(formatProject(updated!, clientRow?.companyName));
});

// DELETE /api/projects/:id
router.delete("/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const [existing] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, userId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db
    .delete(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, userId)));

  res.json({ success: true, message: "Project deleted" });
});

export default router;
