import * as Sentry from "@sentry/node";

import { env } from "./config/env";
import { pool } from "./db";
import {
  isQueueEnabled,
  isStrictQueueEnvironment,
  startEmailWorker,
  startOutboxWorker,
  startPushWorker,
  startScheduledWorker,
  stopEmailWorker,
  stopOutboxWorker,
  stopPushWorker,
  stopScheduledWorker,
} from "./jobs";
import { getRedisConnection } from "./jobs/connection";
import { fatalExit } from "./lib/fatal-exit";
import { logger } from "./lib/logger";

if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    tracesSampleRate: env.nodeEnv === "production" ? 0.1 : 1.0,
  });
  logger.info("Sentry worker error tracking initialized");
}

function isBenignRedisRejection(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : String(reason ?? "");
  return message.includes("max requests limit exceeded") || message.includes("Connection is closed");
}

export async function startWorkerProcess() {
  logger.info("Worker process started; HTTP/socket disabled");

  if (!isQueueEnabled()) {
    logger.error({ reason: "redis_missing" }, "queue.redis_missing");
    if (isStrictQueueEnvironment()) {
      throw new Error("REDIS_URL is required for the worker process in production/staging");
    }
    logger.warn("REDIS_URL not set — worker process has no BullMQ queues to run");
    return;
  }

  startEmailWorker();
  startPushWorker();
  startOutboxWorker();
  await startScheduledWorker();
}

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Worker shutdown signal received");

  try {
    stopOutboxWorker();
    await stopScheduledWorker();
    await stopEmailWorker();
    await stopPushWorker();
    logger.info("BullMQ workers stopped");
  } catch (err) {
    logger.warn({ err }, "Error while stopping BullMQ workers");
  }

  const redis = getRedisConnection();
  if (redis) {
    try {
      await redis.quit();
      logger.info("Redis connection closed");
    } catch {
      /* best effort */
    }
  }

  try {
    await pool.end();
    logger.info("Database pool drained");
  } catch {
    /* best effort */
  }

  logger.info("Worker clean exit");
  process.exit(0);
}

process.on("unhandledRejection", (reason) => {
  if (isBenignRedisRejection(reason)) {
    logger.warn({ reason }, "Ignoring non-fatal Redis unhandled rejection");
    return;
  }
  if (env.sentryDsn) Sentry.captureException(reason);
  fatalExit("Worker unhandled promise rejection", reason, 1);
});

process.on("uncaughtException", (error) => {
  if (env.sentryDsn) Sentry.captureException(error);
  fatalExit("Worker uncaught exception", error, 1);
});

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

if (require.main === module) {
  void startWorkerProcess().catch((error) => {
    if (env.sentryDsn) Sentry.captureException(error);
    fatalExit("Worker startup failed", error, 1);
  });
}
