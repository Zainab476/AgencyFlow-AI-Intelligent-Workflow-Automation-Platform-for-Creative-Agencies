import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

function fmt(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    projectId: n.projectId ?? null,
    taskId: n.taskId ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

// GET /api/notifications
router.get("/", async (req, res) => {
  const userId = req.user!.userId;
  const unreadOnly = req.query["unreadOnly"] === "true";

  const conditions = [eq(notificationsTable.userId, userId)];
  if (unreadOnly) conditions.push(eq(notificationsTable.read, false));

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(and(...conditions))
    .orderBy(notificationsTable.createdAt);

  res.json(notifications.reverse().map(fmt));
});

// PATCH /api/notifications/read-all
router.patch("/read-all", async (req, res) => {
  const userId = req.user!.userId;
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.userId, userId));
  res.json({ success: true, message: "All notifications marked as read" });
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid notification ID" }); return; }

  const [existing] = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Notification not found" }); return; }

  const [updated] = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.id, id))
    .returning();

  res.json(fmt(updated!));
});

export default router;
