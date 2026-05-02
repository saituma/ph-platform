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

function createRedis(): Redis | null {
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
        const cached = await redis.get<T>(key);
        if (cached !== null && cached !== undefined) return cached;
      } catch {
        // Redis unavailable — fall through to fetcher
      }
    }

    const value = await fetcher();

    if (redis) {
      try {
        await redis.set(key, JSON.stringify(value), { ex: ttlSec });
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
      await redis.del(key);
    } catch {}
  },

  /** Invalidate all keys matching a pattern (use sparingly — O(N) scan). */
  async delPattern(pattern: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    try {
      let cursor = 0;
      do {
        const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
        cursor = Number(nextCursor);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== 0);
    } catch {}
  },
};

/** Scope helpers — keeps key format consistent across the codebase. */
export const cacheKeys = {
  userThreads: (userId: number) => `user:${userId}:threads`,
  userProfile: (userId: number) => `user:${userId}:profile`,
  userBookings: (userId: number) => `user:${userId}:bookings`,
  userServices: (userId: number) => `user:${userId}:services`,
  programContent: (programId: number) => `program:${programId}:content`,
  all: (userId: number) => `user:${userId}:*`,
};
