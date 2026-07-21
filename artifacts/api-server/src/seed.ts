import bcrypt from "bcryptjs";
import { db, usersTable, clientsTable, projectsTable } from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 10);

  const [user] = await db
    .insert(usersTable)
    .values({ name: "Alex Morgan", email: "demo@agencyflow.ai", passwordHash })
    .onConflictDoNothing()
    .returning();

  if (!user) {
    console.log("User already exists, skipping.");
    process.exit(0);
  }

  console.log("Created user:", user.email);

  const clients = await db
    .insert(clientsTable)
    .values([
      {
        userId: user.id,
        companyName: "Bright Horizon Media",
        contactPerson: "Jessica Lane",
        email: "jessica@brighthorizon.com",
        phone: "+1 (555) 201-4823",
      },
      {
        userId: user.id,
        companyName: "NovaTech Solutions",
        contactPerson: "Marcus Reid",
        email: "m.reid@novatech.io",
        phone: "+1 (555) 348-9012",
      },
      {
        userId: user.id,
        companyName: "Crestwood Brands",
        contactPerson: "Sophia Chen",
        email: "sophia@crestwoodbrands.com",
        phone: "+1 (555) 772-3344",
      },
      {
        userId: user.id,
        companyName: "Vertex Creative Co.",
        contactPerson: "Daniel Park",
        email: "d.park@vertexcreative.com",
        phone: null,
      },
    ])
    .returning();

  console.log(`Created ${clients.length} clients`);
  const [c1, c2, c3, c4] = clients;

  const projects = await db
    .insert(projectsTable)
    .values([
      {
        userId: user.id,
        clientId: c1!.id,
        campaignName: "Spring Rebrand 2025",
        budget: "48000",
        startDate: "2025-03-01",
        endDate: "2025-06-30",
        status: "completed" as const,
      },
      {
        userId: user.id,
        clientId: c2!.id,
        campaignName: "SaaS Launch Campaign",
        budget: "125000",
        startDate: "2025-07-01",
        endDate: "2025-12-31",
        status: "active" as const,
      },
      {
        userId: user.id,
        clientId: c3!.id,
        campaignName: "Holiday Gifting Push",
        budget: "62500",
        startDate: "2025-10-01",
        endDate: "2025-12-15",
        status: "planning" as const,
      },
      {
        userId: user.id,
        clientId: c1!.id,
        campaignName: "Social Media Overhaul",
        budget: "33000",
        startDate: "2025-08-15",
        endDate: "2025-10-31",
        status: "active" as const,
      },
      {
        userId: user.id,
        clientId: c4!.id,
        campaignName: "Q4 Brand Awareness",
        budget: "87500",
        startDate: "2025-09-01",
        endDate: "2025-11-30",
        status: "on_hold" as const,
      },
      {
        userId: user.id,
        clientId: c2!.id,
        campaignName: "Product Demo Video Series",
        budget: "41000",
        startDate: "2025-06-01",
        endDate: "2025-08-31",
        status: "completed" as const,
      },
    ])
    .returning();

  console.log(`Created ${projects.length} projects`);
  console.log("\nSeed complete! Login: demo@agencyflow.ai / password123");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
