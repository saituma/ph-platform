/**
 * Per-socket, per-event token bucket.
 *
 * Socket events had NO rate limiting at all — `message:send`, `typing:start` and
 * `message:read` were floodable by any authenticated client, straight into Postgres
 * on a 5-connection pool. (The comment above `guarded()` claimed otherwise, and
 * test/unit/socket-scale.test.ts "tested" a limiter it defined inside the test file.)
 *
 * ponytail: in-memory Map, not Redis. The app runs on a single dyno, so per-process
 * state IS the correct scope here — and it costs zero network round-trips on the hot
 * send path. If a second socket-carrying dyno ever appears, a client could get N×
 * the budget by spreading across instances; move to a Redis bucket then.
 */

export type RateLimitRule = {
  /** Bucket size — the largest instantaneous burst allowed. */
  burst: number;
  /** Sustained refill rate. */
  perSecond: number;
};

/**
 * Budgets are generous enough that no human hits them and tight enough that a loop does.
 * `message:delivered` is highest because a client legitimately fires one per message when
 * it comes back online with a backlog.
 */
const RULES: Record<string, RateLimitRule> = {
  "message:send": { burst: 20, perSecond: 5 },
  "group:send": { burst: 20, perSecond: 5 },
  "message:delivered": { burst: 60, perSecond: 20 },
  "message:read": { burst: 10, perSecond: 5 },
  "typing:start": { burst: 5, perSecond: 2 },
  "typing:stop": { burst: 5, perSecond: 2 },
  "thread:focus": { burst: 10, perSecond: 5 },
  "group:join": { burst: 20, perSecond: 5 },
  "group:leave": { burst: 20, perSecond: 5 },
  "acting:join": { burst: 5, perSecond: 1 },
};

const DEFAULT_RULE: RateLimitRule = { burst: 20, perSecond: 10 };

type Bucket = { tokens: number; lastRefillMs: number };

export class SocketRateLimiter {
  // socketId -> event -> bucket. Nested so release() on disconnect is O(events), not
  // a scan of every bucket on the server.
  private readonly sockets = new Map<string, Map<string, Bucket>>();

  /** Spends one token. Returns false when the bucket is empty — caller should drop the event. */
  consume(socketId: string, event: string, nowMs: number = Date.now()): boolean {
    const rule = RULES[event] ?? DEFAULT_RULE;

    let events = this.sockets.get(socketId);
    if (!events) {
      events = new Map();
      this.sockets.set(socketId, events);
    }

    const bucket = events.get(event);
    if (!bucket) {
      events.set(event, { tokens: rule.burst - 1, lastRefillMs: nowMs });
      return true;
    }

    const elapsedSec = Math.max(0, nowMs - bucket.lastRefillMs) / 1000;
    bucket.tokens = Math.min(rule.burst, bucket.tokens + elapsedSec * rule.perSecond);
    bucket.lastRefillMs = nowMs;

    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }

  /** Drop a disconnected socket's buckets. Without this the map grows for the process lifetime. */
  release(socketId: string): void {
    this.sockets.delete(socketId);
  }

  /** Number of sockets currently holding buckets. Exposed for the leak test. */
  get trackedSockets(): number {
    return this.sockets.size;
  }
}
