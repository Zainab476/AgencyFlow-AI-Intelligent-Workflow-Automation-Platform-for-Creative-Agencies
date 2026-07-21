import { db, projectsTable, clientsTable, sheetsConnectionsTable, syncHistoryTable, projectSyncTrackingTable, clientSyncTrackingTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { getSheetValues } from "./client";

export const TARGET_FIELDS: Record<string, { label: string; entity: "project" | "client" }> = {
  campaignName:        { label: "Campaign Name",   entity: "project" },
  budget:              { label: "Budget",           entity: "project" },
  startDate:           { label: "Start Date",       entity: "project" },
  endDate:             { label: "End Date",         entity: "project" },
  status:              { label: "Status",           entity: "project" },
  clientCompanyName:   { label: "Client Company",  entity: "client" },
  clientContactPerson: { label: "Contact Person",  entity: "client" },
  clientEmail:         { label: "Email",            entity: "client" },
  clientPhone:         { label: "Phone",            entity: "client" },
};

const VALID_STATUSES = new Set(["planning", "active", "on_hold", "completed", "cancelled"]);

export interface MappedRow {
  rowIndex: number; // 1-based, excluding header
  campaignName?: string;
  budget?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  clientCompanyName?: string;
  clientContactPerson?: string;
  clientEmail?: string;
  clientPhone?: string;
}

export interface SyncConflict {
  rowIndex: number;
  campaignName: string;
  projectId: number;
  clientId?: number;
  isFirstSync: boolean;
  fields: Array<{
    field: string;
    label: string;
    entity: "project" | "client";
    currentValue: string | null;
    sheetValue: string;
    lastSyncedValue: string | null;
  }>;
}

export interface SyncSummary {
  created: number;
  updated: number;
  skipped: number;
  conflictsFound: number;
  conflictsResolved: number;
  errors: string[];
}

function parseColumnMapping(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, string>;
}

function mapRowToData(headers: string[], row: string[], columnMapping: Record<string, string>): MappedRow & { rowIndex: number } {
  const result: Record<string, string> = {};
  headers.forEach((header, idx) => {
    const field = columnMapping[header];
    if (field && row[idx] !== undefined && row[idx] !== "") {
      result[field] = row[idx].trim();
    }
  });
  return result as MappedRow & { rowIndex: number };
}

function normalizeStatus(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase().replace(/[\s-]+/g, "_");
  if (VALID_STATUSES.has(lower)) return lower;
  // Try common variants
  const variants: Record<string, string> = {
    "on hold": "on_hold", planning: "planning", active: "active",
    completed: "completed", cancelled: "cancelled", canceled: "cancelled",
    "in progress": "active", draft: "planning",
  };
  return variants[raw.toLowerCase()] ?? "planning";
}

async function findOrUpsertClient(
  userId: number,
  companyName: string,
  fields: { contactPerson?: string; email?: string; phone?: string }
): Promise<{ id: number; isNew: boolean }> {
  const [existing] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.userId, userId), ilike(clientsTable.companyName, companyName)))
    .limit(1);

  if (existing) {
    return { id: existing.id, isNew: false };
  }

  const [created] = await db
    .insert(clientsTable)
    .values({
      userId,
      companyName,
      contactPerson: fields.contactPerson ?? "TBD",
      email: fields.email ?? "unknown@example.com",
      phone: fields.phone ?? null,
    })
    .returning({ id: clientsTable.id });
  return { id: created.id, isNew: true };
}

async function getTracking(projectId: number, connectionId: number) {
  const [row] = await db
    .select()
    .from(projectSyncTrackingTable)
    .where(
      and(
        eq(projectSyncTrackingTable.projectId, projectId),
        eq(projectSyncTrackingTable.connectionId, connectionId)
      )
    )
    .limit(1);
  return row ?? null;
}

