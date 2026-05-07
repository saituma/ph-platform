import { claimPendingBatch, markSent, markFailed, cleanupOutbox, OUTBOX_NOTIFY_CHANNEL } from "../services/outbox.service";
import { sendPushNotification } from "../services/push.service";
import { deliverEmail } from "../lib/mailer/base.mailer";
import { pool } from "../db";
import { logger } from "../lib/logger";
import type { PoolClient } from "pg";

let _pollInterval: ReturnType<typeof setInterval> | null = null;
let _cleanupInterval: ReturnType<typeof setInterval> | null = null;
let _listenClient: PoolClient | null = null;
let _draining = false;

const POLL_MS = 10_000;
const CLEANUP_MS = 60 * 60 * 1000;
const BATCH_SIZE = 25;

async function drainOnce(): Promise<void> {
  if (_draining) return;
  _draining = true;
  try {
    const batch = await claimPendingBatch(BATCH_SIZE);
    for (const row of batch) {
      try {
        if (row.channel === "push") {
          const p = row.payload as { userId: number; title: string; body: string; data?: Record<string, unknown> };
          await sendPushNotification(p.userId, p.title, p.body, p.data);
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
  } finally {
    _draining = false;
  }
}

async function startListening(): Promise<void> {
  try {
    _listenClient = await pool.connect();
    await _listenClient.query(`LISTEN ${OUTBOX_NOTIFY_CHANNEL}`);
    _listenClient.on("notification", () => {
      drainOnce().catch((err) => logger.error({ err }, "outbox.notify_drain_error"));
    });
    _listenClient.on("error", (err) => {
      logger.warn({ err }, "outbox.listen_client_error");
      _listenClient = null;
    });
    logger.info("Outbox LISTEN/NOTIFY active");
  } catch (err) {
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

export function stopOutboxWorker(): void {
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
  if (_cleanupInterval) {
    clearInterval(_cleanupInterval);
    _cleanupInterval = null;
  }
  if (_listenClient) {
    try {
      _listenClient.release();
    } catch { /* best effort */ }
    _listenClient = null;
  }
}
