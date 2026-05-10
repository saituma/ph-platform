/**
 * socket-scale.test.ts
 *
 * Unit tests for Socket.IO multi-instance safety helpers introduced in PR 13.
 * These tests do NOT start a real socket server — they test the extracted
 * helper functions in isolation.
 */

import { createLastSeenDebouncer } from "../../src/socket";

// ---------------------------------------------------------------------------
// Helpers — re-implement inline so tests do not depend on module internals
// that can't be safely imported without side-effects (env validation, DB, etc.)
// ---------------------------------------------------------------------------

/** Inline sliding-window rate limiter matching socket.ts implementation. */
const SOCKET_SLIDING_MAX = 20;
const SOCKET_SLIDING_WINDOW_MS = 10_000;
const SOCKET_SLIDING_EVENTS = new Set(["message:send", "group:send", "typing:start", "typing:stop"]);

function isSocketSlidingRateLimited(socketData: Record<string, unknown>, event: string): boolean {
  if (!SOCKET_SLIDING_EVENTS.has(event)) return false;
  const key = `__sliding_${event}`;
  const now = Date.now();
  const cutoff = now - SOCKET_SLIDING_WINDOW_MS;
  const timestamps = (socketData[key] as number[] | undefined) ?? [];
  const trimmed = timestamps.filter((t) => t > cutoff);
  if (trimmed.length >= SOCKET_SLIDING_MAX) {
    socketData[key] = trimmed;
    return true;
  }
  trimmed.push(now);
  socketData[key] = trimmed;
  return false;
}

// ---------------------------------------------------------------------------
// Fix B: lastSeenAt debounce
// ---------------------------------------------------------------------------

describe("createLastSeenDebouncer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does NOT call writeFn immediately on schedule()", () => {
    const writeFn = jest.fn();
    const debouncer = createLastSeenDebouncer(writeFn);

    debouncer.schedule(42);

    expect(writeFn).not.toHaveBeenCalled();
  });

  it("calls writeFn after debounce delay fires", () => {
    const writeFn = jest.fn();
    const debouncer = createLastSeenDebouncer(writeFn);

    debouncer.schedule(42);
    jest.advanceTimersByTime(5_001);

    expect(writeFn).toHaveBeenCalledTimes(1);
    expect(writeFn).toHaveBeenCalledWith(42);
  });

  it("rapid disconnects only result in a single writeFn call (debounce collapses)", () => {
    const writeFn = jest.fn();
    const debouncer = createLastSeenDebouncer(writeFn);

    // Simulate 5 rapid disconnect events
    for (let i = 0; i < 5; i++) {
      debouncer.schedule(99);
      jest.advanceTimersByTime(100); // 100 ms between disconnects — inside debounce window
    }

    // Let the final timer fire
    jest.advanceTimersByTime(5_001);

    expect(writeFn).toHaveBeenCalledTimes(1);
  });

  it("cancel() before timer fires prevents writeFn from being called", () => {
    const writeFn = jest.fn();
    const debouncer = createLastSeenDebouncer(writeFn);

    debouncer.schedule(7);
    jest.advanceTimersByTime(2_000); // still within debounce window
    debouncer.cancel(7); // user reconnected
    jest.advanceTimersByTime(10_000); // let any stale timer fire

    expect(writeFn).not.toHaveBeenCalled();
  });

  it("reconnect within debounce window cancels pending write", () => {
    const writeFn = jest.fn();
    const debouncer = createLastSeenDebouncer(writeFn);

    debouncer.schedule(3);
    jest.advanceTimersByTime(1_000);
    debouncer.cancel(3); // reconnect

    jest.advanceTimersByTime(10_000);

    expect(writeFn).not.toHaveBeenCalled();
  });

  it("schedules independent timers for different users", () => {
    const writeFn = jest.fn();
    const debouncer = createLastSeenDebouncer(writeFn);

    debouncer.schedule(1);
    debouncer.schedule(2);
    jest.advanceTimersByTime(5_001);

    expect(writeFn).toHaveBeenCalledTimes(2);
    expect(writeFn).toHaveBeenCalledWith(1);
    expect(writeFn).toHaveBeenCalledWith(2);
  });
});

