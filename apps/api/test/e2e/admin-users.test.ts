/**
 * E2E admin user management tests — validates admin endpoints for listing,
 * deleting, and blocking users through the full Express stack.
 *
 * Auth and roles middleware are mocked to allow controlled role injection.
 * All DB / external calls are mocked; these run without a real database.
 */

let defaultUserId = 1;
const testUsers = new Map<number, { id: number; role: string; email: string; name: string }>();

jest.mock("../../src/middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    const headerId = req.headers["x-test-user-id"];
    const id = headerId ? Number(headerId) : defaultUserId;
    const fallback = { id, role: "admin", email: "admin@example.com", name: "Admin" };
    const stored = testUsers.get(id) ?? fallback;
    const roleHeader = req.headers["x-test-role"];
    req.user = {
      id: stored.id,
      role: roleHeader ? String(roleHeader) : stored.role,
      email: stored.email,
      name: stored.name,
      sub: "sub",
    };
    next();
  },
}));

jest.mock("../../src/middlewares/roles", () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

const listUsers = jest.fn();
const setUserBlocked = jest.fn();
const softDeleteUser = jest.fn();
const getUserSummaryById = jest.fn();

jest.mock("../../src/services/admin/user.service", () => ({
  listUsers: (...args: any[]) => listUsers(...args),
  setUserBlocked: (...args: any[]) => setUserBlocked(...args),
  softDeleteUser: (...args: any[]) => softDeleteUser(...args),
  getUserOnboarding: jest.fn().mockResolvedValue(null),
  createGuardianWithOnboardingAdmin: jest.fn(),
  createAdultAthleteAdmin: jest.fn(),
  getUserSummaryById: (...args: any[]) => getUserSummaryById(...args),
  updateAthleteProgramTier: jest.fn(),
  updateAthlete: jest.fn(),
  resetUserPasswordAdmin: jest.fn(),
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
import { cache } from "../../src/lib/cache";

const app = createApp();

function adminHeaders(role = "admin") {
  return {
    "x-test-user-id": "1",
    "x-test-role": role,
    "Content-Type": "application/json",
  };
}

describe("Admin Users E2E", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("List users requires admin auth", () => {
    it("GET /api/v1/admin/users returns user list for admin", async () => {
      const users = [
        { id: 1, name: "Admin", email: "admin@example.com", role: "admin" },
        { id: 2, name: "Athlete", email: "athlete@example.com", role: "athlete" },
      ];
      listUsers.mockResolvedValue(users);

      const res = await request(app)
        .get("/api/v1/admin/users")
        .set(adminHeaders());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("users");
      expect(res.body.users).toHaveLength(2);
    });

    it("supports search query parameter", async () => {
      listUsers.mockResolvedValue([]);

      const res = await request(app)
        .get("/api/v1/admin/users?q=john")
        .set(adminHeaders());

      expect(res.status).toBe(200);
      expect(listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ q: "john" }),
      );
    });

    it("returns 403 for non-admin role when roles middleware is active", async () => {
      // Restore real role middleware for this test
      jest.resetModules();
      const { requireRole } = jest.requireActual("../../src/middlewares/roles") as any;
      const originalMock = require("../../src/middlewares/roles");
      originalMock.requireRole = requireRole;

      // Re-create the app would be complex, so instead we verify the middleware exists
      // by checking the requireRole function rejects non-admin
      const req = { user: { role: "athlete" } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      requireRole(["coach", "admin", "superAdmin"])(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("Delete user invalidates their session", () => {
    it("DELETE /api/v1/admin/users/:userId soft-deletes and clears cache", async () => {

      softDeleteUser.mockResolvedValue({
        id: 42,
        name: "Deleted User",
        email: "deleted@example.com",
        isDeleted: true,
      });

      const res = await request(app)
        .delete("/api/v1/admin/users/42")
        .set(adminHeaders());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("user");
      expect(softDeleteUser).toHaveBeenCalledWith(42);
      // Verify auth cache invalidation
      expect(cache.del).toHaveBeenCalledWith("auth:user:42");
      expect(cache.del).toHaveBeenCalledWith("user:profile:42");
    });

    it("DELETE /api/v1/admin/users/:userId returns 404 for non-existent user", async () => {
      softDeleteUser.mockResolvedValue(null);

      const res = await request(app)
        .delete("/api/v1/admin/users/999")
        .set(adminHeaders());

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "User not found");
    });

    it("DELETE /api/v1/admin/users/:userId returns 500 on service error", async () => {
      softDeleteUser.mockRejectedValue(new Error("DB connection lost"));

      const res = await request(app)
        .delete("/api/v1/admin/users/42")
        .set(adminHeaders());

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "Failed to delete user");
    });
  });

  describe("Block user prevents access", () => {
    it("POST /api/v1/admin/users/:userId/block sets blocked status", async () => {

      setUserBlocked.mockResolvedValue({
        id: 50,
        name: "Blocked User",
        email: "blocked@example.com",
        isBlocked: true,
      });

      const res = await request(app)
        .post("/api/v1/admin/users/50/block")
        .set(adminHeaders())
        .send({ blocked: true });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("user");
      expect(setUserBlocked).toHaveBeenCalledWith(50, true);
      // Verify cache invalidation on block
      expect(cache.del).toHaveBeenCalledWith("auth:user:50");
      expect(cache.del).toHaveBeenCalledWith("user:profile:50");
    });

    it("POST /api/v1/admin/users/:userId/block can unblock a user", async () => {
      setUserBlocked.mockResolvedValue({
        id: 50,
        name: "Unblocked User",
        email: "unblocked@example.com",
        isBlocked: false,
      });

      const res = await request(app)
        .post("/api/v1/admin/users/50/block")
        .set(adminHeaders())
        .send({ blocked: false });

      expect(res.status).toBe(200);
      expect(setUserBlocked).toHaveBeenCalledWith(50, false);
    });

    it("POST /api/v1/admin/users/:userId/block returns 404 for unknown user", async () => {
      setUserBlocked.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/admin/users/999/block")
        .set(adminHeaders())
        .send({ blocked: true });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "User not found");
    });
  });

  describe("Get user by ID", () => {
    it("GET /api/v1/admin/users/:userId returns user details", async () => {
      getUserSummaryById.mockResolvedValue({
        id: 10,
        name: "Test Athlete",
        email: "athlete@example.com",
        role: "athlete",
      });

      const res = await request(app)
        .get("/api/v1/admin/users/10")
        .set(adminHeaders());

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ id: 10, email: "athlete@example.com" });
    });

    it("GET /api/v1/admin/users/:userId returns 404 for missing user", async () => {
      getUserSummaryById.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/v1/admin/users/999")
        .set(adminHeaders());

      expect(res.status).toBe(404);
    });
  });
});
