import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, fileUploadsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logActivity } from "../lib/activity";

const router = Router();
router.use(requireAuth);

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const ALLOWED_MIME = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
];

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  },
});

function fmt(f: typeof fileUploadsTable.$inferSelect) {
  return {
    id: f.id,
    projectId: f.projectId,
    taskId: f.taskId ?? null,
    filename: f.filename,
    originalName: f.originalName,
    mimeType: f.mimeType,
    size: f.size,
    url: f.url,
    createdAt: f.createdAt.toISOString(),
  };
}

// GET /api/uploads
router.get("/", async (req, res) => {
  const userId = req.user!.userId;
  const { projectId, taskId } = req.query;

  const conditions = [eq(fileUploadsTable.userId, userId)];
  if (projectId) conditions.push(eq(fileUploadsTable.projectId, Number(projectId)));
  if (taskId) conditions.push(eq(fileUploadsTable.taskId, Number(taskId)));

  const files = await db
    .select()
    .from(fileUploadsTable)
    .where(and(...conditions))
    .orderBy(fileUploadsTable.createdAt);

  res.json(files.reverse().map(fmt));
});

// POST /api/uploads (multipart/form-data)
router.post("/", upload.single("file"), async (req, res) => {
  const userId = req.user!.userId;
  const projectId = parseInt((req.query["projectId"] as string) ?? "");
  if (isNaN(projectId)) { res.status(400).json({ error: "projectId is required" }); return; }

  const taskIdParam = req.query["taskId"];
  const taskId = taskIdParam ? parseInt(taskIdParam as string) : null;

  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  // Verify project belongs to user
  const [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId))).limit(1);
  if (!project) {
    fs.unlinkSync(req.file.path);
    res.status(400).json({ error: "Project not found" });
    return;
  }

  const url = `/api/uploads/files/${req.file.filename}`;

  const [record] = await db.insert(fileUploadsTable).values({
    userId,
    projectId,
    taskId: taskId && !isNaN(taskId) ? taskId : null,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url,
  }).returning();

  await logActivity({
    userId,
    projectId,
    action: "file_uploaded",
    description: `"${req.file.originalname}" uploaded to ${project.campaignName}`,
  });

  res.status(201).json(fmt(record!));
});

// DELETE /api/uploads/:id
router.delete("/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid upload ID" }); return; }

  const [existing] = await db.select().from(fileUploadsTable)
    .where(and(eq(fileUploadsTable.id, id), eq(fileUploadsTable.userId, userId))).limit(1);
  if (!existing) { res.status(404).json({ error: "File not found" }); return; }

  // Remove physical file
  const filePath = path.join(UPLOADS_DIR, existing.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await db.delete(fileUploadsTable).where(eq(fileUploadsTable.id, id));
  res.json({ success: true, message: "File deleted" });
});

export { UPLOADS_DIR };
export default router;
