import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

/** GET /api/analytics/overview?period=monthly|quarterly|yearly&year=2026 */
router.get("/overview", async (req, res) => {
  const userId = req.user!.userId;
  const period = (req.query["period"] as string) || "monthly";
  const yearParam = parseInt(req.query["year"] as string);
  const year = isNaN(yearParam) ? new Date().getFullYear() : yearParam;
  const currentYear = new Date().getFullYear();

  // ── Period config ──────────────────────────────────────────────────────────
  type PeriodLabel = { num: number; label: string };
  let periodLabels: PeriodLabel[];
  let groupByExpr: string;
  let projectWhereExtra: string;
  let clientWhereExtra: string;

  if (period === "quarterly") {
    periodLabels = [
      { num: 1, label: "Q1" },
      { num: 2, label: "Q2" },
      { num: 3, label: "Q3" },
      { num: 4, label: "Q4" },
    ];
    groupByExpr = "EXTRACT(QUARTER FROM created_at)";
    projectWhereExtra = `AND EXTRACT(YEAR FROM created_at) = ${year}`;
    clientWhereExtra = `AND EXTRACT(YEAR FROM created_at) = ${year}`;
  } else if (period === "yearly") {
    const startYear = currentYear - 5;
    periodLabels = Array.from({ length: 6 }, (_, i) => {
      const y = startYear + i;
      return { num: y, label: String(y) };
    });
    groupByExpr = "EXTRACT(YEAR FROM created_at)";
    projectWhereExtra = `AND EXTRACT(YEAR FROM created_at) >= ${startYear}`;
    clientWhereExtra = `AND EXTRACT(YEAR FROM created_at) >= ${startYear}`;
  } else {
    // monthly (default)
    periodLabels = [
      { num: 1, label: "Jan" },
      { num: 2, label: "Feb" },
      { num: 3, label: "Mar" },
      { num: 4, label: "Apr" },
      { num: 5, label: "May" },
      { num: 6, label: "Jun" },
      { num: 7, label: "Jul" },
      { num: 8, label: "Aug" },
      { num: 9, label: "Sep" },
      { num: 10, label: "Oct" },
      { num: 11, label: "Nov" },
      { num: 12, label: "Dec" },
    ];
    groupByExpr = "EXTRACT(MONTH FROM created_at)";
    projectWhereExtra = `AND EXTRACT(YEAR FROM created_at) = ${year}`;
    clientWhereExtra = `AND EXTRACT(YEAR FROM created_at) = ${year}`;
  }

  // ── Projects: revenue + counts grouped by period ──────────────────────────
  const projectRows = await db.execute(sql.raw(`
    SELECT
      ${groupByExpr} AS period_num,
      COUNT(*)::int                                                AS total_count,
      COUNT(*) FILTER (WHERE status = 'completed')::int           AS completed_count,
      COALESCE(SUM(budget::numeric), 0)                           AS revenue
    FROM projects
    WHERE user_id = ${userId}
      ${projectWhereExtra}
    GROUP BY period_num
    ORDER BY period_num
  `));

  const projectMap = new Map<
    number,
    { total: number; completed: number; revenue: number }
  >();
  for (const row of projectRows.rows as Record<string, unknown>[]) {
    projectMap.set(Number(row["period_num"]), {
      total: Number(row["total_count"]),
      completed: Number(row["completed_count"]),
      revenue: Number(row["revenue"]),
    });
  }

  const revenueByPeriod = periodLabels.map(({ num, label }) => ({
    label,
    revenue: projectMap.get(num)?.revenue ?? 0,
  }));

  const projectsByPeriod = periodLabels.map(({ num, label }) => ({
    label,
    created: projectMap.get(num)?.total ?? 0,
    completed: projectMap.get(num)?.completed ?? 0,
  }));

  const completionRateByPeriod = periodLabels.map(({ num, label }) => {
    const d = projectMap.get(num);
    const rate =
      d && d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
    return { label, rate };
  });

  // ── Clients grouped by period ─────────────────────────────────────────────
  const clientRows = await db.execute(sql.raw(`
    SELECT
      ${groupByExpr} AS period_num,
      COUNT(*)::int AS count
    FROM clients
    WHERE user_id = ${userId}
      ${clientWhereExtra}
    GROUP BY period_num
    ORDER BY period_num
  `));

  const clientMap = new Map<number, number>();
  for (const row of clientRows.rows as Record<string, unknown>[]) {
    clientMap.set(Number(row["period_num"]), Number(row["count"]));
  }

  const clientsByPeriod = periodLabels.map(({ num, label }) => ({
    label,
    clients: clientMap.get(num) ?? 0,
  }));

  // ── Task status breakdown (all-time for user) ─────────────────────────────
  const taskRows = await db.execute(sql.raw(`
    SELECT status, COUNT(*)::int AS count
    FROM tasks
    WHERE user_id = ${userId}
    GROUP BY status
    ORDER BY status
  `));

  const taskStatusBreakdown = (taskRows.rows as Record<string, unknown>[]).map(
    (r) => ({
      status: r["status"] as string,
      count: Number(r["count"]),
    }),
  );

  // ── Campaign type breakdown ────────────────────────────────────────────────
  const campaignRows = await db.execute(sql.raw(`
    SELECT
      COALESCE(campaign_type, 'other') AS type,
      COUNT(*)::int                    AS count
    FROM projects
    WHERE user_id = ${userId}
    GROUP BY type
    ORDER BY count DESC
  `));

  const campaignTypeBreakdown = (
    campaignRows.rows as Record<string, unknown>[]
  ).map((r) => ({
    type: r["type"] as string,
    count: Number(r["count"]),
  }));

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalRevenue = revenueByPeriod.reduce((s, r) => s + r.revenue, 0);
  const totalProjectsInPeriod = projectsByPeriod.reduce(
    (s, r) => s + r.created,
    0,
  );
  const totalCompletedInPeriod = projectsByPeriod.reduce(
    (s, r) => s + r.completed,
    0,
  );
  const avgCompletionRate =
    totalProjectsInPeriod > 0
      ? Math.round((totalCompletedInPeriod / totalProjectsInPeriod) * 100)
      : 0;
  const totalClientsInPeriod = clientsByPeriod.reduce(
    (s, r) => s + r.clients,
    0,
  );

  res.json({
    revenueByPeriod,
    projectsByPeriod,
    completionRateByPeriod,
    taskStatusBreakdown,
    clientsByPeriod,
    campaignTypeBreakdown,
    summary: {
      totalRevenue,
      totalProjects: totalProjectsInPeriod,
      avgCompletionRate,
      totalClients: totalClientsInPeriod,
    },
  });
});

export default router;
