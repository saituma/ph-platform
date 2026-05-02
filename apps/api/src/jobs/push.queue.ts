/**
 * Async push notification queue.
 *
 * Instead of blocking the request with a 200-500ms push call,
 * callers enqueue the job and return immediately. The worker
 * processes it out of band with automatic retries on failure.
 *
 * Usage:
 *   await pushQueue.enqueue({ userId, title, body, data });
 *
 * Falls back to synchronous send if Redis is not configured.
 */
import { Queue, Worker } from "bullmq";
import { getRedisConnection } from "./connection";
import { sendPushNotification } from "../services/push.service";
import { logger } from "../lib/logger";

const QUEUE_NAME = "push-notifications";

type PushJob = {
  userId: number;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

let _queue: Queue<PushJob> | null = null;

function getQueue(): Queue<PushJob> | null {
  if (_queue !== undefined) return _queue;
  const connection = getRedisConnection();
  if (!connection) return (_queue = null);
  _queue = new Queue<PushJob>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });
  return _queue;
}

export const pushQueue = {
  async enqueue(job: PushJob): Promise<void> {
    const queue = getQueue();
    if (!queue) {
      // No Redis — send synchronously (graceful fallback)
      await sendPushNotification(job.userId, job.title, job.body, job.data);
      return;
    }
    await queue.add("send", job);
  },
};

/** Start the push notification worker. Call once at app startup. */
export function startPushWorker(): void {
  const connection = getRedisConnection();
  if (!connection) return;

  new Worker<PushJob>(
    QUEUE_NAME,
    async (job) => {
      const { userId, title, body, data } = job.data;
      await sendPushNotification(userId, title, body, data);
    },
    {
      connection,
      concurrency: 5,
    },
  );
  logger.info("Push notification worker started");
}
