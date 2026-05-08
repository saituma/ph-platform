/**
 * E2E auth security tests — validates that auth middleware correctly handles
 * unauthenticated, blocked, and deleted users via the full Express stack.
 *
 * All DB / external calls are mocked; these run without a real database.
 */

const verifyAccessToken = jest.fn();
const getUserById = jest.fn();
const getUserByCognitoSub = jest.fn();
const createUserFromCognito = jest.fn();
const getAthleteForUser = jest.fn();

jest.mock("../../src/lib/jwt", () => ({
  verifyAccessToken: (...args: any[]) => verifyAccessToken(...args),
  signAccessToken: jest.fn().mockResolvedValue("mocked-token"),
  signRefreshToken: jest.fn().mockResolvedValue("mocked-refresh"),
}));

jest.mock("../../src/services/user.service", () => ({
  getUserById: (...args: any[]) => getUserById(...args),
  getUserByCognitoSub: (...args: any[]) => getUserByCognitoSub(...args),
  createUserFromCognito: (...args: any[]) => createUserFromCognito(...args),
  getAthleteForUser: (...args: any[]) => getAthleteForUser(...args),
  listGuardianAthletes: jest.fn().mockResolvedValue({ athletes: [] }),
  updateUserProfile: jest.fn(),
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

jest.mock("../../src/services/auth.service", () => ({
  loginLocal: jest.fn(),
  registerLocal: jest.fn(),
  confirmLocal: jest.fn(),
  resendLocal: jest.fn(),
  startEmailRegistration: jest.fn(),
  updateUserRole: jest.fn(),
  changePasswordLocal: jest.fn(),
  startForgotPasswordLocal: jest.fn(),
  confirmForgotPasswordLocal: jest.fn(),
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

import request from "supertest";
import { createApp } from "../../src/app";

const app = createApp();

/** Helper to build a valid mock user row */
function mockUser(overrides: Partial<{
  id: number;
  role: string;
  email: string;
  name: string;
  cognitoSub: string;
  profilePicture: string | null;
  tokenVersion: number;
  isBlocked: boolean;
  isDeleted: boolean;
}> = {}) {
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

/** Helper to set up a valid token + user pair */
function setupValidAuth(userOverrides: Parameters<typeof mockUser>[0] = {}) {
  const user = mockUser(userOverrides);
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

describe("Auth Security E2E", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Health check", () => {
    it("GET /health returns 200", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "ok");
    });

    it("GET /api/v1/health returns 200", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.status).toBe(200);
    });

    it("GET / returns 200 with ok:true", async () => {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe("Unauthenticated requests to protected routes", () => {
    it("GET /api/v1/auth/me without token returns 401", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error", "Unauthorized");
    });

    it("PATCH /api/v1/auth/me without token returns 401", async () => {
      const res = await request(app)
        .patch("/api/v1/auth/me")
        .set("Content-Type", "application/json")
        .send({ name: "New Name" });
      expect(res.status).toBe(401);
    });

    it("GET /api/v1/auth/me with malformed header returns 401", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Basic abc123");
      expect(res.status).toBe(401);
    });
  });

  describe("Blocked user gets 403", () => {
    it("returns 403 when user isBlocked = true", async () => {
      setupValidAuth({ isBlocked: true });

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error", "Account is blocked");
    });
  });

  describe("Deleted user gets 401", () => {
    it("returns 401 when user no longer exists (soft-deleted)", async () => {
      verifyAccessToken.mockResolvedValue({
        sub: "sub-deleted",
        email: "deleted@example.com",
        name: "Deleted",
        user_id: 99,
        token_version: 1,
      });
      // Simulate deleted user: getUserById returns null
      getUserById.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer deleted-user-token");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error", "Unauthorized");
    });

    it("invalidates auth cache when user not found by ID", async () => {
      const { cache } = require("../../src/lib/cache");

      verifyAccessToken.mockResolvedValue({
        sub: "sub-gone",
        email: "gone@example.com",
        name: "Gone",
        user_id: 42,
        token_version: 1,
      });
      getUserById.mockResolvedValue(null);

      await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer gone-user-token");

      expect(cache.del).toHaveBeenCalledWith("auth:user:42");
    });
  });

  describe("Token version mismatch returns 401", () => {
    it("rejects token when token_version does not match user record", async () => {
      verifyAccessToken.mockResolvedValue({
        sub: "sub-1",
        email: "test@example.com",
        name: "Test",
        user_id: 10,
        token_version: 1, // old version in token
      });
      getUserById.mockResolvedValue(mockUser({ tokenVersion: 2 })); // user's version was bumped

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer stale-token");

      expect(res.status).toBe(401);
    });
  });

  describe("Valid auth returns user data", () => {
    it("GET /api/v1/auth/me returns user when properly authenticated", async () => {
      setupValidAuth();

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("user");
      expect(res.body.user).toMatchObject({
        id: 10,
        email: "test@example.com",
        role: "guardian",
      });
    });
  });

  describe("Invalid JWT returns 401", () => {
    it("rejects when verifyAccessToken throws", async () => {
      verifyAccessToken.mockRejectedValue(new Error("JWT expired"));

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer expired-token");

      expect(res.status).toBe(401);
    });
  });
});
