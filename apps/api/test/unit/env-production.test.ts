const originalEnv = { ...process.env };

function productionEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    DOTENV_PATH: "/tmp/ph-app-test-missing-env-file",
    DATABASE_URL: "postgres://user:pass@example.com:5432/db",
    JWT_SECRET: "test-jwt-secret",
    STRIPE_SECRET_KEY: "sk_live_test",
    STRIPE_SUCCESS_URL: "https://admin.example.com/success",
    STRIPE_CANCEL_URL: "https://admin.example.com/cancel",
    STRIPE_WEBHOOK_SECRET: "whsec_live_test",
    ADMIN_WEB_URL: "https://admin.example.com",
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "redis-token",
    ...overrides,
  };
}

describe("production environment validation", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = productionEnv();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("loads when all production-critical config is present", async () => {
    const { env } = await import("../../src/config/env");

    expect(env.nodeEnv).toBe("production");
    expect(env.upstashRedisRestUrl).toBe("https://redis.example.com");
  });

  it("fails closed when Stripe webhook secret is missing in production", async () => {
    process.env = productionEnv({ STRIPE_WEBHOOK_SECRET: "" });

    await expect(import("../../src/config/env")).rejects.toThrow(/STRIPE_WEBHOOK_SECRET is required in production/);
  });

  it("fails closed when distributed rate-limit config is missing in production", async () => {
    process.env = productionEnv({ UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "" });

    await expect(import("../../src/config/env")).rejects.toThrow(/UPSTASH_REDIS_REST_URL is required in production/);
  });

  it("keeps non-production Redis fallback allowed", async () => {
    process.env = {
      NODE_ENV: "test",
      DOTENV_PATH: "/tmp/ph-app-test-missing-env-file",
      DATABASE_URL: "postgres://user:pass@example.com:5432/db",
      JWT_SECRET: "test-jwt-secret",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_SUCCESS_URL: "http://localhost/success",
      STRIPE_CANCEL_URL: "http://localhost/cancel",
      ADMIN_WEB_URL: "http://localhost:3000",
    };

    const { env } = await import("../../src/config/env");

    expect(env.nodeEnv).toBe("test");
    expect(env.upstashRedisRestUrl).toBe("");
  });
});

export {};
