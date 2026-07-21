import { Router } from "express";
import { db, projectMembersTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logActivity } from "../lib/activity";
import {
  AddProjectMemberBody,
  UpdateProjectMemberBody,
} from "@workspace/api-zod";

const router = Router({ mergeParams: true });

router.use(requireAuth);

function fmt(m: typeof projectMembersTable.$inferSelect) {
  return {
    id: m.id,
    projectId: m.projectId,
    name: m.name,
    email: m.email,
    role: m.role,
    createdAt: m.createdAt.toISOString(),
  };
}

// GET /api/projects/:id/members
router.get("/", async (req, res) => {
  const userId = req.user!.userId;
  const p = req.params as Record<string, string>;
  const projectId = parseInt(p["id"] ?? "");
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project ID" }); return; }

  const [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId))).limit(1);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const members = await db.select().from(projectMembersTable)
    .where(eq(projectMembersTable.projectId, projectId))
    .orderBy(projectMembersTable.createdAt);

  res.json(members.map(fmt));
});

// POST /api/projects/:id/members
router.post("/", async (req, res) => {
  const userId = req.user!.userId;
  const p = req.params as Record<string, string>;
  const projectId = parseInt(p["id"] ?? "");
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project ID" }); return; }

  const parsed = AddProjectMemberBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

  const [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId))).limit(1);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [member] = await db.insert(projectMembersTable)
    .values({ ...parsed.data, projectId, userId })
    .returning();

  await logActivity({
    userId,
    projectId,
    action: "member_added",
    description: `${parsed.data.name} added as ${parsed.data.role.replace(/_/g, " ")} to ${project.campaignName}`,
  });

  res.status(201).json(fmt(member!));
});

// PUT /api/projects/:id/members/:memberId
router.put("/:memberId", async (req, res) => {
  const userId = req.user!.userId;
  const p = req.params as Record<string, string>;
  const projectId = parseInt(p["id"] ?? "");
  const memberId = parseInt(p["memberId"] ?? "");
  if (isNaN(projectId) || isNaN(memberId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateProjectMemberBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

  const [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId))).limit(1);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [existing] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.id, memberId), eq(projectMembersTable.projectId, projectId))).limit(1);
  if (!existing) { res.status(404).json({ error: "Member not found" }); return; }

  const [updated] = await db.update(projectMembersTable)
    .set(parsed.data)
    .where(eq(projectMembersTable.id, memberId))
    .returning();

  res.json(fmt(updated!));
});

// DELETE /api/projects/:id/members/:memberId
router.delete("/:memberId", async (req, res) => {
  const userId = req.user!.userId;
  const p = req.params as Record<string, string>;
  const projectId = parseInt(p["id"] ?? "");
  const memberId = parseInt(p["memberId"] ?? "");
  if (isNaN(projectId) || isNaN(memberId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId))).limit(1);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [existing] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.id, memberId), eq(projectMembersTable.projectId, projectId))).limit(1);
  if (!existing) { res.status(404).json({ error: "Member not found" }); return; }

  await db.delete(projectMembersTable).where(eq(projectMembersTable.id, memberId));

  await logActivity({
    userId,
    projectId,
    action: "member_removed",
    description: `${existing.name} removed from ${project.campaignName}`,
  });

  res.json({ success: true, message: "Member removed" });
});

export default router;
