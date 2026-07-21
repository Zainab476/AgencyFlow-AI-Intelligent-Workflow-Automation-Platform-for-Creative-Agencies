import { Router } from "express";
import { db, projectsTable, clientsTable, tasksTable, projectMembersTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { analyzeProject } from "../lib/ai/analyzer";
import { buildChatSystemPrompt } from "../lib/ai/prompts/chat";
import { ai, FLASH_MODEL } from "../lib/ai/client";

const router = Router();
router.use(requireAuth);

// POST /api/ai/analyze/:projectId
router.post("/analyze/:projectId", async (req, res) => {
  const userId = req.user!.userId;
  const projectId = parseInt(req.params["projectId"] ?? "");
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const [row] = await db
    .select({ project: projectsTable, clientName: clientsTable.companyName })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

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

  res.json(analysis);
});

// POST /api/ai/chat  (SSE streaming)
router.post("/chat", async (req, res) => {
  const userId = req.user!.userId;
  const { projectId, messages } = req.body as {
    projectId: number;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!projectId || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "projectId and messages are required" });
    return;
  }

  const [row] = await db
    .select({ project: projectsTable, clientName: clientsTable.companyName })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const systemPrompt = buildChatSystemPrompt({
    campaignName: row.project.campaignName,
    clientName: row.clientName ?? null,
    status: row.project.status,
    budget: row.project.budget !== null ? Number(row.project.budget) : null,
    startDate: row.project.startDate,
    endDate: row.project.endDate,
  });

  // Build contents: system message first, then history
  const contents = [
    { role: "user" as const, parts: [{ text: systemPrompt }] },
    { role: "model" as const, parts: [{ text: "Understood. I'm your AI Project Assistant for this campaign. How can I help you?" }] },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const stream = await ai.models.generateContentStream({
      model: FLASH_MODEL,
      contents,
      config: { maxOutputTokens: 8192 },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI error";
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
});

export default router;
