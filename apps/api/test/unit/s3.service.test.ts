describe("s3.service - getPublicObjectUrl", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("uses CloudFront domain when configured", async () => {
    process.env.S3_BUCKET = "private-bucket";
    process.env.AWS_REGION = "us-east-1";
    process.env.CLOUDFRONT_DOMAIN = "d111111abcdef8.cloudfront.net";

    const mod = await import("../../src/services/s3.service");
    const url = mod.getPublicObjectUrl("profile-pictures/2026/04/123.jpg");

    expect(url).toBe(
      "https://d111111abcdef8.cloudfront.net/profile-pictures/2026/04/123.jpg",
    );
  });

  test("uses CloudFront domain even if key has leading slash", async () => {
    process.env.S3_BUCKET = "private-bucket";
    process.env.AWS_REGION = "us-east-1";
    process.env.CLOUDFRONT_DOMAIN = "https://cdn.example.com/";

    const mod = await import("../../src/services/s3.service");
    const url = mod.getPublicObjectUrl("/a/b/c.png");

    expect(url).toBe("https://cdn.example.com/a/b/c.png");
  });

  test("falls back to S3 URL when CloudFront not configured", async () => {
    process.env.S3_BUCKET = "my-bucket";
    process.env.AWS_REGION = "us-west-2";
    delete process.env.CLOUDFRONT_DOMAIN;

    const mod = await import("../../src/services/s3.service");
    const url = mod.getPublicObjectUrl("/x/y/z.webp");

    expect(url).toBe("https://my-bucket.s3.us-west-2.amazonaws.com/x/y/z.webp");
  });

  test("rewrites stored S3 URLs to CloudFront when configured", async () => {
    process.env.S3_BUCKET = "my-bucket";
    process.env.AWS_REGION = "us-west-2";
    process.env.CLOUDFRONT_DOMAIN = "cdn.example.com";

    const mod = await import("../../src/services/s3.service");
    const url = mod.normalizeStoredMediaUrl(
      "https://my-bucket.s3.us-west-2.amazonaws.com/profile-pictures/2026/04/a.jpg",
    );

    expect(url).toBe(
      "https://cdn.example.com/profile-pictures/2026/04/a.jpg",
    );
  });

  test("keeps non-S3 URLs unchanged", async () => {
    process.env.S3_BUCKET = "my-bucket";
    process.env.AWS_REGION = "us-west-2";
    process.env.CLOUDFRONT_DOMAIN = "cdn.example.com";

    const mod = await import("../../src/services/s3.service");
    const url = mod.normalizeStoredMediaUrl("https://example.org/img.png");

    expect(url).toBe("https://example.org/img.png");
  });
});
