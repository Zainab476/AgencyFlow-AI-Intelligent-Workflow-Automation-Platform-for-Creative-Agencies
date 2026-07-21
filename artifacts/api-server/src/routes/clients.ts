import { Router } from "express";
import { db, clientsTable } from "@workspace/db";
import { eq, and, or, ilike } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateClientBody, UpdateClientBody } from "@workspace/api-zod";

const router = Router();

// All client routes require authentication
router.use(requireAuth);

// GET /api/clients
router.get("/", async (req, res) => {
  const userId = req.user!.userId;
  const search = req.query["search"] as string | undefined;

  let clients;
  if (search && search.trim()) {
    const pattern = `%${search.trim()}%`;
    clients = await db
      .select()
      .from(clientsTable)
      .where(
        and(
          eq(clientsTable.userId, userId),
          or(
            ilike(clientsTable.companyName, pattern),
            ilike(clientsTable.contactPerson, pattern),
          ),
        ),
      )
      .orderBy(clientsTable.createdAt);
  } else {
    clients = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.userId, userId))
      .orderBy(clientsTable.createdAt);
  }

  res.json(
    clients.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      contactPerson: c.contactPerson,
      email: c.email,
      phone: c.phone ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
  );
});

// POST /api/clients
router.post("/", async (req, res) => {
  const userId = req.user!.userId;
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { companyName, contactPerson, email, phone } = parsed.data;

  const [client] = await db
    .insert(clientsTable)
    .values({ userId, companyName, contactPerson, email, phone })
    .returning();

  res.status(201).json({
    id: client.id,
    companyName: client.companyName,
    contactPerson: client.contactPerson,
    email: client.email,
    phone: client.phone ?? null,
    createdAt: client.createdAt.toISOString(),
  });
});

// GET /api/clients/:id
router.get("/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid client ID" });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, userId)))
    .limit(1);

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json({
    id: client.id,
    companyName: client.companyName,
    contactPerson: client.contactPerson,
    email: client.email,
    phone: client.phone ?? null,
    createdAt: client.createdAt.toISOString(),
  });
});

// PUT /api/clients/:id
router.put("/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid client ID" });
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const existing = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, userId)))
    .limit(1);

  if (!existing[0]) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const [updated] = await db
    .update(clientsTable)
    .set(parsed.data)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, userId)))
    .returning();

  res.json({
    id: updated.id,
    companyName: updated.companyName,
    contactPerson: updated.contactPerson,
    email: updated.email,
    phone: updated.phone ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

// DELETE /api/clients/:id
router.delete("/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid client ID" });
    return;
  }

  const existing = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, userId)))
    .limit(1);

  if (!existing[0]) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  await db
    .delete(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, userId)));

  res.json({ success: true, message: "Client deleted" });
});

export default router;
