/**
 * db-config.test.ts
 *
 * Tests env-var parsing for database pool configuration.
 * Does NOT connect to a database — all assertions are against
 * the parsed config values exported by src/config/env.ts.
 */

const originalEnv = { ...process.env };

/** Minimal env that satisfies env.ts validation in non-production mode. */
function baseEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    DOTENV_PATH: "/tmp/ph-app-test-missing-env-file",
    DATABASE_URL: "postgres://user:pass@localhost:5432/testdb",
    JWT_SECRET: "test-jwt-secret",
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_SUCCESS_URL: "http://localhost/success",
    STRIPE_CANCEL_URL: "http://localhost/cancel",
    ADMIN_WEB_URL: "http://localhost:3000",
    ...overrides,
  };
}

/** Minimal env that satisfies env.ts validation in production mode. */
function productionEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return baseEnv({
    NODE_ENV: "production",
    STRIPE_WEBHOOK_SECRET: "whsec_live_test",
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "redis-token",
    ...overrides,
  });
}

describe("DB pool env-var parsing", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = baseEnv();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // -------------------------------------------------------------------------
  // DB_POOL_MAX
  // -------------------------------------------------------------------------

  it("parses DB_POOL_MAX as an integer when explicitly set", async () => {
    process.env = baseEnv({ DB_POOL_MAX: "15" });
    const { env } = await import("../../src/config/env");
    expect(env.dbPoolMax).toBe(15);
  });

  it("defaults DB_POOL_MAX to 10 in dev/test when not set", async () => {
    process.env = baseEnv(); // NODE_ENV=test, no DB_POOL_MAX
    const { env } = await import("../../src/config/env");
    expect(env.dbPoolMax).toBe(10);
  });

  it("defaults DB_POOL_MAX to 5 in production when not set", async () => {
    process.env = productionEnv(); // NODE_ENV=production, no DB_POOL_MAX
    const { env } = await import("../../src/config/env");
    expect(env.dbPoolMax).toBe(5);
  });

  it("respects an explicit DB_POOL_MAX in production", async () => {
    process.env = productionEnv({ DB_POOL_MAX: "8" });
    const { env } = await import("../../src/config/env");
    expect(env.dbPoolMax).toBe(8);
  });

  // -------------------------------------------------------------------------
  // DB_IDLE_TIMEOUT_MS
  // -------------------------------------------------------------------------

  it("defaults DB_IDLE_TIMEOUT_MS to 30000 ms when not set", async () => {
    const { env } = await import("../../src/config/env");
    expect(env.dbIdleTimeoutMs).toBe(30_000);
  });

  it("parses DB_IDLE_TIMEOUT_MS as an integer when explicitly set", async () => {
    process.env = baseEnv({ DB_IDLE_TIMEOUT_MS: "60000" });
    const { env } = await import("../../src/config/env");
    expect(env.dbIdleTimeoutMs).toBe(60_000);
  });

  // -------------------------------------------------------------------------
  // DB_CONNECT_TIMEOUT_MS
  // -------------------------------------------------------------------------

  it("defaults DB_CONNECT_TIMEOUT_MS to 10000 ms when not set", async () => {
    const { env } = await import("../../src/config/env");
    expect(env.dbConnectTimeoutMs).toBe(10_000);
  });

  it("parses DB_CONNECT_TIMEOUT_MS as an integer when explicitly set", async () => {
    process.env = baseEnv({ DB_CONNECT_TIMEOUT_MS: "5000" });
    const { env } = await import("../../src/config/env");
    expect(env.dbConnectTimeoutMs).toBe(5_000);
  });

  // -------------------------------------------------------------------------
  // DIRECT_DATABASE_URL
  // -------------------------------------------------------------------------

  it("falls back to DATABASE_URL when DIRECT_DATABASE_URL is not set", async () => {
    process.env = baseEnv(); // no DIRECT_DATABASE_URL
    const { env } = await import("../../src/config/env");
    expect(env.directDatabaseUrl).toBe("postgres://user:pass@localhost:5432/testdb");
  });

  it("prefers DIRECT_DATABASE_URL over DATABASE_URL when both are set", async () => {
    process.env = baseEnv({
      DATABASE_URL: "postgres://user:pass@pooler.example.com:5432/db",
      DIRECT_DATABASE_URL: "postgres://user:pass@direct.example.com:5432/db",
    });
    const { env } = await import("../../src/config/env");
    expect(env.directDatabaseUrl).toBe("postgres://user:pass@direct.example.com:5432/db");
    expect(env.databaseUrl).toBe("postgres://user:pass@pooler.example.com:5432/db");
  });
});

export {};
