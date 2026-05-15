import { createApp } from "./app";
import { env } from "./config/env";
import { initSocket } from "./socket";
import { pool } from "./db";
import { getRedisConnection } from "./jobs/connection";
import { logger } from "./lib/logger";
import { startEventLoopDelayLogging } from "./lib/event-loop-delay";
import { startOutboxWorker, stopOutboxWorker } from "./jobs";
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
      } catch { /* best effort */ }
    }

    stopOutboxWorker();

    try {
      await pool.end();
      logger.info("Database pool drained");
    } catch { /* best effort */ }

    stopEventLoopDelayLogging();
    logger.info("Clean exit");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}
