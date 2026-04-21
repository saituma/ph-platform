describe("s3.service - getPublicObjectUrl", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://u:p@localhost:5432/db";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-test-secret-test-secret";
    process.env.ADMIN_WEB_URL = process.env.ADMIN_WEB_URL || "http://localhost:3000";
    process.env.OPEN_AI_API_KEY = process.env.OPEN_AI_API_KEY || "sk-test";
    process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test";
    process.env.STRIPE_SUCCESS_URL = process.env.STRIPE_SUCCESS_URL || "http://localhost/success";
    process.env.STRIPE_CANCEL_URL = process.env.STRIPE_CANCEL_URL || "http://localhost/cancel";
    process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test";
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test("uses MEDIA_PUBLIC_BASE_URL when set", async () => {
    process.env.R2_BUCKET = "private-bucket";
    process.env.R2_ACCOUNT_ID = "abc";
    process.env.MEDIA_PUBLIC_BASE_URL = "https://cdn.example.com/";
    const mod = await import("../../src/services/s3.service");
    const url = mod.getPublicObjectUrl("profile-pictures/2026/04/123.jpg");
    expect(url).toBe("https://cdn.example.com/profile-pictures/2026/04/123.jpg");
  });

  test("strips trailing slash from MEDIA_PUBLIC_BASE_URL", async () => {
    process.env.R2_BUCKET = "private-bucket";
    process.env.R2_ACCOUNT_ID = "abc";
    process.env.MEDIA_PUBLIC_BASE_URL = "https://cdn.example.com///";
    const mod = await import("../../src/services/s3.service");
    const url = mod.getPublicObjectUrl("x/y/z.webp");
    expect(url).toBe("https://cdn.example.com/x/y/z.webp");
  });

  test("throws when public base URL is not configured", async () => {
    process.env.R2_BUCKET = "my-bucket";
    process.env.R2_ACCOUNT_ID = "acc";
    delete process.env.MEDIA_PUBLIC_BASE_URL;
    delete process.env.R2_PUBLIC_BASE_URL;
    const mod = await import("../../src/services/s3.service");
    expect(() => mod.getPublicObjectUrl("x/y/z.webp")).toThrow(/MEDIA_PUBLIC_BASE_URL/);
  });

  test("rewrites stored legacy S3 URLs when MEDIA_PUBLIC_BASE_URL is configured", async () => {
    process.env.R2_BUCKET = "my-bucket";
    process.env.R2_ACCOUNT_ID = "acc";
    process.env.R2_REGION = "us-west-2";
    process.env.MEDIA_PUBLIC_BASE_URL = "cdn.example.com";
    const mod = await import("../../src/services/s3.service");
    const url = mod.normalizeStoredMediaUrl(
      "https://my-bucket.s3.us-west-2.amazonaws.com/profile-pictures/2026/04/a.jpg",
    );
    expect(url).toBe("https://cdn.example.com/profile-pictures/2026/04/a.jpg");
  });

  test("keeps unrelated URLs unchanged", async () => {
    process.env.R2_BUCKET = "my-bucket";
    process.env.R2_ACCOUNT_ID = "acc";
    process.env.MEDIA_PUBLIC_BASE_URL = "cdn.example.com";
    const mod = await import("../../src/services/s3.service");
    const url = mod.normalizeStoredMediaUrl("https://other.example.com/file.png");
    expect(url).toBe("https://other.example.com/file.png");
  });
});
