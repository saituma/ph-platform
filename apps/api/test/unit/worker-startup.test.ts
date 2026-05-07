const originalEnv = { ...process.env };

describe("worker startup", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.REDIS_URL;
    delete process.env.DISABLE_REDIS;
    delete process.env.APP_ENV;
    delete process.env.HEROKU_ENV;
    jest.doMock("../../src/jobs", () => ({
      isQueueEnabled: () => false,
      isStrictQueueEnvironment: () => true,
      startEmailWorker: jest.fn(),
      startOutboxWorker: jest.fn(),
      startPushWorker: jest.fn(),
      startScheduledWorker: jest.fn(),
      stopEmailWorker: jest.fn(),
      stopOutboxWorker: jest.fn(),
      stopPushWorker: jest.fn(),
      stopScheduledWorker: jest.fn(),
    }));
    jest.doMock("../../src/db", () => ({ pool: { end: jest.fn() } }));
    jest.doMock("../../src/jobs/connection", () => ({ getRedisConnection: () => null }));
    jest.doMock("../../src/lib/logger", () => ({
      logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      },
    }));
  });

  afterEach(() => {
    jest.dontMock("../../src/jobs");
    jest.dontMock("../../src/db");
    jest.dontMock("../../src/jobs/connection");
    jest.dontMock("../../src/lib/logger");
    process.env = { ...originalEnv };
  });

  it("fails clearly in production when REDIS_URL is missing", async () => {
    process.env.NODE_ENV = "production";
    const { startWorkerProcess } = await import("../../src/worker");

    await expect(startWorkerProcess()).rejects.toThrow(
      "REDIS_URL is required for the worker process in production/staging",
    );
  });
});

export {};
