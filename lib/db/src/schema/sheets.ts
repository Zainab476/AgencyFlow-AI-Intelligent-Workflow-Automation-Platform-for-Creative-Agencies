import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { clientsTable } from "./clients";

export const sheetsConnectionsTable = pgTable("sheets_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  spreadsheetId: text("spreadsheet_id").notNull(),
  spreadsheetName: text("spreadsheet_name").notNull(),
  tabName: text("tab_name").notNull().default("Sheet1"),
  columnMapping: jsonb("column_mapping").notNull().default("{}"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const syncHistoryTable = pgTable("sync_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  connectionId: integer("connection_id")
    .notNull()
    .references(() => sheetsConnectionsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // 'success' | 'partial' | 'failed' | 'pending_confirmation'
  summary: jsonb("summary").notNull().default("{}"),
  rowsProcessed: integer("rows_processed").notNull().default(0),
  pendingConflicts: jsonb("pending_conflicts").default("[]"),
  pendingRows: jsonb("pending_rows").default("[]"),
  errors: jsonb("errors").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectSyncTrackingTable = pgTable("project_sync_tracking", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  connectionId: integer("connection_id")
    .notNull()
    .references(() => sheetsConnectionsTable.id, { onDelete: "cascade" }),
  lastRowData: jsonb("last_row_data").notNull().default("{}"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export const clientSyncTrackingTable = pgTable("client_sync_tracking", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "cascade" }),
  connectionId: integer("connection_id")
    .notNull()
    .references(() => sheetsConnectionsTable.id, { onDelete: "cascade" }),
  lastRowData: jsonb("last_row_data").notNull().default("{}"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export type SheetConnection = typeof sheetsConnectionsTable.$inferSelect;
export type SyncHistory = typeof syncHistoryTable.$inferSelect;
export type ProjectSyncTracking = typeof projectSyncTrackingTable.$inferSelect;
export type ClientSyncTracking = typeof clientSyncTrackingTable.$inferSelect;