function detectConflicts(
  project: typeof projectsTable.$inferSelect,
  client: typeof clientsTable.$inferSelect | null,
  lastRowData: Record<string, string> | null,
  incoming: MappedRow,
  rowIndex: number
): SyncConflict["fields"] {
  const conflicts: SyncConflict["fields"] = [];
  const isFirstSync = lastRowData === null;

  const projectFieldMap: Record<string, keyof typeof projectsTable.$inferSelect> = {
    campaignName: "campaignName",
    budget: "budget",
    startDate: "startDate",
    endDate: "endDate",
    status: "status",
  };

  for (const [field, dbKey] of Object.entries(projectFieldMap)) {
    const sheetVal = incoming[field as keyof MappedRow] as string | undefined;
    if (!sheetVal) continue; // sheet doesn't have this field, skip

    const dbVal = String(project[dbKey] ?? "");
    const lastVal = lastRowData?.[field] ?? null;

    let effectiveDbVal = dbVal;
    if (field === "status") {
      effectiveDbVal = normalizeStatus(dbVal) ?? dbVal;
    }

    const normalizedSheetVal = field === "status" ? (normalizeStatus(sheetVal) ?? sheetVal) : sheetVal;

    if (effectiveDbVal === normalizedSheetVal) continue; // no change needed

    if (isFirstSync) {
      // First sync: any difference is a potential overwrite → flag as conflict
      if (effectiveDbVal && effectiveDbVal !== "") {
        conflicts.push({
          field,
          label: TARGET_FIELDS[field].label,
          entity: "project",
          currentValue: effectiveDbVal,
          sheetValue: normalizedSheetVal,
          lastSyncedValue: null,
        });
      }
    } else {
      // Subsequent sync: only conflict if DB was manually changed since last sync
      const dbChangedManually = lastVal !== null && effectiveDbVal !== lastVal;
      if (dbChangedManually) {
        conflicts.push({
          field,
          label: TARGET_FIELDS[field].label,
          entity: "project",
          currentValue: effectiveDbVal,
          sheetValue: normalizedSheetVal,
          lastSyncedValue: lastVal,
        });
      }
    }
  }

  if (client) {
    const clientFieldMap: Record<string, keyof typeof clientsTable.$inferSelect> = {
      clientContactPerson: "contactPerson",
      clientEmail: "email",
      clientPhone: "phone",
    };

    for (const [field, dbKey] of Object.entries(clientFieldMap)) {
      const sheetVal = incoming[field as keyof MappedRow] as string | undefined;
      if (!sheetVal) continue;

      const dbVal = String(client[dbKey] ?? "");
      const lastVal = lastRowData?.[field] ?? null;

      if (dbVal === sheetVal) continue;

      if (isFirstSync) {
        if (dbVal && dbVal !== "" && dbVal !== "TBD" && dbVal !== "unknown@example.com") {
          conflicts.push({
            field,
            label: TARGET_FIELDS[field]?.label ?? field,
            entity: "client",
            currentValue: dbVal,
            sheetValue: sheetVal,
            lastSyncedValue: null,
          });
        }
      } else {
        const dbChangedManually = lastVal !== null && dbVal !== lastVal;
        if (dbChangedManually) {
          conflicts.push({
            field,
            label: TARGET_FIELDS[field]?.label ?? field,
            entity: "client",
            currentValue: dbVal,
            sheetValue: sheetVal,
            lastSyncedValue: lastVal,
          });
        }
      }
    }
  }

  return conflicts;
}

async function applyProjectUpdates(
  projectId: number,
  clientId: number,
  incoming: MappedRow,
  skipFields: Set<string>
) {
  const updates: Partial<typeof projectsTable.$inferInsert> = {};
  if (incoming.campaignName && !skipFields.has("campaignName")) updates.campaignName = incoming.campaignName;
  if (incoming.budget && !skipFields.has("budget")) updates.budget = incoming.budget;
  if (incoming.startDate && !skipFields.has("startDate")) updates.startDate = incoming.startDate;
  if (incoming.endDate && !skipFields.has("endDate")) updates.endDate = incoming.endDate;
  if (incoming.status && !skipFields.has("status")) updates.status = normalizeStatus(incoming.status) as any ?? "planning";

  if (Object.keys(updates).length > 0) {
    await db.update(projectsTable).set(updates).where(eq(projectsTable.id, projectId));
  }
}

