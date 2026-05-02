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
 * Falls back to synchronous send if Redis is not configured.
 */
import { Queue, Worker } from "bullmq";
import { getRedisConnection } from "./connection";
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
    if (!queue) {
      // No Redis — deliver synchronously (graceful fallback)
      await deliverEmail(job);
      return;
    }
    await queue.add("deliver", job);
  },
};

/** Start the email worker. Call once at app startup. */
export function startEmailWorker(): void {
  const connection = getRedisConnection();
  if (!connection) return;

  new Worker<EmailJob>(
    QUEUE_NAME,
    async (job) => {
      await deliverEmail(job.data);
    },
    {
      connection,
      concurrency: 3,
    },
  );
  logger.info("Email worker started");
}
