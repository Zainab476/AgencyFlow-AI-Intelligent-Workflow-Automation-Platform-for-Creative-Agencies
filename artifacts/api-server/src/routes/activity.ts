import { Router } from "express";
import { db, activityLogsTable, projectsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// GET /api/activity
router.get("/", async (req, res) => {
  const userId = req.user!.userId;
  const projectIdParam = req.query["projectId"];
  const limitParam = parseInt((req.query["limit"] as string) ?? "20");
  const limit = isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);

  const rows = await db
    .select({
      log: activityLogsTable,
      projectName: projectsTable.campaignName,
    })
    .from(activityLogsTable)
    .leftJoin(projectsTable, eq(activityLogsTable.projectId, projectsTable.id))
    .where(
      and(
        eq(activityLogsTable.userId, userId),
        projectIdParam ? eq(activityLogsTable.projectId, Number(projectIdParam)) : undefined,
      ),
    )
    .orderBy(sql`${activityLogsTable.createdAt} desc`)
    .limit(limit);

  res.json(
    rows.map((r) => ({
      id: r.log.id,
      action: r.log.action,
      description: r.log.description,
      projectId: r.log.projectId ?? null,
      projectName: r.projectName ?? null,
      taskId: r.log.taskId ?? null,
      createdAt: r.log.createdAt.toISOString(),
    })),
  );
});

export default router;
