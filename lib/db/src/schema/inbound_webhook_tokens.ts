import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { webhookConfigsTable } from "./webhook_configs";

export const inboundWebhookTokensTable = pgTable("inbound_webhook_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  webhookConfigId: integer("webhook_config_id").references(
    () => webhookConfigsTable.id,
    { onDelete: "cascade" }
  ),
  token: text("token").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InboundWebhookToken = typeof inboundWebhookTokensTable.$inferSelect;
export type InsertInboundWebhookToken = typeof inboundWebhookTokensTable.$inferInsert;
