import { createApp } from "./app";
import { env } from "./config/env";
import { initSocket } from "./socket";
import { pool } from "./db";
import { getRedisConnection } from "./jobs/connection";
import { logger } from "./lib/logger";
import { startEventLoopDelayLogging } from "./lib/event-loop-delay";
import {
  isQueueEnabled,
  startEmailWorker,
  startOutboxWorker,
  startScheduledWorker,
  stopEmailWorker,
  stopOutboxWorker,
  stopScheduledWorker,
} from "./jobs";
import http from "http";

export async function startServer() {
  const stopEventLoopDelayLogging = startEventLoopDelayLogging();

  if (process.env.SKIP_MIGRATIONS !== "true") {
    try {
      const { runMigrations } = await import("./db/migrations");
      await runMigrations();
      logger.info("Database migrations applied");
    } catch (err) {
      // Log but never crash the server — a bad migration file should not take down the API.
      // The previous schema is still valid and all existing endpoints continue to work.
      logger.error({ err }, "Migration failed — server continuing with existing schema");
    }
  } else {
    logger.info("Skipping migrations (SKIP_MIGRATIONS=true)");
  }

  if (env.nodeEnv === "production" && !env.expoAccessToken?.trim()) {
    logger.warn(
      "EXPO_ACCESS_TOKEN is not set. Remote push to mobile clients will fail until it is configured (Expo dashboard → Access tokens; see DEPLOY.md).",
    );
  }

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  startOutboxWorker();
  logger.info("API web process started; outbox worker enabled");

  // On a single dyno the `worker` process type is never started, so nothing consumes the
  // BullMQ queues. Run them here. They are I/O-bound (HTTP to Resend/Expo/FCM), so they cost
  // the socket event loop almost nothing.
  if (env.runWorkersInProcess) {
    if (isQueueEnabled()) {
      startEmailWorker();
      await startScheduledWorker();
      logger.info("BullMQ email + scheduled workers started in-process");
    } else {
      logger.warn(
        { reason: "redis_missing" },
        "RUN_WORKERS_IN_PROCESS is on but REDIS_URL is not set — scheduled reminders and queued emails will NOT run",
      );
    }
  }

  server.listen(env.port, "0.0.0.0", () => {
    logger.info({ port: env.port }, "Server is running");
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutdown signal received — draining connections");

    server.close(() => {
      logger.info("HTTP server closed");
    });

    const { getSocketServer } = await import("./socket-hub");
    const io = getSocketServer();
    if (io) {
      io.close();
      logger.info("Socket.io closed");
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

    await stopOutboxWorker();
    if (env.runWorkersInProcess) {
      try {
        await stopScheduledWorker();
        await stopEmailWorker();
      } catch (err) {
        logger.warn({ err }, "Error while stopping in-process BullMQ workers");
      }
    }

    try {
      await pool.end();
      logger.info("Database pool drained");
    } catch {
      /* best effort */
    }

    stopEventLoopDelayLogging();
    logger.info("Clean exit");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}
