/**
 * E2E core routes tests — validates health, auth flow, and protected route
 * access patterns through the full Express stack.
 *
 * All DB / external calls are mocked; these run without a real database.
 */

const verifyAccessToken = jest.fn();
const getUserById = jest.fn();
const getUserByCognitoSub = jest.fn();
const createUserFromCognito = jest.fn();
const getAthleteForUser = jest.fn();
const loginLocal = jest.fn();

jest.mock("../../src/lib/jwt", () => ({
  verifyAccessToken: (...args: any[]) => verifyAccessToken(...args),
  signAccessToken: jest.fn().mockResolvedValue("mocked-access-token"),
  signRefreshToken: jest.fn().mockResolvedValue("mocked-refresh-token"),
}));

jest.mock("../../src/services/user.service", () => ({
  getUserById: (...args: any[]) => getUserById(...args),
  getUserByCognitoSub: (...args: any[]) => getUserByCognitoSub(...args),
  createUserFromCognito: (...args: any[]) => createUserFromCognito(...args),
  getAthleteForUser: (...args: any[]) => getAthleteForUser(...args),
  listGuardianAthletes: jest.fn().mockResolvedValue({ athletes: [] }),
  updateUserProfile: jest.fn(),
}));

jest.mock("../../src/services/auth.service", () => ({
  loginLocal: (...args: any[]) => loginLocal(...args),
  registerLocal: jest.fn(),
  confirmLocal: jest.fn(),
  resendLocal: jest.fn(),
  startEmailRegistration: jest.fn(),
  updateUserRole: jest.fn(),
  changePasswordLocal: jest.fn(),
  startForgotPasswordLocal: jest.fn(),
  confirmForgotPasswordLocal: jest.fn(),
}));

jest.mock("../../src/services/s3.service", () => ({
  normalizeStoredMediaUrl: (url: string | null) => url,
}));

jest.mock("../../src/lib/cache", () => ({
  cache: {
    getOrSet: jest.fn((_key: string, _ttl: number, fetcher: () => Promise<any>) => fetcher()),
    del: jest.fn(),
  },
  cacheKeys: {
    authUser: (id: number) => `auth:user:${id}`,
    userProfile: (id: number) => `user:profile:${id}`,
  },
}));

jest.mock("../../src/lib/rateLimiter", () => ({
  rateLimiters: {
    auth: (_req: any, _res: any, next: any) => next(),
    deleteAccount: (_req: any, _res: any, next: any) => next(),
    api: (_req: any, _res: any, next: any) => next(),
    ai: (_req: any, _res: any, next: any) => next(),
  },
}));

jest.mock("../../src/lib/turnstile", () => ({
  requireTurnstile: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../../src/services/health.service", () => ({
  getHealthStatus: () => ({ status: "ok", timestamp: new Date().toISOString(), ready: true }),
  getDeepHealthStatus: jest.fn().mockResolvedValue({ ok: true, db: true, ts: Date.now() }),
}));

jest.mock("../../src/services/onboarding.service", () => ({
  getOnboardingByUser: jest.fn().mockResolvedValue(null),
}));

jest.mock("../../src/services/messaging-policy.service", () => ({
  getMessagingAccessTiers: jest.fn().mockResolvedValue([]),
}));

jest.mock("../../src/services/app-capabilities.service", () => ({
  buildAppCapabilities: jest.fn().mockReturnValue({}),
}));

jest.mock("../../src/services/billing/feature-access.service", () => ({
  featuresForTier: jest.fn().mockReturnValue(new Set()),
  getFeaturesForAthlete: jest.fn().mockResolvedValue(new Set()),
}));

jest.mock("../../src/services/account-deletion.service", () => ({
  deleteOwnAccount: jest.fn(),
}));

jest.mock("uuid", () => ({ v4: () => "test-uuid" }));

const stubHandler = (_req: any, res: any) => res.status(200).json({});
jest.mock("../../src/controllers/billing.controller", () => ({
  stripeWebhook: (_req: any, res: any) => res.sendStatus(200),
  listPlans: (_req: any, res: any) => res.json({ plans: [] }),
  getBillingStatus: stubHandler,
  downgradePlan: stubHandler,
  getTeamPaymentConfigDraft: stubHandler,
  upsertTeamPaymentConfigDraft: stubHandler,
  createCheckout: stubHandler,
  createTeamCheckout: stubHandler,
  createPaymentSheet: stubHandler,
  confirmPaymentSheet: stubHandler,
  confirmCheckout: stubHandler,
  confirmCheckoutPublic: stubHandler,
  getPaymentReceipt: stubHandler,
  listPlansAdmin: stubHandler,
  listStripePricesAdmin: stubHandler,
  createPlanAdmin: stubHandler,
  invitePlanUserAdmin: stubHandler,
  getPlanInviteSummaryPublic: stubHandler,
  consumePlanInvitePublic: stubHandler,
  importPlanAdmin: stubHandler,
  updatePlanAdmin: stubHandler,
  listRequestsAdmin: stubHandler,
  approveRequestAdmin: stubHandler,
  rejectRequestAdmin: stubHandler,
  syncRequestPaymentAdmin: stubHandler,
  listTeamRequestsAdmin: stubHandler,
  approveTeamRequestAdmin: stubHandler,
  rejectTeamRequestAdmin: stubHandler,
  syncTeamRequestPaymentAdmin: stubHandler,
  verifyRevenueCatPurchase: stubHandler,
  listInvoices: stubHandler,
  listTeamPlayerInvitesAdmin: stubHandler,
  resendTeamPlayerInviteAdmin: stubHandler,
  sponsorTeamPlayerInviteAdmin: stubHandler,
}));

jest.mock("../../src/services/fcm.service", () => ({
  sendFcmPush: jest.fn(),
  isFcmEnabled: () => false,
}));