async function applyClientUpdates(
  clientId: number,
  incoming: MappedRow,
  skipFields: Set<string>
) {
  const updates: Partial<typeof clientsTable.$inferInsert> = {};
  if (incoming.clientContactPerson && !skipFields.has("clientContactPerson")) updates.contactPerson = incoming.clientContactPerson;
  if (incoming.clientEmail && !skipFields.has("clientEmail")) updates.email = incoming.clientEmail;
  if (incoming.clientPhone && !skipFields.has("clientPhone")) updates.phone = incoming.clientPhone;

  if (Object.keys(updates).length > 0) {
    await db.update(clientsTable).set(updates).where(eq(clientsTable.id, clientId));
  }
}

async function upsertTracking(
  projectId: number,
  connectionId: number,
  rowData: Record<string, string>
) {
  const existing = await getTracking(projectId, connectionId);
  if (existing) {
    await db.update(projectSyncTrackingTable)
      .set({ lastRowData: rowData, syncedAt: new Date() })
      .where(eq(projectSyncTrackingTable.id, existing.id));
  } else {
    await db.insert(projectSyncTrackingTable).values({ projectId, connectionId, lastRowData: rowData });
  }
}

/** Run the sync. Returns pending conflicts if any; otherwise completes. */
export async function runSync(
  userId: number,
  connectionId: number
): Promise<{ historyId: number; summary: SyncSummary; conflicts: SyncConflict[] }> {
  const [connection] = await db
    .select()
    .from(sheetsConnectionsTable)
    .where(and(eq(sheetsConnectionsTable.id, connectionId), eq(sheetsConnectionsTable.userId, userId)))
    .limit(1);

  if (!connection) throw new Error("Sheet connection not found");

  const columnMapping = parseColumnMapping(connection.columnMapping);
  const sheetData = await getSheetValues(connection.spreadsheetId, connection.tabName);

  if (sheetData.values.length < 2) {
    const [history] = await db.insert(syncHistoryTable).values({
      userId,
      connectionId,
      status: "success",
      summary: { created: 0, updated: 0, skipped: 0, conflictsFound: 0, conflictsResolved: 0, errors: [] },
      rowsProcessed: 0,
    }).returning({ id: syncHistoryTable.id });
    return {
      historyId: history.id,
      summary: { created: 0, updated: 0, skipped: 0, conflictsFound: 0, conflictsResolved: 0, errors: [] },
      conflicts: [],
    };
  }

  const headers = sheetData.values[0];
  const dataRows = sheetData.values.slice(1);

  const summary: SyncSummary = { created: 0, updated: 0, skipped: 0, conflictsFound: 0, conflictsResolved: 0, errors: [] };
  const allConflicts: SyncConflict[] = [];
  const pendingRows: MappedRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const mapped = mapRowToData(headers, row, columnMapping);
    mapped.rowIndex = i + 1;

    if (!mapped.campaignName) {
      summary.skipped++;
      continue;
    }

    try {
      // Find or create client
      const clientName = mapped.clientCompanyName ?? "Unknown Client";
      const { id: clientId } = await findOrUpsertClient(userId, clientName, {
        contactPerson: mapped.clientContactPerson,
        email: mapped.clientEmail,
        phone: mapped.clientPhone,
      });

      const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);

      // Find existing project
      const [existingProject] = await db
        .select()
        .from(projectsTable)
        .where(and(eq(projectsTable.userId, userId), ilike(projectsTable.campaignName, mapped.campaignName)))
        .limit(1);

      if (!existingProject) {
        // Create new project
        await db.insert(projectsTable).values({
          userId,
          clientId,
          campaignName: mapped.campaignName,
          budget: mapped.budget ?? null,
          startDate: mapped.startDate ?? null,
          endDate: mapped.endDate ?? null,
          status: (normalizeStatus(mapped.status) as any) ?? "planning",
        });

        // Get the newly created project to track it
        const [newProject] = await db
          .select()
          .from(projectsTable)
          .where(and(eq(projectsTable.userId, userId), ilike(projectsTable.campaignName, mapped.campaignName)))
          .limit(1);

        if (newProject) {
          await upsertTracking(newProject.id, connectionId, mapped as Record<string, string>);
        }
        summary.created++;
      } else {
        // Check for conflicts
        const tracking = await getTracking(existingProject.id, connectionId);
        const lastRowData = tracking ? (tracking.lastRowData as Record<string, string>) : null;
        const conflicts = detectConflicts(existingProject, client, lastRowData, mapped, i + 1);

        if (conflicts.length > 0) {
          allConflicts.push({
            rowIndex: i + 1,
            campaignName: mapped.campaignName,
            projectId: existingProject.id,
            clientId,
            isFirstSync: lastRowData === null,
            fields: conflicts,
          });
          pendingRows.push(mapped);
          summary.conflictsFound++;
        } else {
          // No conflicts — apply updates directly
          const skipFields = new Set<string>();
          await applyProjectUpdates(existingProject.id, clientId, mapped, skipFields);
          await applyClientUpdates(clientId, mapped, skipFields);
          await upsertTracking(existingProject.id, connectionId, mapped as Record<string, string>);
          summary.updated++;
        }
      }
    } catch (err) {
      summary.errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const status = allConflicts.length > 0 ? "pending_confirmation" : "success";

  const [history] = await db.insert(syncHistoryTable).values({
    userId,
    connectionId,
    status,
    summary,
    rowsProcessed: dataRows.length,
    pendingConflicts: allConflicts as any,
    pendingRows: pendingRows as any,
  }).returning({ id: syncHistoryTable.id });

  if (allConflicts.length === 0) {
    await db.update(sheetsConnectionsTable)
      .set({ lastSyncAt: new Date() })
      .where(eq(sheetsConnectionsTable.id, connectionId));
  }

  return { historyId: history.id, summary, conflicts: allConflicts };
}

