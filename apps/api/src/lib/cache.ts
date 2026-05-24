/**
 * Redis-backed cache via Upstash.
 *
 * Wraps any async fetcher with a read-through cache:
 *   const data = await cache.getOrSet("key", 30, () => db.query(...));
 *
 * Keys should be scoped by userId to prevent cross-user data leaks:
 *   `user:${userId}:threads`
 *
 * Falls back to the fetcher if Redis is unavailable — no hard dependency.
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable.
 */
import { Redis } from "@upstash/redis";

const DEFAULT_REDIS_TIMEOUT_MS = 750;

function isRedisCacheDisabled(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.PH_DISABLE_REDIS_CACHE === "1" ||
    process.env.PH_DISABLE_REDIS_CACHE === "true"
  );
}

function getRedisTimeoutMs(): number {
  const parsed = Number.parseInt(process.env.CACHE_REDIS_TIMEOUT_MS ?? `${DEFAULT_REDIS_TIMEOUT_MS}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REDIS_TIMEOUT_MS;
}

function withRedisTimeout<T>(operation: Promise<T>): Promise<T> {
  const timeoutMs = getRedisTimeoutMs();
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Redis cache operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    operation
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

function createRedis(): Redis | null {
  if (isRedisCacheDisabled()) return null;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

let _redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (_redis === undefined) _redis = createRedis();
  return _redis;
}

export const cache = {
  /**
   * Returns cached value if fresh, otherwise calls fetcher, caches result, returns it.
   * @param key     Cache key — scope by userId for user-specific data
   * @param ttlSec  Time-to-live in seconds
   * @param fetcher Async function that returns the fresh value
   */
  async getOrSet<T>(key: string, ttlSec: number, fetcher: () => Promise<T>): Promise<T> {
    const redis = getRedis();
    if (redis) {
      try {
        const cached = await withRedisTimeout(redis.get<T>(key));
        if (cached !== null && cached !== undefined) return cached;
      } catch {
        // Redis unavailable — fall through to fetcher
      }
    }

    const value = await fetcher();

    if (redis) {
      try {
        await withRedisTimeout(redis.set(key, JSON.stringify(value), { ex: ttlSec }));
      } catch {
        // Cache write failure is non-fatal
      }
    }

    return value;
  },

  /** Invalidate a single key. */
  async del(key: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    try {
      await withRedisTimeout(redis.del(key));
    } catch {}
  },

  /** Invalidate all keys matching a pattern (use sparingly — O(N) scan). */
  async delPattern(pattern: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    try {
      let cursor = 0;
      do {
        const [nextCursor, keys] = await withRedisTimeout(redis.scan(cursor, { match: pattern, count: 100 }));
        cursor = Number(nextCursor);
        if (keys.length > 0) {
          await withRedisTimeout(redis.del(...keys));
        }
      } while (cursor !== 0);
    } catch {}
  },
};

/** Scope helpers — keeps key format consistent across the codebase. */
export const cacheKeys = {
  authUser: (userId: number) => `user:${userId}:auth`,
  userThreads: (userId: number) => `user:${userId}:threads`,
  userProfile: (userId: number) => `user:${userId}:profile`,
  userBookings: (userId: number) => `user:${userId}:bookings`,
  userServices: (userId: number) => `user:${userId}:services`,
  programContent: (programId: number) => `program:${programId}:content`,
  all: (userId: number) => `user:${userId}:*`,

  // Hot-endpoint cache keys
  billingPlans: () => `billing:plans:public`,
  billingStatus: (userId: number) => `billing:${userId}:status`,
  assignedPrograms: (userId: number) => `user:${userId}:assigned-programs`,
  programsList: (userId: number) => `user:${userId}:programs-list`,
  userSessions: (userId: number) => `user:${userId}:sessions`,
};
