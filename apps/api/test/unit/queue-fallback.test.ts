const originalEnv = { ...process.env };

async function loadPushQueue() {
  jest.resetModules();
  const sendPushNotification = jest.fn(async () => undefined);
  jest.doMock("../../src/services/push.service", () => ({ sendPushNotification }));
  jest.doMock("../../src/lib/logger", () => ({
    logger: {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    },
    createLogger: () => ({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    }),
  }));
  const { pushQueue } = await import("../../src/jobs/push.queue");
  return { pushQueue, sendPushNotification };
}

async function loadEmailQueue() {
  jest.resetModules();
  const deliverEmail = jest.fn(async () => undefined);
  jest.doMock("../../src/lib/mailer/base.mailer", () => ({ deliverEmail }));
  jest.doMock("../../src/lib/logger", () => ({
    logger: {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    },
    createLogger: () => ({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    }),
  }));
  const { emailQueue } = await import("../../src/jobs/email.queue");
  return { emailQueue, deliverEmail };
}

describe("queue fallback behavior", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.REDIS_URL;
    delete process.env.ENABLE_SYNC_QUEUE_FALLBACK;
    delete process.env.DISABLE_REDIS;
    delete process.env.APP_ENV;
    delete process.env.HEROKU_ENV;
  });

  afterEach(() => {
    jest.dontMock("../../src/services/push.service");
    jest.dontMock("../../src/lib/mailer/base.mailer");
    jest.dontMock("../../src/lib/logger");
    process.env = { ...originalEnv };
  });

  it("does not sync-send push in production when REDIS_URL is missing", async () => {
    process.env.NODE_ENV = "production";
    const { pushQueue, sendPushNotification } = await loadPushQueue();

    await expect(
      pushQueue.enqueue({
        userId: 1,
        title: "Title",
        body: "Body",
      }),
    ).rejects.toThrow(/push-notifications.*redis_missing/);
    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it("does not sync-send email in production when REDIS_URL is missing", async () => {
    process.env.NODE_ENV = "production";
    const { emailQueue, deliverEmail } = await loadEmailQueue();

    await expect(
      emailQueue.enqueue({
        to: "test@example.com",
        subject: "Subject",
        html: "<p>Body</p>",
      }),
    ).rejects.toThrow(/emails.*redis_missing/);
    expect(deliverEmail).not.toHaveBeenCalled();
  });

  it("allows explicit sync fallback only outside strict environments", async () => {
    process.env.NODE_ENV = "test";
    process.env.ENABLE_SYNC_QUEUE_FALLBACK = "true";
    const { pushQueue, sendPushNotification } = await loadPushQueue();

    await expect(
      pushQueue.enqueue({
        userId: 1,
        title: "Title",
        body: "Body",
      }),
    ).resolves.toBeUndefined();
    expect(sendPushNotification).toHaveBeenCalledWith(1, "Title", "Body", undefined);
  });

  it("does not allow explicit sync fallback in staging", async () => {
    process.env.NODE_ENV = "test";
    process.env.APP_ENV = "staging";
    process.env.ENABLE_SYNC_QUEUE_FALLBACK = "true";
    const { pushQueue, sendPushNotification } = await loadPushQueue();

    await expect(
      pushQueue.enqueue({
        userId: 1,
        title: "Title",
        body: "Body",
      }),
    ).rejects.toThrow(/push-notifications.*redis_missing/);
    expect(sendPushNotification).not.toHaveBeenCalled();
  });
});

export {};