export interface Resolution {
  projectId: number;
  clientId?: number;
  field: string;
  accept: boolean; // true = use sheet value, false = keep current
}

export async function applyResolutions(
  userId: number,
  historyId: number,
  resolutions: Resolution[]
): Promise<SyncSummary> {
  const [history] = await db
    .select()
    .from(syncHistoryTable)
    .where(and(eq(syncHistoryTable.id, historyId), eq(syncHistoryTable.userId, userId)))
    .limit(1);

  if (!history) throw new Error("Sync history not found");
  if (history.status !== "pending_confirmation") throw new Error("No pending conflicts for this sync");

  const conflicts = (history.pendingConflicts ?? []) as SyncConflict[];
  const pendingRows = (history.pendingRows ?? []) as MappedRow[];

  const summary = { ...(history.summary as SyncSummary) };
  summary.conflictsResolved = 0;

  for (const conflict of conflicts) {
    const pendingRow = pendingRows.find((r) => r.rowIndex === conflict.rowIndex);
    if (!pendingRow) continue;

    const acceptedFields = new Set<string>();
    const skippedFields = new Set<string>();

    for (const resolution of resolutions.filter((r) => r.projectId === conflict.projectId)) {
      if (resolution.accept) {
        acceptedFields.add(resolution.field);
      } else {
        skippedFields.add(resolution.field);
      }
    }

    // Apply only accepted fields; skip all others
    const allConflictFields = new Set(conflict.fields.map((f) => f.field));
    const skipFields = new Set(
      [...allConflictFields].filter((f) => !acceptedFields.has(f))
    );

    if (conflict.clientId) {
      await applyClientUpdates(conflict.clientId, pendingRow, skipFields);
    }
    await applyProjectUpdates(conflict.projectId, conflict.clientId ?? 0, pendingRow, skipFields);
    await upsertTracking(conflict.projectId, history.connectionId, pendingRow as Record<string, string>);

    summary.conflictsResolved++;
    summary.updated++;
  }

  await db.update(syncHistoryTable)
    .set({ status: "success", summary })
    .where(eq(syncHistoryTable.id, historyId));

  await db.update(sheetsConnectionsTable)
    .set({ lastSyncAt: new Date() })
    .where(eq(sheetsConnectionsTable.id, history.connectionId));

  return summary;
}
