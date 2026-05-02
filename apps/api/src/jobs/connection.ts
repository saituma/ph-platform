/**
 * Shared ioredis connection for BullMQ.
 *
 * BullMQ requires a standard Redis TCP connection (not Upstash REST API).
 * Set REDIS_URL to a Redis connection string, e.g.:
 *   redis://localhost:6379
 *   rediss://default:password@host:6380  (TLS)
 *   redis://default:password@upstash-host:6380  (Upstash Redis ioredis mode)
 *
 * If REDIS_URL is not set, job queues are disabled and all operations
 * fall back to synchronous execution — no jobs are lost, just not queued.
 */
import IORedis from "ioredis";
import { logger } from "../lib/logger";

let _connection: IORedis | null | undefined;

export function getRedisConnection(): IORedis | null {
  if (_connection !== undefined) return _connection;
  const url = process.env.REDIS_URL;
  if (!url) {
    _connection = null;
    return null;
  }
  _connection = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  _connection.on("error", (err) => {
    logger.error({ err }, "Redis connection error");
  });
  return _connection;
}

export function isQueueEnabled(): boolean {
  return Boolean(process.env.REDIS_URL);
}
