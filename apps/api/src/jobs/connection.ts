/**
 * Shared ioredis connection for BullMQ.
 *
 * BullMQ requires a standard Redis TCP connection (not Upstash REST API).
 * Set REDIS_URL to a Redis connection string, e.g.:
 *   redis://localhost:6379
 *   rediss://default:password@host:6380  (TLS)
 *   redis://default:password@upstash-host:6380  (Upstash Redis ioredis mode)
 *
 * If REDIS_URL is not set, job enqueue fails unless explicit development/test
 * synchronous fallback is enabled with ENABLE_SYNC_QUEUE_FALLBACK=true.
 */
import IORedis from "ioredis";
import { logger } from "../lib/logger";

let _connection: IORedis | null | undefined;
let _limitExceeded = false;
let _disabled = false;
const _onLimitCallbacks: Array<() => void> = [];

export function isRedisLimitExceeded(): boolean {
  return _limitExceeded;
}

export function onRedisLimitExceeded(cb: () => void): void {
  _onLimitCallbacks.push(cb);
  if (_limitExceeded) cb();
}

export function isRedisLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return msg.includes("max requests limit exceeded");
}

export class QueueUnavailableError extends Error {
  constructor(
    public readonly queueName: string,
    public readonly reason: string,
  ) {
    super(`Queue "${queueName}" is unavailable: ${reason}`);
    this.name = "QueueUnavailableError";
  }
}

function isRedisDisabledByEnv(): boolean {
  return String(process.env.DISABLE_REDIS ?? "").toLowerCase() === "true";
}

function triggerLimitExceeded(): void {
  if (_limitExceeded) return;
  _limitExceeded = true;
  _disabled = true;
  try {
    _connection?.disconnect();
  } catch {
    // noop
  }
  _connection = null;
  logger.error("Upstash Redis request limit exceeded — disabling queues until restart");
  for (const cb of _onLimitCallbacks) {
    try { cb(); } catch { /* noop */ }
  }
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
    retryStrategy(times) {
      if (_limitExceeded) return null;
      return Math.min(times * 500, 30000);
    },
  });
  _connection.on("error", (err) => {
    if (isRedisLimitError(err)) {
      triggerLimitExceeded();
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

export function getQueueUnavailableReason(): string {
  if (isRedisDisabledByEnv()) return "redis_disabled";
  if (_limitExceeded) return "redis_limit_exceeded";
  if (_disabled) return "redis_disabled_after_error";
  if (!process.env.REDIS_URL) return "redis_missing";
  return "redis_unavailable";
}

export function isStrictQueueEnvironment(): boolean {
  const appEnv = String(process.env.APP_ENV ?? process.env.HEROKU_ENV ?? "").toLowerCase();
  return process.env.NODE_ENV === "production" || appEnv === "production" || appEnv === "staging";
}

export function isSyncQueueFallbackEnabled(): boolean {
  if (isStrictQueueEnvironment()) return false;
  return String(process.env.ENABLE_SYNC_QUEUE_FALLBACK ?? "").toLowerCase() === "true";
}
