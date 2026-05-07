import { and, eq, lt, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { pool } from "../db";
import { notificationOutboxTable } from "../db/schema";
import { logger } from "../lib/logger";

const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 30_000;
export const OUTBOX_NOTIFY_CHANNEL = "outbox_new";

type PushPayload = { userId: number; title: string; body: string; data?: Record<string, unknown> };
type EmailPayload = { to: string; subject: string; html: string; attachments?: unknown[] };

async function notifyNewIntent(): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      await client.query(`NOTIFY ${OUTBOX_NOTIFY_CHANNEL}`);
    } finally {
      client.release();
    }
  } catch {
    // Best-effort; polling is the fallback.
  }
}

export async function createPushIntent(payload: PushPayload): Promise<number> {
  const [row] = await db
    .insert(notificationOutboxTable)
    .values({ channel: "push", payload })
    .returning({ id: notificationOutboxTable.id });
  logger.info({ outboxId: row.id, channel: "push" }, "outbox.intent_created");
  void notifyNewIntent();
  return row.id;
}

export async function createEmailIntent(payload: EmailPayload): Promise<number> {
  const [row] = await db
    .insert(notificationOutboxTable)
    .values({ channel: "email", payload })
    .returning({ id: notificationOutboxTable.id });
  logger.info({ outboxId: row.id, channel: "email" }, "outbox.intent_created");
  void notifyNewIntent();
  return row.id;
}

export async function claimPendingBatch(limit = 25) {
  const now = new Date();
  const rows = await db
    .update(notificationOutboxTable)
    .set({ status: "processing", updatedAt: now })
    .where(
      and(
        eq(notificationOutboxTable.status, "pending"),
        lte(notificationOutboxTable.nextRunAt, now),
      ),
    )
    .returning();

  const claimed = rows.slice(0, limit);

  if (claimed.length > 0 && rows.length > limit) {
    const unclaimed = rows.slice(limit).map((r) => r.id);
    await db
      .update(notificationOutboxTable)
      .set({ status: "pending", updatedAt: now })
      .where(sql`${notificationOutboxTable.id} = ANY(${unclaimed})`);
  }

  if (claimed.length > 0) {
    logger.info({ count: claimed.length }, "outbox.claimed");
  }
  return claimed;
}

export async function markSent(id: number): Promise<void> {
  await db
    .update(notificationOutboxTable)
    .set({ status: "sent", updatedAt: new Date() })
    .where(eq(notificationOutboxTable.id, id));
  logger.info({ outboxId: id }, "outbox.delivered");
}

export async function markFailed(id: number, error: string, attempts: number): Promise<void> {
  const nextAttempts = attempts + 1;
  if (nextAttempts >= MAX_ATTEMPTS) {
    await db
      .update(notificationOutboxTable)
      .set({ status: "failed", lastError: error, attempts: nextAttempts, updatedAt: new Date() })
      .where(eq(notificationOutboxTable.id, id));
    logger.error({ outboxId: id, attempts: nextAttempts }, "outbox.failed");
    return;
  }
  const delay = BASE_BACKOFF_MS * Math.pow(2, nextAttempts - 1);
  const nextRunAt = new Date(Date.now() + delay);
  await db
    .update(notificationOutboxTable)
    .set({ status: "pending", lastError: error, attempts: nextAttempts, nextRunAt, updatedAt: new Date() })
    .where(eq(notificationOutboxTable.id, id));
  logger.warn({ outboxId: id, nextAttempts, nextRunAt: nextRunAt.toISOString() }, "outbox.retry_scheduled");
}

const SENT_RETENTION_MS = 24 * 60 * 60 * 1000;
const FAILED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export async function cleanupOutbox(): Promise<{ sentDeleted: number; failedDeleted: number }> {
  const sentCutoff = new Date(Date.now() - SENT_RETENTION_MS);
  const failedCutoff = new Date(Date.now() - FAILED_RETENTION_MS);

  const sentRows = await db
    .delete(notificationOutboxTable)
    .where(and(eq(notificationOutboxTable.status, "sent"), lt(notificationOutboxTable.updatedAt, sentCutoff)))
    .returning({ id: notificationOutboxTable.id });

  const failedRows = await db
    .delete(notificationOutboxTable)
    .where(and(eq(notificationOutboxTable.status, "failed"), lt(notificationOutboxTable.updatedAt, failedCutoff)))
    .returning({ id: notificationOutboxTable.id });

  const result = { sentDeleted: sentRows.length, failedDeleted: failedRows.length };
  if (result.sentDeleted > 0 || result.failedDeleted > 0) {
    logger.info(result, "outbox.cleanup");
  }
  return result;
}
