import {
  claimPendingBatch,
  markSent,
  markFailed,
  cleanupOutbox,
  OUTBOX_NOTIFY_CHANNEL,
} from "../services/outbox.service";
import { sendPushNotification } from "../services/push.service";
import { deliverEmail } from "../lib/mailer/base.mailer";
import { formatBatchedTitle } from "../lib/notification-batcher";
import { isUserInThread } from "../lib/presence";
import { createDedicatedClient } from "../db";
import { logger } from "../lib/logger";
import type { Client } from "pg";

let _pollInterval: ReturnType<typeof setInterval> | null = null;
let _cleanupInterval: ReturnType<typeof setInterval> | null = null;
let _listenClient: Client | null = null;
let _draining = false;
let _consecutiveDbErrors = 0;

const POLL_MS = 10_000;
const CLEANUP_MS = 60 * 60 * 1000;
const BATCH_SIZE = 25;
// Max backoff ~5 min when DB is consistently failing (quota exceeded, connectivity, etc.)
const MAX_BACKOFF_MS = 5 * 60 * 1000;

function isDbError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("compute time quota") || msg.includes("connection") || msg.includes("ECONNREFUSED");
}

async function drainOnce(): Promise<void> {
  if (_draining) return;
  _draining = true;
  try {
    const batch = await claimPendingBatch(BATCH_SIZE);
    _consecutiveDbErrors = 0;
    for (const row of batch) {
      try {
        if (row.channel === "push") {
          const p = row.payload as { userId: number; title: string; body: string; data?: Record<string, unknown> };
          const threadId = typeof p.data?.threadId === "string" ? p.data.threadId : null;

          // Re-check presence at DELIVERY time, not enqueue time. The recipient may have opened
          // the thread during the coalescing window — pushing them a notification for a message
          // they are currently reading is the exact thing this suppression exists to prevent.
          if (threadId && (await isUserInThread(p.userId, threadId))) {
            logger.info({ outboxId: row.id, userId: p.userId }, "outbox.push_suppressed_user_in_thread");
            await markSent(row.id);
            continue;
          }

          // The coalesced count is only final now that the window has closed.
          const messageCount = Number(p.data?.messageCount ?? 1);
          const title = formatBatchedTitle(p.title, messageCount);
          const body = messageCount > 1 ? `${messageCount} new messages` : p.body;

          await sendPushNotification(p.userId, title, body, p.data);
        } else if (row.channel === "email") {
          const p = row.payload as { to: string; subject: string; html: string; attachments?: any[] };
          await deliverEmail(p);
        }
        await markSent(row.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await markFailed(row.id, message, row.attempts).catch((e) =>
          logger.error({ err: e, outboxId: row.id }, "outbox.mark_failed_error"),
        );
      }
    }
  } catch (err) {
    if (isDbError(err)) {
      _consecutiveDbErrors++;
      const backoffMs = Math.min(POLL_MS * Math.pow(2, _consecutiveDbErrors - 1), MAX_BACKOFF_MS);
      logger.error({ err, consecutiveDbErrors: _consecutiveDbErrors, backoffMs }, "outbox.db_error — backing off");
      // Reschedule poll after backoff instead of fixed interval
      if (_pollInterval) {
        clearInterval(_pollInterval);
        _pollInterval = null;
        setTimeout(() => {
          if (_pollInterval === null) {
            _pollInterval = setInterval(() => {
              drainOnce().catch((e) => logger.error({ err: e }, "outbox.drain_error"));
            }, POLL_MS);
            drainOnce().catch((e) => logger.error({ err: e }, "outbox.drain_error"));
          }
        }, backoffMs);
      }
    } else {
      logger.error({ err }, "outbox.drain_error");
    }
  } finally {
    _draining = false;
  }
}

async function startListening(): Promise<void> {
  try {
    // A LISTEN subscriber holds its connection for the life of the process. Taking it from
    // the pool permanently spent one of DB_POOL_MAX (5 in production), leaving 4 for every
    // HTTP request and socket handler on the dyno. Use a connection outside the pool.
    _listenClient = createDedicatedClient();
    _listenClient.on("error", (err) => {
      logger.warn({ err }, "outbox.listen_client_error");
      _listenClient = null;
    });
    await _listenClient.connect();
    await _listenClient.query(`LISTEN ${OUTBOX_NOTIFY_CHANNEL}`);
    _listenClient.on("notification", () => {
      drainOnce().catch((err) => logger.error({ err }, "outbox.notify_drain_error"));
    });
    logger.info("Outbox LISTEN/NOTIFY active (dedicated connection, outside the pool)");
  } catch (err) {
    // Polling every POLL_MS still drains the outbox, so a LISTEN failure degrades latency
    // rather than delivery.
    logger.warn({ err }, "outbox.listen_setup_failed — polling only");
    _listenClient = null;
  }
}

export function startOutboxWorker(): void {
  if (_pollInterval) return;

  void startListening();

  _pollInterval = setInterval(() => {
    drainOnce().catch((err) => logger.error({ err }, "outbox.drain_error"));
  }, POLL_MS);

  _cleanupInterval = setInterval(() => {
    cleanupOutbox().catch((err) => logger.error({ err }, "outbox.cleanup_error"));
  }, CLEANUP_MS);

  drainOnce().catch((err) => logger.error({ err }, "outbox.drain_error"));
  logger.info("Outbox drain worker started");
}

export async function stopOutboxWorker(): Promise<void> {
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
  if (_cleanupInterval) {
    clearInterval(_cleanupInterval);
    _cleanupInterval = null;
  }
  // Wait for any in-flight drain to finish before releasing the DB client
  while (_draining) {
    await new Promise<void>((r) => setTimeout(r, 50));
  }
  if (_listenClient) {
    try {
      await _listenClient.end();
    } catch {
      /* best effort */
    }
    _listenClient = null;
  }
}