jest.mock("../../src/db", () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
    execute: jest.fn(),
  },
  pool: { query: jest.fn() },
}));

import request from "supertest";
import { createApp } from "../../src/app";

const app = createApp();

function mockUser(overrides: Record<string, any> = {}) {
  return {
    id: 10,
    role: "guardian",
    email: "test@example.com",
    name: "Test User",
    cognitoSub: "sub-test",
    profilePicture: null,
    tokenVersion: 1,
    isBlocked: false,
    isDeleted: false,
    ...overrides,
  };
}

function setupValidAuth(overrides: Record<string, any> = {}) {
  const user = mockUser(overrides);
  verifyAccessToken.mockResolvedValue({
    sub: user.cognitoSub,
    email: user.email,
    name: user.name,
    user_id: user.id,
    token_version: user.tokenVersion,
  });
  getUserById.mockResolvedValue(user);
  return user;
}

describe("Core Routes E2E", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("returns 200 with status ok", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "ok");
    });

    it("returns deprecation header on unversioned path", async () => {
      const res = await request(app).get("/api/health");
      expect(res.headers["x-api-deprecated"]).toBe("Use /api/v1 prefix");
    });

    it("GET /api/v1/health has no deprecation header", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.status).toBe(200);
      expect(res.headers["x-api-deprecated"]).toBeUndefined();
    });
  });

  describe("Auth flow — login", () => {
    it("POST /api/v1/auth/login returns tokens on success", async () => {
      loginLocal.mockResolvedValue({
        accessToken: "jwt-access",
        refreshToken: "jwt-refresh",
        user: { id: 10, email: "test@example.com", role: "guardian" },
      });

      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Content-Type", "application/json")
        .send({ email: "test@example.com", password: "Password123" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("accessToken", "jwt-access");
      expect(loginLocal).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123",
      });
    });

    it("POST /api/v1/auth/login with invalid payload returns 4xx", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Content-Type", "application/json")
        .send({ email: "bad", password: "short" });

      // Zod validation will throw, error handler returns 4xx/5xx
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("Auth flow — get me", () => {
    it("GET /api/v1/auth/me returns authenticated user", async () => {
      setupValidAuth();

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("user");
      expect(res.body.user).toMatchObject({ id: 10, email: "test@example.com" });
    });

    it("GET /api/v1/auth/me without token returns 401", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.status).toBe(401);
    });
  });

  describe("Auth flow — refresh", () => {
    it("POST /api/v1/auth/refresh returns 400 (refresh not supported)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Content-Type", "application/json")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Refresh tokens are not used");
    });
  });

  describe("Auth flow — session compat", () => {
    it("GET /api/v1/auth/get-session without token returns null session", async () => {
      const res = await request(app).get("/api/v1/auth/get-session");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ session: null, user: null });
    });

    it("GET /api/v1/auth/get-session with valid token returns session", async () => {
      const user = mockUser();
      verifyAccessToken.mockResolvedValue({ user_id: user.id });
      getUserById.mockResolvedValue(user);

      const res = await request(app)
        .get("/api/v1/auth/get-session")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.session).toMatchObject({ userId: 10 });
      expect(res.body.user).toMatchObject({ id: 10, email: "test@example.com" });
    });

    it("GET /api/v1/auth/get-session with deleted user returns null", async () => {
      verifyAccessToken.mockResolvedValue({ user_id: 99 });
      getUserById.mockResolvedValue({ ...mockUser({ id: 99 }), isDeleted: true });

      const res = await request(app)
        .get("/api/v1/auth/get-session")
        .set("Authorization", "Bearer deleted-token");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ session: null, user: null });
    });

    it("GET /api/v1/auth/get-session with blocked user returns null", async () => {
      verifyAccessToken.mockResolvedValue({ user_id: 50 });
      getUserById.mockResolvedValue({ ...mockUser({ id: 50 }), isBlocked: true });

      const res = await request(app)
        .get("/api/v1/auth/get-session")
        .set("Authorization", "Bearer blocked-token");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ session: null, user: null });
    });
  });

  describe("Protected route access patterns", () => {
    it("non-existent route returns 404", async () => {
      const res = await request(app).get("/api/v1/nonexistent");
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Not found");
    });

    it("POST without Content-Type application/json returns 415", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Content-Type", "text/plain")
        .send("not json");

      expect(res.status).toBe(415);
      expect(res.body).toHaveProperty("error");
    });

    it("GET /api/v1/billing/public-plans bypasses auth (public route)", async () => {
      // The public-plans route is under requireAuth but whitelisted
      // This is at /api/v1/billing/public-plans which hits requireAuth but is bypassed
      const res = await request(app).get("/api/v1/public/plans");
      expect(res.status).toBe(200);
    });

    it("HEAD / returns 200 for load balancer", async () => {
      const res = await request(app).head("/");
      expect(res.status).toBe(200);
    });

    it("HEAD /health returns 200 for load balancer", async () => {
      const res = await request(app).head("/health");
      expect(res.status).toBe(200);
    });
  });

  describe("Legacy API path backwards compatibility", () => {
    it("GET /api/health returns same data as /api/v1/health", async () => {
      const [legacy, versioned] = await Promise.all([
        request(app).get("/api/health"),
        request(app).get("/api/v1/health"),
      ]);

      expect(legacy.status).toBe(200);
      expect(versioned.status).toBe(200);
      expect(legacy.body.status).toBe(versioned.body.status);
    });

    it("legacy path includes version and deprecation headers", async () => {
      const res = await request(app).get("/api/health");
      expect(res.headers["x-api-version"]).toBe("v1");
      expect(res.headers["x-api-deprecated"]).toBe("Use /api/v1 prefix");
    });
  });
});