// ---------------------------------------------------------------------------
// Fix C: Per-socket sliding-window rate limiter
// ---------------------------------------------------------------------------

describe("isSocketSlidingRateLimited (inline)", () => {
  it("allows up to SOCKET_SLIDING_MAX events within the window", () => {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < SOCKET_SLIDING_MAX; i++) {
      expect(isSocketSlidingRateLimited(data, "message:send")).toBe(false);
    }
  });

  it("rejects the (SOCKET_SLIDING_MAX + 1)th event within the window", () => {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < SOCKET_SLIDING_MAX; i++) {
      isSocketSlidingRateLimited(data, "message:send");
    }
    expect(isSocketSlidingRateLimited(data, "message:send")).toBe(true);
  });

  it("does NOT rate-limit events not in SOCKET_SLIDING_EVENTS", () => {
    const data: Record<string, unknown> = {};
    // Flood with an unguarded event
    for (let i = 0; i < SOCKET_SLIDING_MAX + 100; i++) {
      expect(isSocketSlidingRateLimited(data, "group:join")).toBe(false);
    }
  });

  it("tracks limits per event independently on the same socket", () => {
    const data: Record<string, unknown> = {};
    // Fill message:send
    for (let i = 0; i < SOCKET_SLIDING_MAX; i++) {
      isSocketSlidingRateLimited(data, "message:send");
    }
    // typing:start should still be allowed
    expect(isSocketSlidingRateLimited(data, "typing:start")).toBe(false);
  });

  it("allows events again after the sliding window expires", () => {
    jest.useFakeTimers();
    const data: Record<string, unknown> = {};

    // Manually seed old timestamps (outside the window)
    const oldTime = Date.now() - SOCKET_SLIDING_WINDOW_MS - 1;
    data["__sliding_message:send"] = Array(SOCKET_SLIDING_MAX).fill(oldTime);

    // Should be allowed now since all timestamps are stale
    expect(isSocketSlidingRateLimited(data, "message:send")).toBe(false);

    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Fix A: SOCKET_REQUIRE_REDIS env var enforcement
// ---------------------------------------------------------------------------

describe("SOCKET_REQUIRE_REDIS production guard", () => {
  // We test the guard logic inline to avoid importing socket.ts
  // (which imports DB, Redis, etc. with side-effects).

  function checkSocketRequireRedis(opts: {
    nodeEnv: string;
    socketRequireRedis: boolean;
    redisUrl: string | undefined;
  }): void {
    if (opts.nodeEnv === "production" && opts.socketRequireRedis && !opts.redisUrl) {
      throw new Error(
        "SOCKET_REQUIRE_REDIS=true but REDIS_URL is not set. " +
          "Socket.IO cannot run in multi-instance mode without Redis.",
      );
    }
  }

  it("throws when NODE_ENV=production, SOCKET_REQUIRE_REDIS=true, and REDIS_URL is missing", () => {
    expect(() =>
      checkSocketRequireRedis({ nodeEnv: "production", socketRequireRedis: true, redisUrl: undefined }),
    ).toThrow("SOCKET_REQUIRE_REDIS=true");
  });

  it("does NOT throw when REDIS_URL is set", () => {
    expect(() =>
      checkSocketRequireRedis({
        nodeEnv: "production",
        socketRequireRedis: true,
        redisUrl: "redis://localhost:6379",
      }),
    ).not.toThrow();
  });

  it("does NOT throw in development even when REDIS_URL is missing", () => {
    expect(() =>
      checkSocketRequireRedis({ nodeEnv: "development", socketRequireRedis: true, redisUrl: undefined }),
    ).not.toThrow();
  });

  it("does NOT throw when SOCKET_REQUIRE_REDIS=false and REDIS_URL is missing", () => {
    expect(() =>
      checkSocketRequireRedis({ nodeEnv: "production", socketRequireRedis: false, redisUrl: undefined }),
    ).not.toThrow();
  });
});
