import { SignJWT } from "jose";

const makeToken = async (secret: string) => {
  const signer = new SignJWT({ sub: "user-1", user_id: 123, token_version: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt();
  return signer.sign(new TextEncoder().encode(secret));
};

describe("jwt local mode", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.AUTH_MODE = "local";
    process.env.ALLOW_EXPIRED_TOKENS = "false";
  });

  test("verifyAccessToken accepts a valid local token", async () => {
    process.env.LOCAL_JWT_SECRET = "test-secret";
    const { createLocalToken, verifyAccessToken } = await import("../../src/lib/jwt");

    const token = await createLocalToken({
      sub: "local:123",
      email: "test@example.com",
      name: "Test User",
      role: "guardian",
      userId: 123,
      tokenVersion: 1,
    });

    const payload = await verifyAccessToken(token);
    expect(payload.sub).toBe("local:123");
    expect(payload.user_id).toBe(123);
  });

  test("verifyAccessToken rejects tokens signed with the wrong secret", async () => {
    process.env.LOCAL_JWT_SECRET = "secret-a";
    const token = await makeToken("secret-a");

    jest.resetModules();
    process.env.AUTH_MODE = "local";
    process.env.LOCAL_JWT_SECRET = "secret-b";

    const { verifyAccessToken } = await import("../../src/lib/jwt");

    await expect(verifyAccessToken(token)).rejects.toThrow();
  });
});
