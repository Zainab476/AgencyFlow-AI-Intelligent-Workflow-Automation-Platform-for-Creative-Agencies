import crypto from "crypto";
import { db, webhookConfigsTable, workflowExecutionLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export type WebhookEventType =
  | "project.created"
  | "project.updated"
  | "task.created"
  | "task.status_changed"
  | "document.generated";

export async function emitWebhookEvent(
  userId: number,
  event: WebhookEventType,
  payload: Record<string, unknown>
): Promise<void> {
  // Find all active configs that subscribe to this event
  const configs = await db
    .select()
    .from(webhookConfigsTable)
    .where(and(eq(webhookConfigsTable.userId, userId), eq(webhookConfigsTable.active, true)));

  const subscribed = configs.filter((c) => {
    const events = c.eventTypes as string[];
    return events.includes(event) || events.includes("*");
  });

  if (subscribed.length === 0) return;

  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });

  await Promise.allSettled(
    subscribed.map(async (config) => {
      const start = Date.now();
      let status = "success";
      let responseBody: unknown = null;
      let error: string | null = null;

      const signature = crypto
        .createHmac("sha256", config.secret)
        .update(body)
        .digest("hex");

      try {
        const res = await fetch(config.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AgencyFlow-Signature": `sha256=${signature}`,
            "X-AgencyFlow-Event": event,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });

        const text = await res.text().catch(() => "");
        try { responseBody = JSON.parse(text); } catch { responseBody = text; }

        if (!res.ok) {
          status = "error";
          error = `HTTP ${res.status}`;
        }
      } catch (err) {
        status = "error";
        error = err instanceof Error ? err.message : "Request failed";
      }

      const durationMs = Date.now() - start;

      // Log it (non-blocking, don't throw on failure)
      await db.insert(workflowExecutionLogsTable).values({
        userId,
        webhookConfigId: config.id,
        direction: "outbound",
        eventOrAction: event,
        status,
        requestBody: JSON.parse(body),
        responseBody: responseBody as any,
        durationMs,
        error,
      }).catch(() => {});
    })
  );
}
