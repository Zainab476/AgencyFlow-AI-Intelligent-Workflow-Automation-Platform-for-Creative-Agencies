import { Router } from "express";
import { db, projectsTable, clientsTable, documentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { generateDocumentContent } from "../lib/ai/generator";
import { exportToPDF } from "../lib/documents/pdf";
import { exportToDOCX } from "../lib/documents/docx";
import { exportToPPTX } from "../lib/documents/pptx";
import type { DocumentType } from "../lib/ai/generator";
import { emitWebhookEvent } from "../lib/webhooks/emitter";

const router = Router();
router.use(requireAuth);

const AGENCY_NAME = "AgencyFlow Creative Studio";

function formatDoc(
  doc: typeof documentsTable.$inferSelect,
  projectName?: string | null,
  clientName?: string | null
) {
  return {
    id: doc.id,
    projectId: doc.projectId,
    projectName: projectName ?? null,
    clientName: clientName ?? null,
    type: doc.type,
    title: doc.title,
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
  };
}

// GET /api/documents
router.get("/", async (req, res) => {
  const userId = req.user!.userId;
  const projectIdParam = req.query["projectId"];
  const projectId = projectIdParam ? parseInt(String(projectIdParam)) : null;

  const rows = await db
    .select({
      doc: documentsTable,
      projectName: projectsTable.campaignName,
      clientName: clientsTable.companyName,
    })
    .from(documentsTable)
    .leftJoin(projectsTable, eq(documentsTable.projectId, projectsTable.id))
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(
      and(
        eq(documentsTable.userId, userId),
        projectId ? eq(documentsTable.projectId, projectId) : undefined
      )
    )
    .orderBy(desc(documentsTable.createdAt));

  res.json(rows.map((r) => formatDoc(r.doc, r.projectName, r.clientName)));
});

// POST /api/documents/generate
router.post("/generate", async (req, res) => {
  const userId = req.user!.userId;
  const { projectId, type } = req.body as { projectId: number; type: DocumentType };

  if (!projectId || !type) {
    res.status(400).json({ error: "projectId and type are required" });
    return;
  }

  const validTypes: DocumentType[] = ["proposal", "contract", "presentation", "invoice"];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: "Invalid document type" });
    return;
  }

  const [row] = await db
    .select({ project: projectsTable, clientName: clientsTable.companyName })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const { title, content } = await generateDocumentContent(type, {
    campaignName: row.project.campaignName,
    clientName: row.clientName ?? "Client",
    status: row.project.status,
    budget: row.project.budget !== null ? Number(row.project.budget) : null,
    startDate: row.project.startDate,
    endDate: row.project.endDate,
    agencyName: AGENCY_NAME,
  });

  const [saved] = await db
    .insert(documentsTable)
    .values({ userId, projectId, type, title, content })
    .returning();

  emitWebhookEvent(userId, "document.generated", {
    documentId: saved!.id,
    projectId,
    type,
    title,
    generatedAt: saved!.createdAt.toISOString(),
  }).catch(() => {});

  res.status(201).json(formatDoc(saved!, row.project.campaignName, row.clientName));
});

// GET /api/documents/:id
router.get("/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid document ID" });
    return;
  }

  const [row] = await db
    .select({
      doc: documentsTable,
      projectName: projectsTable.campaignName,
      clientName: clientsTable.companyName,
    })
    .from(documentsTable)
    .leftJoin(projectsTable, eq(documentsTable.projectId, projectsTable.id))
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, userId)))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json(formatDoc(row.doc, row.projectName, row.clientName));
});

// GET /api/documents/:id/export/:format
router.get("/:id/export/:format", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  const format = req.params["format"] as "pdf" | "docx" | "pptx";

  if (isNaN(id) || !["pdf", "docx", "pptx"].includes(format)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [row] = await db
    .select({ doc: documentsTable })
    .from(documentsTable)
    .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, userId)))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const content = row.doc.content as Record<string, unknown>;
  const type = row.doc.type as DocumentType;
  const slug = row.doc.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  try {
    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    if (format === "pdf") {
      buffer = await exportToPDF(type, content);
      contentType = "application/pdf";
      filename = `${slug}.pdf`;
    } else if (format === "docx") {
      buffer = await exportToDOCX(type, content);
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      filename = `${slug}.docx`;
    } else {
      buffer = await exportToPPTX(type, content);
      contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      filename = `${slug}.pptx`;
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    res.status(500).json({ error: message });
  }
});

// DELETE /api/documents/:id
router.delete("/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid document ID" });
    return;
  }

  const [existing] = await db
    .select({ id: documentsTable.id })
    .from(documentsTable)
    .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, userId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  await db.delete(documentsTable).where(eq(documentsTable.id, id));
  res.json({ success: true });
});

export default router;
