/**
 * Seeds team members, tasks, notifications, and activity logs for the demo user.
 * Safe to re-run — skips if data already exists.
 */
import {
  db,
  usersTable,
  projectsTable,
  projectMembersTable,
  tasksTable,
  notificationsTable,
  activityLogsTable,
} from "@workspace/db";
import { eq, count } from "drizzle-orm";

async function main() {
  console.log("Seeding extended data...");

  // Find the demo user
  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.email, "demo@agencyflow.ai")).limit(1);

  if (!user) {
    console.error("Demo user not found — run `pnpm seed` first.");
    process.exit(1);
  }

  const projects = await db.select().from(projectsTable)
    .where(eq(projectsTable.userId, user.id));

  if (projects.length === 0) {
    console.error("No projects found — run `pnpm seed` first.");
    process.exit(1);
  }

  // Check if already seeded
  const [{ value: memberCount }] = await db.select({ value: count() }).from(projectMembersTable);
  if (Number(memberCount) > 0) {
    console.log("Extended seed data already exists, skipping.");
    process.exit(0);
  }

  // Seed team members (2–3 per project)
  const memberSeeds = [
    { name: "Sarah Chen", email: "sarah@agencyflow.ai", role: "project_manager" as const },
    { name: "Marcus Webb", email: "marcus@agencyflow.ai", role: "designer" as const },
    { name: "Priya Nair", email: "priya@agencyflow.ai", role: "copywriter" as const },
    { name: "James Okafor", email: "james@agencyflow.ai", role: "marketing_specialist" as const },
  ];

  const allMembers: { memberId: number; projectId: number; name: string }[] = [];

  for (const project of projects) {
    const seeds = memberSeeds.slice(0, Math.floor(Math.random() * 2) + 2);
    for (const seed of seeds) {
      const [m] = await db.insert(projectMembersTable).values({
        projectId: project.id,
        userId: user.id,
        ...seed,
      }).returning();
      allMembers.push({ memberId: m!.id, projectId: project.id, name: seed.name });
    }
  }

  console.log(`Created ${allMembers.length} team members.`);

  // Seed tasks (4–6 per project)
  const taskTemplates = [
    { title: "Initial concept exploration", priority: "medium" as const, status: "done" as const },
    { title: "Competitor landscape analysis", priority: "low" as const, status: "done" as const },
    { title: "Brand brief review", priority: "high" as const, status: "in_progress" as const },
    { title: "Creative direction deck", priority: "high" as const, status: "in_progress" as const },
    { title: "Copy framework draft", priority: "medium" as const, status: "todo" as const },
    { title: "Performance metrics setup", priority: "urgent" as const, status: "review" as const },
    { title: "Social media asset pack", priority: "high" as const, status: "todo" as const },
    { title: "Client presentation prep", priority: "urgent" as const, status: "todo" as const },
  ];

  const today = new Date();
  const addDays = (d: number) => new Date(today.getTime() + d * 86400000).toISOString().split("T")[0]!;

  const dueDates = [addDays(-3), addDays(-1), addDays(2), addDays(5), addDays(9), addDays(14), addDays(21), addDays(28)];

  const createdTasks: { taskId: number; projectId: number; title: string; status: string }[] = [];

  for (const project of projects) {
    const projectMembers = allMembers.filter((m) => m.projectId === project.id);
    const tasksToCreate = taskTemplates.slice(0, 4 + Math.floor(Math.random() * 3));

    for (let i = 0; i < tasksToCreate.length; i++) {
      const tpl = tasksToCreate[i]!;
      const member = projectMembers[i % projectMembers.length];
      const [task] = await db.insert(tasksTable).values({
        projectId: project.id,
        userId: user.id,
        title: tpl.title,
        description: `Detailed work on ${tpl.title.toLowerCase()} for the ${project.campaignName} campaign.`,
        assignedMemberId: member?.memberId ?? null,
        dueDate: dueDates[i % dueDates.length] ?? null,
        priority: tpl.priority,
        status: tpl.status,
      }).returning();
      createdTasks.push({ taskId: task!.id, projectId: project.id, title: tpl.title, status: tpl.status });
    }
  }

  console.log(`Created ${createdTasks.length} tasks.`);

  // Seed notifications
  const notifData = [
    {
      type: "deadline" as const,
      title: "Task Due Tomorrow",
      message: "Brand brief review is due tomorrow — make sure it's on track.",
      projectId: projects[0]?.id ?? null,
    },
    {
      type: "assignment" as const,
      title: "Task Assigned to You",
      message: "Creative direction deck has been assigned to Marcus Webb.",
      projectId: projects[0]?.id ?? null,
    },
    {
      type: "completion" as const,
      title: "Task Completed",
      message: "Initial concept exploration has been marked as done.",
      projectId: projects[1]?.id ?? null,
    },
    {
      type: "deadline" as const,
      title: "Upcoming Deadline",
      message: "Performance metrics setup is due for review in 2 days.",
      projectId: projects[2]?.id ?? null,
    },
    {
      type: "completion" as const,
      title: "Task Completed",
      message: "Competitor landscape analysis has been marked as done.",
      projectId: projects[1]?.id ?? null,
    },
  ];

  for (const n of notifData) {
    await db.insert(notificationsTable).values({
      userId: user.id,
      ...n,
      taskId: null,
      read: false,
    });
  }

  console.log("Created 5 notifications.");

  // Seed activity log
  const activityData = [
    { action: "project_created" as const, description: `Campaign "${projects[0]?.campaignName}" created`, projectId: projects[0]?.id ?? null },
    { action: "member_added" as const, description: "Sarah Chen added as project manager", projectId: projects[0]?.id ?? null },
    { action: "task_created" as const, description: "Task \"Initial concept exploration\" created", projectId: projects[0]?.id ?? null },
    { action: "task_completed" as const, description: "Task \"Competitor landscape analysis\" completed", projectId: projects[1]?.id ?? null },
    { action: "project_updated" as const, description: `Campaign "${projects[1]?.campaignName}" status updated to active`, projectId: projects[1]?.id ?? null },
    { action: "member_added" as const, description: "Marcus Webb added as designer", projectId: projects[1]?.id ?? null },
    { action: "task_created" as const, description: "Task \"Client presentation prep\" created", projectId: projects[2]?.id ?? null },
    { action: "task_completed" as const, description: "Task \"Initial concept exploration\" completed", projectId: projects[0]?.id ?? null },
  ];

  for (const a of activityData) {
    await db.insert(activityLogsTable).values({
      userId: user.id,
      taskId: null,
      ...a,
    });
  }

  console.log("Created 8 activity entries.");
  console.log("Extended seed complete!");
}

main().catch(console.error).finally(() => process.exit(0));
