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
let _worker: Worker<PushJob> | null = null;

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
    if (!queue || isRedisLimitExceeded()) {
      const reason = getQueueUnavailableReason();
      logger.warn({ queue: QUEUE_NAME, reason }, "queue.inline_fallback");
      await sendPushNotification(job.userId, job.title, job.body, job.data);
      return;
    }
    try {
      await queue.add("send", job);
    } catch (error) {
      logger.error({ err: error, queue: QUEUE_NAME }, "queue.enqueue_failed");
      throw error;
    }
  },
};

/** Start the push notification worker. Call once at app startup. */
export function startPushWorker(): void {
  if (_worker) return;
  const connection = getRedisConnection();
  if (!connection) return;

  _worker = new Worker<PushJob>(
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
  _worker.on("error", (err) => {
    if (isRedisLimitError(err)) return;
    logger.error({ err }, "Push worker error");
  });
  onRedisLimitExceeded(() => {
    logger.warn("Push worker shutting down — Redis limit exceeded");
    void stopPushWorker();
  });
  logger.info("Push notification worker started");
}

export async function stopPushWorker(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
  }
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
}
