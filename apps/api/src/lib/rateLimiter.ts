/**
 * Redis-backed rate limiting via Upstash Ratelimit.
 *
 * Uses sliding window algorithm — survives API restarts and scales across
 * multiple instances (unlike express-rate-limit's in-memory store).
 *
 * Falls back gracefully (allows requests) if Redis is not configured.
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable.
 *
 * ## Rate Limit Tiers
 *
 * | Tier            | Requests | Window     | Applied to                          |
 * | --------------- | -------- | ---------- | ----------------------------------- |
 * | `auth`          | 30       | 15 minutes | Login, register, password reset     |
 * | `deleteAccount` | 5        | 1 hour     | Account deletion endpoint           |
 * | `api` (global)  | 300      | 1 minute   | All `/api/v1` and `/api` routes     |
 * | `ai`            | 20       | 10 minutes | AI-powered / expensive endpoints    |
 *
 * All limits are per client IP (extracted from X-Forwarded-For or socket).
 *
 * ## Response Headers
 *
 * Every rate-limited response includes:
 * - `X-RateLimit-Limit`     — maximum requests allowed in the window
 * - `X-RateLimit-Remaining` — requests remaining in the current window
 * - `X-RateLimit-Reset`     — Unix timestamp (ms) when the window resets
 *
 * ## 429 Response Format
 *
 * ```json
 * { "error": "Too many requests", "retryAfter": <seconds until reset> }
 * ```
 *
 * ## Graceful Degradation
 *
 * When Redis is unavailable (env vars missing or connection error), every
 * request is allowed through. This prevents a Redis outage from blocking
 * all API traffic.
 *
 * ## Request Body Size Limits
 *
 * The API enforces a global body size limit via `express.json({ limit })`
 * (default `1mb`, configurable with `REQUEST_BODY_LIMIT` env var). Special
 * cases:
 * - Stripe webhook routes (`/api/billing/webhook`) use `express.raw()` with
 *   the same limit for signature verification.
 * - Media upload routes (`/api/media/upload`) are exempted from the JSON
 *   content-type requirement and handled via multipart/form-data (MinIO).
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Request, Response, NextFunction } from "express";

function createRatelimit(requests: number, window: `${number} ${"s" | "m" | "h" | "d"}`): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
  });
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]!.trim();
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

/**
 * Express middleware factory — wraps Upstash Ratelimit with Express.
 * Falls back to express-rate-limit config if Redis is unconfigured.
 */
export function redisRateLimit(
  requests: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
  prefix = "rl",
) {
  const limiter = createRatelimit(requests, window);

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!limiter) {
      // Redis not configured — allow all requests (degrade gracefully)
      return next();
    }
    const ip = getClientIp(req);
    const key = `${prefix}:${ip}`;
    try {
      const { success, limit, remaining, reset } = await limiter.limit(key);
      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", reset);
      if (!success) {
        res.status(429).json({
          error: "Too many requests",
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        });
        return;
      }
    } catch {
      // Redis error — allow the request rather than blocking all users
    }
    return next();
  };
}

/** Pre-configured limiters for common routes. */
export const rateLimiters = {
  /** Auth endpoints: 30 requests per 15 minutes per IP */
  auth: redisRateLimit(30, "15 m", "rl:auth"),
  /** Delete account: 5 per hour per IP */
  deleteAccount: redisRateLimit(5, "1 h", "rl:delete-account"),
  /** General API: 300 requests per minute per IP */
  api: redisRateLimit(300, "1 m", "rl:api"),
  /** AI/expensive endpoints: 20 per 10 minutes per IP */
  ai: redisRateLimit(20, "10 m", "rl:ai"),
};
