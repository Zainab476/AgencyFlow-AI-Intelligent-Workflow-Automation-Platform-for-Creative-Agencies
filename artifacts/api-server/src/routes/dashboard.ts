import { Router } from "express";
import { db, projectsTable, clientsTable } from "@workspace/db";
import { eq, count, sql, sum } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

// GET /api/dashboard/stats
router.get("/stats", async (req, res) => {
  const userId = req.user!.userId;

  const [totalClientsRow] = await db
    .select({ count: count() })
    .from(clientsTable)
    .where(eq(clientsTable.userId, userId));

  const [totalProjectsRow] = await db
    .select({ count: count() })
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId));

  const [activeProjectsRow] = await db
    .select({ count: count() })
    .from(projectsTable)
    .where(
      sql`${projectsTable.userId} = ${userId} AND ${projectsTable.status} = 'active'`,
    );

  const [totalBudgetRow] = await db
    .select({ total: sum(projectsTable.budget) })
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId));

  const projectsByStatus = await db
    .select({
      status: projectsTable.status,
      count: count(),
    })
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId))
    .groupBy(projectsTable.status);

  res.json({
    totalClients: totalClientsRow?.count ?? 0,
    totalProjects: totalProjectsRow?.count ?? 0,
    activeProjects: activeProjectsRow?.count ?? 0,
    totalBudget: Number(totalBudgetRow?.total ?? 0),
    projectsByStatus: projectsByStatus.map((r) => ({
      status: r.status,
      count: r.count,
    })),
  });
});

// GET /api/dashboard/recent-projects
router.get("/recent-projects", async (req, res) => {
  const userId = req.user!.userId;
  const limitParam = parseInt((req.query["limit"] as string) ?? "5");
  const limit = isNaN(limitParam) || limitParam < 1 ? 5 : Math.min(limitParam, 20);

  const rows = await db
    .select({
      project: projectsTable,
      clientName: clientsTable.companyName,
    })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(projectsTable.userId, userId))
    .orderBy(sql`${projectsTable.createdAt} desc`)
    .limit(limit);

  res.json(
    rows.map((r) => ({
      id: r.project.id,
      clientId: r.project.clientId,
      clientName: r.clientName ?? null,
      campaignName: r.project.campaignName,
      budget: r.project.budget !== null ? Number(r.project.budget) : null,
      startDate: r.project.startDate ?? null,
      endDate: r.project.endDate ?? null,
      status: r.project.status,
      createdAt: r.project.createdAt.toISOString(),
    })),
  );
});

export default router;
