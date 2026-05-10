import type { NextFunction, Request, Response } from "express";

describe("rate limiter production behavior", () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock("../../src/config/env");
  });

  it("throws before creating a memory-only limiter in production", async () => {
    jest.doMock("../../src/config/env", () => ({
      env: {
        nodeEnv: "production",
        upstashRedisRestUrl: "",
        upstashRedisRestToken: "",
      },
    }));

    await expect(import("../../src/lib/rateLimiter")).rejects.toThrow(
      /Distributed rate limiting is required in production/,
    );
  });

  it("keeps the in-memory fallback outside production", async () => {
    jest.doMock("../../src/config/env", () => ({
      env: {
        nodeEnv: "test",
        upstashRedisRestUrl: "",
        upstashRedisRestToken: "",
      },
    }));

    const { redisRateLimit } = await import("../../src/lib/rateLimiter");
    const middleware = redisRateLimit(1, "1 m", "test");
    const req = {
      headers: {},
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
    } as Request;
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

export {};
