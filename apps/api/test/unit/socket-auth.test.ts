import type { Request, Response } from "express";

// ── Mocks ──────────────────────────────────────────────────────────────────

const createSocketToken = jest.fn();

jest.mock("../../src/lib/jwt", () => ({
  createSocketToken: (...args: any[]) => createSocketToken(...args),
  verifyAccessToken: jest.fn(),
  createLocalToken: jest.fn(),
  decodeAccessToken: jest.fn(),
}));

// uuid is an ESM package; mock it to avoid Jest transform errors.
jest.mock("uuid", () => ({ v4: () => "mock-uuid" }));
// auth.controller.ts imports auth.service which imports uuid (ESM). Mock all heavy deps.
jest.mock("../../src/services/auth.service", () => ({}));
jest.mock("../../src/services/account-deletion.service", () => ({}));
jest.mock("../../src/services/s3.service", () => ({
  normalizeStoredMediaUrl: (x: string | null) => x,
}));
jest.mock("../../src/services/user.service", () => ({
  getUserById: jest.fn(),
  updateUserProfile: jest.fn(),
  getUserByCognitoSub: jest.fn(),
}));
jest.mock("../../src/services/onboarding.service", () => ({}));
jest.mock("../../src/services/messaging-policy.service", () => ({}));
jest.mock("../../src/services/app-capabilities.service", () => ({}));
jest.mock("../../src/services/billing/feature-access.service", () => ({}));
jest.mock("../../src/db", () => ({ db: {} }));
jest.mock("../../src/db/schema", () => {
  // Return proxy objects so module-level Drizzle column refs don't throw
  function makeTable() {
    const col = {};
    return new Proxy(col, { get: () => col });
  }
  return {
    teamTable: makeTable(),
    userTable: makeTable(),
    subscriptionPlanTable: makeTable(),
    teamSubscriptionRequestTable: makeTable(),
    ProgramType: { enumValues: [] },
  };
});
jest.mock("../../src/lib/cache", () => ({
  cache: {
    getOrSet: (_k: string, _t: number, f: () => unknown) => f(),
    del: jest.fn(),
  },
  cacheKeys: { authUser: (id: number) => `u:${id}`, userProfile: (id: number) => `p:${id}` },
}));
jest.mock("../../src/lib/user-roles", () => ({ isTrainingStaff: () => false }));
jest.mock("../../src/lib/logger", () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

// ── issueSocketToken controller ────────────────────────────────────────────

describe("issueSocketToken", () => {
  beforeEach(() => {
    createSocketToken.mockReset();
  });

  function makeReq(userId: number, role: string): Request {
    return { user: { id: userId, role } } as unknown as Request;
  }

  function makeRes() {
    return { json: jest.fn() } as unknown as Response;
  }

  it("returns a short-lived token and expiresAt", async () => {
    createSocketToken.mockResolvedValue("short.lived.jwt");
    const { issueSocketToken } = await import("../../src/controllers/auth.controller");

    const res = makeRes();
    await issueSocketToken(makeReq(42, "athlete"), res);

    expect(createSocketToken).toHaveBeenCalledWith(42, "athlete");
    const arg = (res.json as jest.Mock).mock.calls[0][0] as { token: string; expiresAt: number };
    expect(arg.token).toBe("short.lived.jwt");
    const now = Math.floor(Date.now() / 1000);
    expect(arg.expiresAt).toBeGreaterThanOrEqual(now + 55);
    expect(arg.expiresAt).toBeLessThanOrEqual(now + 65);
  });

  it("forwards userId and role to createSocketToken", async () => {
    createSocketToken.mockResolvedValue("admin.socket.jwt");
    const { issueSocketToken } = await import("../../src/controllers/auth.controller");

    await issueSocketToken(makeReq(1, "admin"), makeRes());
    expect(createSocketToken).toHaveBeenCalledWith(1, "admin");
  });
});

// ── Socket cookie token extraction ────────────────────────────────────────
// Mirrors the logic in socket.ts middleware, tested in isolation.

function extractCookieToken(cookieHeader: string): string | undefined {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find(
      (part) =>
        part.startsWith("accessToken=") ||
        part.startsWith("auth_token=") ||
        part.startsWith("ph_app_session="),
    )
    ?.split("=")[1];
}

describe("socket cookie token extraction", () => {
  it("reads accessToken cookie (web admin httpOnly)", () => {
    expect(extractCookieToken("accessToken=web-admin-jwt")).toBe("web-admin-jwt");
  });

  it("reads auth_token cookie (onboarding httpOnly)", () => {
    expect(extractCookieToken("auth_token=onboarding-jwt")).toBe("onboarding-jwt");
  });

  it("reads ph_app_session cookie (parent app httpOnly)", () => {
    expect(extractCookieToken("ph_app_session=parent-jwt")).toBe("parent-jwt");
  });

  it("reads the first matching cookie when multiple are present", () => {
    expect(extractCookieToken("other=x; ph_app_session=parent-jwt; accessToken=admin-jwt")).toBe(
      "parent-jwt",
    );
  });

  it("returns undefined when no recognised cookie is present", () => {
    expect(extractCookieToken("accessTokenClient=forged; session=other")).toBeUndefined();
  });

  it("ignores accessTokenClient (browser-readable, not trusted for socket)", () => {
    expect(extractCookieToken("accessTokenClient=forged-jwt")).toBeUndefined();
  });

  it("returns undefined for an empty cookie header", () => {
    expect(extractCookieToken("")).toBeUndefined();
  });
});
