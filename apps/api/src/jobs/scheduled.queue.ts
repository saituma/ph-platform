import { Queue, Worker } from "bullmq";
import { getRedisConnection } from "./connection";
import { logger } from "../lib/logger";

const QUEUE_NAME = "scheduled-jobs";

type ScheduledJobName = "nutrition-reminder" | "subscription-expiry";

type ScheduledJob = {
  name: ScheduledJobName;
};

let _queue: Queue<ScheduledJob> | null = null;
let _worker: Worker<ScheduledJob> | null = null;

function getQueue(): Queue<ScheduledJob> | null {
  if (_queue !== undefined) return _queue;
  const connection = getRedisConnection();
  if (!connection) return (_queue = null);
  _queue = new Queue<ScheduledJob>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: 50,
      removeOnFail: 200,
    },
  });
  return _queue;
}

const handlers: Record<ScheduledJobName, () => Promise<unknown>> = {
  "nutrition-reminder": async () => {
    const { runNutritionLogReminderSweep } = await import("../services/nutrition-reminder.service");
    return runNutritionLogReminderSweep();
  },
  "subscription-expiry": async () => {
    const { runSubscriptionExpirySweep } = await import("../services/subscription-expiry.service");
    return runSubscriptionExpirySweep();
  },
};

export async function startScheduledWorker(): Promise<void> {
  const connection = getRedisConnection();
  if (!connection) return;

  const queue = getQueue();
  if (!queue) return;

  _worker = new Worker<ScheduledJob>(
    QUEUE_NAME,
    async (job) => {
      const handler = handlers[job.data.name];
      if (!handler) {
        logger.warn({ jobName: job.data.name }, "Unknown scheduled job");
        return;
      }
      const log = logger.child({ job: job.data.name, jobId: job.id });
      log.info("Scheduled job started");
      const result = await handler();
      log.info({ result }, "Scheduled job completed");
    },
    {
      connection,
      concurrency: 1,
    },
  );

  await queue.upsertJobScheduler(
    "nutrition-reminder",
    { every: 5 * 60_000 },
    { name: "nutrition-reminder", data: { name: "nutrition-reminder" } },
  );

  await queue.upsertJobScheduler(
    "subscription-expiry",
    { pattern: "0 3 * * *" },
    { name: "subscription-expiry", data: { name: "subscription-expiry" } },
  );

  logger.info(
    "[BullMQ] Scheduled jobs worker started (nutrition-reminder every 5m, subscription-expiry daily at 03:00)",
  );
}

export async function stopScheduledWorker(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
  }
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
}
