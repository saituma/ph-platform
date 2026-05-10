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
    process.env.JWT_SECRET = "test-secret";
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

  test("createSocketToken issues a JWT with 60s expiry and socket purpose", async () => {
    process.env.JWT_SECRET = "test-secret-at-least-32-chars-long!";
    const { createSocketToken, verifyAccessToken } = await import("../../src/lib/jwt");

    const before = Math.floor(Date.now() / 1000);
    const token = await createSocketToken(42, "coach");
    const payload = await verifyAccessToken(token);

    expect(payload.user_id).toBe(42);
    expect(payload.role).toBe("coach");
    expect(payload.purpose).toBe("socket");
    const exp = payload.exp as number;
    expect(exp).toBeGreaterThanOrEqual(before + 55);
    expect(exp).toBeLessThanOrEqual(before + 65);
  });

  test("verifyAccessToken rejects tokens signed with the wrong secret", async () => {
    process.env.JWT_SECRET = "secret-a";
    const token = await makeToken("secret-a");

    jest.resetModules();
    process.env.AUTH_MODE = "local";
    process.env.JWT_SECRET = "secret-b";

    const { verifyAccessToken } = await import("../../src/lib/jwt");

    await expect(verifyAccessToken(token)).rejects.toThrow();
  });
});
