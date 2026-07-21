import { Router } from "express";
import { db, tasksTable, projectsTable, projectMembersTable, clientsTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logActivity, createNotification } from "../lib/activity";
import {
  CreateTaskBody,
  UpdateTaskBody,
  UpdateTaskStatusBody,
} from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

type TaskStatus = "todo" | "in_progress" | "review" | "done";
type TaskPriority = "low" | "medium" | "high" | "urgent";

function fmt(
  t: typeof tasksTable.$inferSelect,
  projectName?: string | null,
  memberName?: string | null,
) {
  return {
    id: t.id,
    projectId: t.projectId,
    projectName: projectName ?? null,
    title: t.title,
    description: t.description ?? null,
    assignedMemberId: t.assignedMemberId ?? null,
    assignedMemberName: memberName ?? null,
    dueDate: t.dueDate ?? null,
    priority: t.priority,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  };
}

// GET /api/tasks
router.get("/", async (req, res) => {
  const userId = req.user!.userId;
  const { projectId, status, priority, assignedMemberId, search } = req.query;

  const rows = await db
    .select({
      task: tasksTable,
      projectName: projectsTable.campaignName,
      memberName: projectMembersTable.name,
    })
    .from(tasksTable)
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .leftJoin(projectMembersTable, eq(tasksTable.assignedMemberId, projectMembersTable.id))
    .where(
      and(
        eq(tasksTable.userId, userId),
        projectId ? eq(tasksTable.projectId, Number(projectId)) : undefined,
        status ? eq(tasksTable.status, status as TaskStatus) : undefined,
        priority ? eq(tasksTable.priority, priority as TaskPriority) : undefined,
        assignedMemberId ? eq(tasksTable.assignedMemberId, Number(assignedMemberId)) : undefined,
        search ? ilike(tasksTable.title, `%${search}%`) : undefined,
      ),
    )
    .orderBy(sql`${tasksTable.createdAt} desc`);

  res.json(rows.map((r) => fmt(r.task, r.projectName, r.memberName)));
});

// POST /api/tasks
router.post("/", async (req, res) => {
  const userId = req.user!.userId;
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

  const { projectId, title, description, assignedMemberId, dueDate, priority, status } = parsed.data;

  // Verify project belongs to user
  const [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId))).limit(1);
  if (!project) { res.status(400).json({ error: "Project not found" }); return; }

  const [task] = await db.insert(tasksTable).values({
    userId,
    projectId,
    title,
    description: description ?? null,
    assignedMemberId: assignedMemberId ?? null,
    dueDate: dueDate ?? null,
    priority: (priority as TaskPriority) ?? "medium",
    status: (status as TaskStatus) ?? "todo",
  }).returning();

  let memberName: string | null = null;
  if (assignedMemberId) {
    const [member] = await db.select().from(projectMembersTable)
      .where(eq(projectMembersTable.id, assignedMemberId)).limit(1);
    memberName = member?.name ?? null;

    await createNotification({
      userId,
      type: "assignment",
      title: "Task Assigned",
      message: `"${title}" has been assigned to ${memberName}`,
      projectId,
      taskId: task!.id,
    });
  }

  await logActivity({
    userId,
    projectId,
    taskId: task!.id,
    action: "task_created",
    description: `Task "${title}" created in ${project.campaignName}`,
  });

  res.status(201).json(fmt(task!, project.campaignName, memberName));
});

// GET /api/tasks/:id
router.get("/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid task ID" }); return; }

  const [row] = await db
    .select({ task: tasksTable, projectName: projectsTable.campaignName, memberName: projectMembersTable.name })
    .from(tasksTable)
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .leftJoin(projectMembersTable, eq(tasksTable.assignedMemberId, projectMembersTable.id))
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(fmt(row.task, row.projectName, row.memberName));
});

// PUT /api/tasks/:id
router.put("/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid task ID" }); return; }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

  const [existing] = await db.select().from(tasksTable)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId))).limit(1);
  if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

  const wasCompleted = existing.status !== "done" && parsed.data.status === "done";

  const [updated] = await db.update(tasksTable)
    .set(parsed.data)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)))
    .returning();

  const [projectRow] = await db.select({ name: projectsTable.campaignName })
    .from(projectsTable).where(eq(projectsTable.id, updated!.projectId)).limit(1);

  let memberName: string | null = null;
  if (updated!.assignedMemberId) {
    const [m] = await db.select().from(projectMembersTable)
      .where(eq(projectMembersTable.id, updated!.assignedMemberId)).limit(1);
    memberName = m?.name ?? null;
  }

  if (wasCompleted) {
    await logActivity({
      userId,
      projectId: updated!.projectId,
      taskId: id,
      action: "task_completed",
      description: `Task "${updated!.title}" completed in ${projectRow?.name ?? ""}`,
    });
    await createNotification({
      userId,
      type: "completion",
      title: "Task Completed",
      message: `"${updated!.title}" has been marked as done`,
      projectId: updated!.projectId,
      taskId: id,
    });
  } else {
    await logActivity({
      userId,
      projectId: updated!.projectId,
      taskId: id,
      action: "task_updated",
      description: `Task "${updated!.title}" updated`,
    });
  }

  res.json(fmt(updated!, projectRow?.name, memberName));
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid task ID" }); return; }

  const [existing] = await db.select().from(tasksTable)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId))).limit(1);
  if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

  await db.delete(tasksTable).where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)));
  res.json({ success: true, message: "Task deleted" });
});

// PATCH /api/tasks/:id/status
router.patch("/:id/status", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid task ID" }); return; }

  const parsed = UpdateTaskStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

  const [existing] = await db.select().from(tasksTable)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId))).limit(1);
  if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

  const wasCompleted = existing.status !== "done" && parsed.data.status === "done";

  const [updated] = await db.update(tasksTable)
    .set({ status: parsed.data.status as TaskStatus })
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)))
    .returning();

  if (wasCompleted) {
    const [projectRow] = await db.select({ name: projectsTable.campaignName })
      .from(projectsTable).where(eq(projectsTable.id, updated!.projectId)).limit(1);

    await logActivity({
      userId, projectId: updated!.projectId, taskId: id,
      action: "task_completed",
      description: `Task "${updated!.title}" completed in ${projectRow?.name ?? ""}`,
    });
    await createNotification({
      userId, type: "completion",
      title: "Task Completed",
      message: `"${updated!.title}" has been marked as done`,
      projectId: updated!.projectId, taskId: id,
    });
  }

  let memberName: string | null = null;
  if (updated!.assignedMemberId) {
    const [m] = await db.select().from(projectMembersTable)
      .where(eq(projectMembersTable.id, updated!.assignedMemberId)).limit(1);
    memberName = m?.name ?? null;
  }

  const [projectRow] = await db.select({ name: projectsTable.campaignName })
    .from(projectsTable).where(eq(projectsTable.id, updated!.projectId)).limit(1);

  res.json(fmt(updated!, projectRow?.name, memberName));
});

export default router;
