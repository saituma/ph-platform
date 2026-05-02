import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (_limiter) return _limiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  _limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: true,
    prefix: "ph:ratelimit",
  });

  return _limiter;
}

// Simple dev fallback using in-memory Map
const devBuckets = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of devBuckets) {
    if (bucket.resetAt <= now) devBuckets.delete(key);
  }
}, 5 * 60_000);

function devRateLimit(ip: string): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  const now = Date.now();
  const bucket = devBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    devBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return { success: true, limit: 10, remaining: 9, reset: now + 60_000 };
  }
  bucket.count++;
  const remaining = Math.max(0, 10 - bucket.count);
  return {
    success: bucket.count <= 10,
    limit: 10,
    remaining,
    reset: bucket.resetAt,
  };
}

export const authRateLimiter = {
  async limit(
    ip: string,
  ): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const limiter = getLimiter();
    if (!limiter) return devRateLimit(ip);
    return limiter.limit(ip);
  },
};
