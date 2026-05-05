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
let _limitExceeded = false;
let _disabled = false;

export function isRedisLimitExceeded(): boolean {
  return _limitExceeded;
}

function isRedisDisabledByEnv(): boolean {
  return String(process.env.DISABLE_REDIS ?? "").toLowerCase() === "true";
}

export function getRedisConnection(): IORedis | null {
  if (_disabled || isRedisDisabledByEnv()) return null;
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
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("max requests limit exceeded")) {
      if (!_limitExceeded) {
        _limitExceeded = true;
        _disabled = true;
        try {
          _connection?.disconnect();
        } catch {
          // noop
        }
        _connection = null;
        logger.error("Upstash Redis request limit exceeded — disabling queues until restart");
      }
      return;
    }
    logger.error({ err }, "Redis connection error");
  });
  return _connection;
}

export function isQueueEnabled(): boolean {
  if (_disabled || isRedisDisabledByEnv() || _limitExceeded) return false;
  return Boolean(process.env.REDIS_URL);
}
