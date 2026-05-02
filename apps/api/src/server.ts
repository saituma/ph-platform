import { createApp } from "./app";
import { env } from "./config/env";
import { initSocket } from "./socket";
import { startEmailWorker, startPushWorker, startScheduledWorker, stopScheduledWorker, isQueueEnabled } from "./jobs";
import { pool } from "./db";
import { getRedisConnection } from "./jobs/connection";
import { logger } from "./lib/logger";
import http from "http";

export async function startServer() {
  try {
    const { runMigrations } = await import("./db/migrations");
    await runMigrations();
    logger.info("Database migrations applied");
  } catch (err) {
    logger.fatal({ err }, "Migration failed — aborting startup");
    process.exit(1);
  }

  if (env.nodeEnv === "production" && !env.expoAccessToken?.trim()) {
    logger.warn(
      "EXPO_ACCESS_TOKEN is not set. Remote push to mobile clients will fail until it is configured (Expo dashboard → Access tokens; see DEPLOY.md).",
    );
  }

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  if (isQueueEnabled()) {
    startEmailWorker();
    startPushWorker();
    await startScheduledWorker();
  } else {
    logger.info("REDIS_URL not set — job queues disabled, falling back to synchronous delivery");
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

    try {
      await stopScheduledWorker();
      logger.info("Scheduled worker stopped");
    } catch {
      /* best effort */
    }

    const redis = getRedisConnection();
    if (redis) {
      try {
        await redis.quit();
        logger.info("Redis connection closed");
      } catch { /* best effort */ }
    }

    try {
      await pool.end();
      logger.info("Database pool drained");
    } catch { /* best effort */ }

    logger.info("Clean exit");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}
