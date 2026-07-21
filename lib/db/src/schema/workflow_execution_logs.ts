import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { webhookConfigsTable } from "./webhook_configs";

export const workflowExecutionLogsTable = pgTable("workflow_execution_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  webhookConfigId: integer("webhook_config_id").references(
    () => webhookConfigsTable.id,
    { onDelete: "set null" }
  ),
  direction: text("direction").notNull(), // 'outbound' | 'inbound'
  eventOrAction: text("event_or_action").notNull(), // e.g. 'project.created', 'analyze'
  status: text("status").notNull(), // 'success' | 'error' | 'pending'
  requestBody: jsonb("request_body"),
  responseBody: jsonb("response_body"),
  durationMs: integer("duration_ms"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WorkflowExecutionLog = typeof workflowExecutionLogsTable.$inferSelect;
export type InsertWorkflowExecutionLog = typeof workflowExecutionLogsTable.$inferInsert;
