import { db, activityLogsTable, projectsTable, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type Action = typeof activityLogsTable.$inferInsert["action"];

export async function logActivity(params: {
  userId: number;
  projectId?: number | null;
  taskId?: number | null;
  action: Action;
  description: string;
}) {
  try {
    await db.insert(activityLogsTable).values({
      userId: params.userId,
      projectId: params.projectId ?? null,
      taskId: params.taskId ?? null,
      action: params.action,
      description: params.description,
    });
  } catch {
    // Non-critical — don't let activity logging failures break API calls
  }
}

export async function createNotification(params: {
  userId: number;
  type: "deadline" | "assignment" | "completion";
  title: string;
  message: string;
  projectId?: number | null;
  taskId?: number | null;
}) {
  const { notificationsTable } = await import("@workspace/db");
  try {
    await db.insert(notificationsTable).values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      projectId: params.projectId ?? null,
      taskId: params.taskId ?? null,
      read: false,
    });
  } catch {
    // Non-critical
  }
}
