import { SocketRateLimiter } from "../../src/lib/socket-rate-limit";

// Time is injected rather than mocked so refill behaviour is exact and the tests
// don't depend on wall-clock timing.
describe("SocketRateLimiter", () => {
  const T0 = 1_700_000_000_000;

  test("allows the full burst, then drops the next event", () => {
    const limiter = new SocketRateLimiter();
    // message:send is burst 20.
    for (let i = 0; i < 20; i++) {
      expect(limiter.consume("sock-1", "message:send", T0)).toBe(true);
    }
    expect(limiter.consume("sock-1", "message:send", T0)).toBe(false);
  });

  test("a 100-event flood in one instant gets 20 through and drops 80", () => {
    const limiter = new SocketRateLimiter();
    let allowed = 0;
    for (let i = 0; i < 100; i++) {
      if (limiter.consume("sock-1", "message:send", T0)) allowed++;
    }
    expect(allowed).toBe(20);
  });

  test("refills at the sustained rate", () => {
    const limiter = new SocketRateLimiter();
    for (let i = 0; i < 20; i++) limiter.consume("sock-1", "message:send", T0);
    expect(limiter.consume("sock-1", "message:send", T0)).toBe(false);

    // message:send refills at 5/sec — one second buys exactly 5 more.
    let allowed = 0;
    for (let i = 0; i < 10; i++) {
      if (limiter.consume("sock-1", "message:send", T0 + 1_000)) allowed++;
    }
    expect(allowed).toBe(5);
  });

  test("never refills beyond the burst ceiling, however long it idles", () => {
    const limiter = new SocketRateLimiter();
    limiter.consume("sock-1", "message:send", T0);

    // An hour idle must not grant an unbounded burst.
    let allowed = 0;
    for (let i = 0; i < 100; i++) {
      if (limiter.consume("sock-1", "message:send", T0 + 3_600_000)) allowed++;
    }
    expect(allowed).toBe(20);
  });

  test("budgets are per-event — exhausting message:send leaves typing:start alone", () => {
    const limiter = new SocketRateLimiter();
    for (let i = 0; i < 25; i++) limiter.consume("sock-1", "message:send", T0);

    expect(limiter.consume("sock-1", "message:send", T0)).toBe(false);
    expect(limiter.consume("sock-1", "typing:start", T0)).toBe(true);
  });

  test("budgets are per-socket — one flooding client cannot starve another", () => {
    const limiter = new SocketRateLimiter();
    for (let i = 0; i < 25; i++) limiter.consume("flooder", "message:send", T0);

    expect(limiter.consume("flooder", "message:send", T0)).toBe(false);
    expect(limiter.consume("innocent", "message:send", T0)).toBe(true);
  });

  test("unknown events still get a default budget rather than unlimited access", () => {
    const limiter = new SocketRateLimiter();
    let allowed = 0;
    for (let i = 0; i < 100; i++) {
      if (limiter.consume("sock-1", "some:new:event", T0)) allowed++;
    }
    expect(allowed).toBe(20); // DEFAULT_RULE burst
  });

  test("release() frees a disconnected socket's buckets — no unbounded growth", () => {
    const limiter = new SocketRateLimiter();
    for (let i = 0; i < 500; i++) {
      limiter.consume(`sock-${i}`, "message:send", T0);
    }
    expect(limiter.trackedSockets).toBe(500);

    for (let i = 0; i < 500; i++) limiter.release(`sock-${i}`);
    expect(limiter.trackedSockets).toBe(0);
  });
});
