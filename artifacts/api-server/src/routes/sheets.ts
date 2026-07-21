import { Router } from "express";
import {
  db,
  sheetsConnectionsTable,
  syncHistoryTable,
  sheetsConnectionsTable as sc,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { extractSpreadsheetId, getSpreadsheetMetadata, getSheetValues, getSheetHeaders } from "../lib/sheets/client";
import { runSync, applyResolutions, TARGET_FIELDS } from "../lib/sheets/sync";

const router = Router();
router.use(requireAuth);

// GET /api/sheets/connections
router.get("/connections", async (req, res) => {
  const userId = req.user!.userId;
  const connections = await db
    .select()
    .from(sheetsConnectionsTable)
    .where(eq(sheetsConnectionsTable.userId, userId))
    .orderBy(desc(sheetsConnectionsTable.createdAt));
  res.json(connections);
});

// POST /api/sheets/connections
router.post("/connections", async (req, res) => {
  const userId = req.user!.userId;
  const { urlOrId, tabName = "Sheet1", columnMapping = {} } = req.body as {
    urlOrId: string;
    tabName?: string;
    columnMapping?: Record<string, string>;
  };

  if (!urlOrId) {
    res.status(400).json({ error: "urlOrId is required" });
    return;
  }

  let spreadsheetId: string;
  try {
    spreadsheetId = extractSpreadsheetId(urlOrId);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid spreadsheet URL or ID" });
    return;
  }

  // Fetch metadata to verify access and get title
  let spreadsheetName = "Untitled Spreadsheet";
  try {
    const meta = await getSpreadsheetMetadata(spreadsheetId);
    spreadsheetName = meta.title;
  } catch (err) {
    res.status(400).json({ error: `Cannot access spreadsheet: ${err instanceof Error ? err.message : "Unknown error"}` });
    return;
  }

  const [connection] = await db
    .insert(sheetsConnectionsTable)
    .values({ userId, spreadsheetId, spreadsheetName, tabName, columnMapping })
    .returning();

  res.status(201).json(connection);
});

// DELETE /api/sheets/connections/:id
router.delete("/connections/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt((req.params as Record<string, string>)["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [deleted] = await db
    .delete(sheetsConnectionsTable)
    .where(and(eq(sheetsConnectionsTable.id, id), eq(sheetsConnectionsTable.userId, userId)))
    .returning({ id: sheetsConnectionsTable.id });

  if (!deleted) { res.status(404).json({ error: "Connection not found" }); return; }
  res.json({ success: true });
});

// GET /api/sheets/connections/:id/headers – fetch sheet headers for column mapping
router.get("/connections/:id/headers", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt((req.params as Record<string, string>)["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [connection] = await db
    .select()
    .from(sheetsConnectionsTable)
    .where(and(eq(sheetsConnectionsTable.id, id), eq(sheetsConnectionsTable.userId, userId)))
    .limit(1);

  if (!connection) { res.status(404).json({ error: "Connection not found" }); return; }

  try {
    const headers = await getSheetHeaders(connection.spreadsheetId, connection.tabName);
    res.json({ headers, targetFields: TARGET_FIELDS });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to fetch headers" });
  }
});

// GET /api/sheets/connections/:id/preview – first 10 data rows
router.get("/connections/:id/preview", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt((req.params as Record<string, string>)["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [connection] = await db
    .select()
    .from(sheetsConnectionsTable)
    .where(and(eq(sheetsConnectionsTable.id, id), eq(sheetsConnectionsTable.userId, userId)))
    .limit(1);

  if (!connection) { res.status(404).json({ error: "Connection not found" }); return; }

  try {
    const data = await getSheetValues(connection.spreadsheetId, connection.tabName, 12);
    const headers = data.values[0] ?? [];
    const rows = data.values.slice(1, 11); // up to 10 data rows
    res.json({ headers, rows, columnMapping: connection.columnMapping });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to fetch preview" });
  }
});

// PATCH /api/sheets/connections/:id – update column mapping
router.patch("/connections/:id", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt((req.params as Record<string, string>)["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { columnMapping, tabName } = req.body as { columnMapping?: Record<string, string>; tabName?: string };

  const updates: Partial<typeof sheetsConnectionsTable.$inferInsert> = {};
  if (columnMapping) updates.columnMapping = columnMapping;
  if (tabName) updates.tabName = tabName;

  const [updated] = await db
    .update(sheetsConnectionsTable)
    .set(updates)
    .where(and(eq(sheetsConnectionsTable.id, id), eq(sheetsConnectionsTable.userId, userId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Connection not found" }); return; }
  res.json(updated);
});

// POST /api/sheets/connections/:id/sync
router.post("/connections/:id/sync", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt((req.params as Record<string, string>)["id"] ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  try {
    const result = await runSync(userId, id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Sync failed" });
  }
});

// POST /api/sheets/history/:historyId/confirm – resolve conflicts
router.post("/history/:historyId/confirm", async (req, res) => {
  const userId = req.user!.userId;
  const historyId = parseInt((req.params as Record<string, string>)["historyId"] ?? "");
  if (isNaN(historyId)) { res.status(400).json({ error: "Invalid history ID" }); return; }

  const { resolutions } = req.body as {
    resolutions: Array<{ projectId: number; clientId?: number; field: string; accept: boolean }>;
  };

  if (!Array.isArray(resolutions)) {
    res.status(400).json({ error: "resolutions array is required" });
    return;
  }

  try {
    const summary = await applyResolutions(userId, historyId, resolutions);
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to apply resolutions" });
  }
});

// GET /api/sheets/history
router.get("/history", async (req, res) => {
  const userId = req.user!.userId;
  const history = await db
    .select({
      id: syncHistoryTable.id,
      connectionId: syncHistoryTable.connectionId,
      status: syncHistoryTable.status,
      summary: syncHistoryTable.summary,
      rowsProcessed: syncHistoryTable.rowsProcessed,
      errors: syncHistoryTable.errors,
      pendingConflicts: syncHistoryTable.pendingConflicts,
      createdAt: syncHistoryTable.createdAt,
      spreadsheetName: sheetsConnectionsTable.spreadsheetName,
    })
    .from(syncHistoryTable)
    .leftJoin(sheetsConnectionsTable, eq(syncHistoryTable.connectionId, sheetsConnectionsTable.id))
    .where(eq(syncHistoryTable.userId, userId))
    .orderBy(desc(syncHistoryTable.createdAt))
    .limit(50);

  res.json(history);
});

// GET /api/sheets/target-fields
router.get("/target-fields", async (_req, res) => {
  res.json(TARGET_FIELDS);
});

export default router;
