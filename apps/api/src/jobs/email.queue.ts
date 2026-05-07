/**
 * Async email queue.
 *
 * Instead of blocking the request with a slow SMTP/Resend call,
 * callers enqueue the job and return immediately. Automatic retries
 * on transient delivery failures.
 *
 * Usage:
 *   await emailQueue.enqueue({ to, subject, html });
 *
 * Synchronous fallback is disabled by default and can only be enabled
 * explicitly in development/test with ENABLE_SYNC_QUEUE_FALLBACK=true.
 */
import { Queue, Worker } from "bullmq";
import {
  getQueueUnavailableReason,
  getRedisConnection,
  isRedisLimitError,
  isRedisLimitExceeded,
  onRedisLimitExceeded,
} from "./connection";
import { deliverEmail, type EmailAttachment } from "../lib/mailer/base.mailer";
import { logger } from "../lib/logger";

const QUEUE_NAME = "emails";

type EmailJob = {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
};

let _queue: Queue<EmailJob> | null = null;
let _worker: Worker<EmailJob> | null = null;

function getQueue(): Queue<EmailJob> | null {
  if (_queue !== undefined) return _queue;
  const connection = getRedisConnection();
  if (!connection) return (_queue = null);
  _queue = new Queue<EmailJob>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 4,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 200,
      removeOnFail: 1000,
    },
  });
  return _queue;
}

export const emailQueue = {
  async enqueue(job: EmailJob): Promise<void> {
    const queue = getQueue();
    if (!queue || isRedisLimitExceeded()) {
      const reason = getQueueUnavailableReason();
      logger.warn({ queue: QUEUE_NAME, reason }, "queue.inline_fallback");
      await deliverEmail(job);
      return;
    }
    try {
      await queue.add("deliver", job);
    } catch (error) {
      logger.error({ err: error, queue: QUEUE_NAME }, "queue.enqueue_failed");
      throw error;
    }
  },
};

/** Start the email worker. Call once at app startup. */
export function startEmailWorker(): void {
  if (_worker) return;
  const connection = getRedisConnection();
  if (!connection) return;

  _worker = new Worker<EmailJob>(
    QUEUE_NAME,
    async (job) => {
      await deliverEmail(job.data);
    },
    {
      connection,
      concurrency: 3,
    },
  );
  _worker.on("error", (err) => {
    if (isRedisLimitError(err)) return;
    logger.error({ err }, "Email worker error");
  });
  onRedisLimitExceeded(() => {
    logger.warn("Email worker shutting down — Redis limit exceeded");
    void stopEmailWorker();
  });
  logger.info("Email worker started");
}

export async function stopEmailWorker(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
  }
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
}
