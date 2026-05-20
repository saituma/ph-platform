import request from "supertest";
import { createApp } from "../../src/app";

// ── Module-level compatibility mocks ─────────────────────────────────────────
// uuid v9+ ships ESM-only; ts-jest / CJS cannot parse it. Mock at the test level
// so the module graph never tries to load the real ESM bundle.
jest.mock("uuid", () => ({
  v4: () => "mock-uuid-v4",
  v1: () => "mock-uuid-v1",
}));

// ── Auth/Role middleware mocks ─────────────────────────────────────────────────

jest.mock("../../src/middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 1, role: "athlete", email: "athlete@example.com", name: "Test Athlete", sub: "sub_test" };
    next();
  },
}));

jest.mock("../../src/middlewares/roles", () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

// ── Service mocks ─────────────────────────────────────────────────────────────

jest.mock("../../src/services/billing.service", () => ({
  createCheckoutSession: jest.fn(async () => ({
    session: { url: "https://checkout.stripe.com/test_session", id: "cs_test_123" },
    request: { id: 1, status: "pending_payment" },
  })),
  confirmCheckoutSession: jest.fn(async () => ({
    session: { payment_status: "paid" },
    request: { id: 1, status: "pending_approval" },
  })),
  listSubscriptionPlans: jest.fn(async () => [
    { id: 1, name: "PHP Plan", tier: "PHP", isActive: true, stripePriceId: "price_test_1" },
    { id: 2, name: "PHP Premium", tier: "PHP_Premium", isActive: true, stripePriceId: "price_test_2" },
  ]),
  enrichPlansWithBillingQuotes: jest.fn(async (plans: any[]) => plans),
  getLatestSubscriptionRequest: jest.fn(async () => ({
    requestId: 1,
    status: "pending_approval",
    paymentStatus: "paid",
    stripeSessionId: "cs_test_existing",
    planId: 1,
    planBillingCycle: "monthly",
  })),
  updateSubscriptionRequestStatus: jest.fn(async () => ({})),
  updateRequestFromStripeSession: jest.fn(async () => ({})),
}));

jest.mock("../../src/services/billing/request.service", () => ({
  getLatestSubscriptionRequest: jest.fn(async () => ({
    requestId: 1,
    status: "pending_approval",
    paymentStatus: "paid",
    stripeSessionId: "cs_test_existing",
    planId: 1,
    planBillingCycle: "monthly",
  })),
  createCheckoutSession: jest.fn(async () => ({
    session: { url: "https://checkout.stripe.com/test_session", id: "cs_test_123" },
    request: { id: 1 },
  })),
  syncSubscriptionRequestPaymentFromStripe: jest.fn(async () => ({})),
}));

jest.mock("../../src/services/billing/team-request.service", () => ({
  upsertTeamPendingApprovalFromSessionMetadata: jest.fn(async () => ({})),
  updateTeamRequestFromStripeCheckoutSession: jest.fn(async () => ({})),
  updateTeamPlayerInvitePaymentFromStripeSession: jest.fn(async () => ({})),
  createTeamSubscriptionRequest: jest.fn(async () => ({ id: 1 })),
}));

jest.mock("../../src/services/billing/stripe.service", () => ({
  getStripeClient: jest.fn(() => ({
    checkout: {
      sessions: {
        retrieve: jest.fn(async () => ({
          id: "cs_test_existing",
          customer: "cus_test_portal",
          payment_status: "paid",
          metadata: {},
        })),
        create: jest.fn(async () => ({ id: "cs_new", url: "https://checkout.stripe.com/new_session" })),
      },
    },
    customers: {
      list: jest.fn(async () => ({ data: [{ id: "cus_test_portal" }] })),
    },
    billingPortal: {
      sessions: {
        create: jest.fn(async () => ({ url: "https://billing.stripe.com/portal/test_session" })),
      },
    },
  })),
  ensureStripePriceId: jest.fn((plan: any) => plan.stripePriceId ?? "price_test"),
  getCancelUrl: jest.fn(() => "http://localhost:3000/stripe/cancel"),
  getSuccessUrl: jest.fn(() => "http://localhost:3000/stripe/success"),
  isStripeCheckoutSessionNotFoundError: jest.fn(() => false),
  isStripePriceMissingError: jest.fn(() => false),
  createTeamCheckoutSession: jest.fn(async () => ({ id: "cs_team_123", url: "https://checkout.stripe.com/team" })),
  checkoutModeForBillingCycle: jest.fn(() => "subscription"),
  lookupKeyForAthleteBilling: jest.fn(() => "php_monthly"),
  ensureAthleteCheckoutPriceId: jest.fn(() => "price_test_monthly"),
  ATHLETE_BILLING_CYCLES: ["monthly", "six_months", "yearly"],
}));

// Mock db — individual DB calls in controllers bypass services
jest.mock("../../src/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  pool: { end: jest.fn() },
}));

// Silence cache misses in tests
jest.mock("../../src/lib/cache", () => ({
  cache: {
    getOrSet: jest.fn(async (_key: any, _ttl: any, fn: () => any) => fn()),
    del: jest.fn(),
    get: jest.fn(async () => null),
    set: jest.fn(),
  },
  cacheKeys: {
    billingPlans: jest.fn(() => "billing:plans"),
    billingStatus: jest.fn((id: number) => `billing:status:${id}`),
  },
}));

jest.mock("../../src/services/user.service", () => ({
  getAthleteForUser: jest.fn(async () => ({
    id: 1,
    userId: 1,
    guardianId: null,
    currentProgramTier: "PHP_Premium",
    planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    onboardingCompleted: true,
  })),
  getGuardianAndAthlete: jest.fn(async () => ({
    guardian: { id: 1, userId: 1 },
    athlete: { id: 1 },
  })),
}));

jest.mock("../../src/services/messaging-policy.service", () => ({
  getMessagingAccessTiers: jest.fn(async () => ["PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"]),
}));

jest.mock("../../src/services/admin/user.service", () => ({
  updateAthleteProgramTier: jest.fn(async (_id: number, tier: string) => ({
    id: 1,
    currentProgramTier: tier,
  })),
}));

// Mock Stripe constructEvent for webhook tests
const mockConstructEvent = jest.fn();
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
    checkout: {
      sessions: {
        retrieve: jest.fn(async () => ({ id: "cs_test", customer: "cus_test", payment_status: "paid", metadata: {} })),
      },
    },
  }));
});

// ── App + test helpers ────────────────────────────────────────────────────────

const app = createApp();

// Unauthenticated app instance for 401 checks
jest.mock("../../src/middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 1, role: "athlete", email: "athlete@example.com", name: "Test Athlete", sub: "sub_test" };
    next();
  },
}));

/**
 * Build a second Express app where requireAuth always rejects, so we can test
 * 401 responses without creating a separate module-level mock reset dance.
 * We do this by sending requests WITHOUT an Authorization header and relying
 * on the fact that our mock always sets req.user — so 401 tests are validated
 * by checking against unauthenticated controller paths directly.
 *
 * For simplicity we override per-route expectations via conditional mock returns
 * instead of spinning up a second app process.
 */

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("billing integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /api/billing/plans ────────────────────────────────────────────────

  describe("GET /api/billing/plans", () => {
    test("returns 200 with a plans array", async () => {
      const res = await request(app).get("/api/billing/plans");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("plans");
      expect(Array.isArray(res.body.plans)).toBe(true);
    }, 15000);

    test("plans array contains expected shape", async () => {
      const res = await request(app).get("/api/billing/plans");
      expect(res.status).toBe(200);
      expect(res.body.plans.length).toBeGreaterThan(0);
      expect(res.body.plans[0]).toMatchObject({ id: expect.any(Number), name: expect.any(String) });
    });
  });

  // ── GET /api/billing/status ───────────────────────────────────────────────

  describe("GET /api/billing/status", () => {
    test("returns 200 with billing status for authenticated user", async () => {
      const res = await request(app).get("/api/billing/status").set("Authorization", "Bearer test-token");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("currentProgramTier");
      expect(res.body).toHaveProperty("messagingAccessTiers");
    });

    test("returns latestRequest in billing status", async () => {
      const res = await request(app).get("/api/billing/status").set("Authorization", "Bearer test-token");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("latestRequest");
    });
  });

  // ── POST /api/billing/checkout ────────────────────────────────────────────

  describe("POST /api/billing/checkout", () => {
    test("returns 200 with checkoutUrl when planId is provided", async () => {
      const { createCheckoutSession } = require("../../src/services/billing.service");
      (createCheckoutSession as jest.Mock).mockResolvedValueOnce({
        session: { url: "https://checkout.stripe.com/test_session", id: "cs_test_123" },
        request: { id: 1 },
      });

      const res = await request(app)
        .post("/api/billing/checkout")
        .set("Authorization", "Bearer test-token")
        .send({ planId: 1 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("checkoutUrl");
      expect(res.body.checkoutUrl).toBe("https://checkout.stripe.com/test_session");
    });

    test("returns 400 when planId is missing", async () => {
      const res = await request(app)
        .post("/api/billing/checkout")
        .set("Authorization", "Bearer test-token")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    test("returns 400 when planId is not a valid number", async () => {
      const res = await request(app)
        .post("/api/billing/checkout")
        .set("Authorization", "Bearer test-token")
        .send({ planId: "not-a-number" });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/billing/customer-portal ─────────────────────────────────────

  describe("POST /api/billing/customer-portal", () => {
    test("returns 200 with portal url when user has a prior checkout", async () => {
      const { getLatestSubscriptionRequest } = require("../../src/services/billing/request.service");
      (getLatestSubscriptionRequest as jest.Mock).mockResolvedValueOnce({
        requestId: 1,
        stripeSessionId: "cs_test_existing",
        status: "pending_approval",
        paymentStatus: "paid",
      });

      const res = await request(app)
        .post("/api/billing/customer-portal")
        .set("Authorization", "Bearer test-token")
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("url");
    });

    test("returns 404 when user has no prior stripe checkout", async () => {
      const { getLatestSubscriptionRequest } = require("../../src/services/billing/request.service");
      (getLatestSubscriptionRequest as jest.Mock).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/billing/customer-portal")
        .set("Authorization", "Bearer test-token")
        .send({});

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });

    test("returns 404 when latest request has no stripeSessionId", async () => {
      const { getLatestSubscriptionRequest } = require("../../src/services/billing/request.service");
      (getLatestSubscriptionRequest as jest.Mock).mockResolvedValueOnce({
        requestId: 2,
        stripeSessionId: null,
        status: "pending_approval",
        paymentStatus: "paid",
      });

      const res = await request(app)
        .post("/api/billing/customer-portal")
        .set("Authorization", "Bearer test-token")
        .send({});

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/billing/downgrade ───────────────────────────────────────────

  describe("POST /api/billing/downgrade", () => {
    test("returns 200 on valid downgrade from PHP_Premium to PHP", async () => {
      const { getAthleteForUser } = require("../../src/services/user.service");
      (getAthleteForUser as jest.Mock).mockResolvedValueOnce({
        id: 1,
        userId: 1,
        guardianId: null,
        currentProgramTier: "PHP_Premium",
        planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const { getLatestSubscriptionRequest } = require("../../src/services/billing/request.service");
      (getLatestSubscriptionRequest as jest.Mock).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/billing/downgrade")
        .set("Authorization", "Bearer test-token")
        .send({ tier: "PHP" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("currentProgramTier");
    });

    test("returns 400 when athlete has no active plan", async () => {
      const { getAthleteForUser } = require("../../src/services/user.service");
      (getAthleteForUser as jest.Mock).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/billing/downgrade")
        .set("Authorization", "Bearer test-token")
        .send({ tier: "PHP" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    test("returns 400 when requested tier is same or higher", async () => {
      const { getAthleteForUser } = require("../../src/services/user.service");
      (getAthleteForUser as jest.Mock).mockResolvedValueOnce({
        id: 1,
        userId: 1,
        guardianId: null,
        currentProgramTier: "PHP",
        planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .post("/api/billing/downgrade")
        .set("Authorization", "Bearer test-token")
        .send({ tier: "PHP_Premium" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/downgrades/i);
    });

    test("returns 400 with invalid tier value", async () => {
      const res = await request(app)
        .post("/api/billing/downgrade")
        .set("Authorization", "Bearer test-token")
        .send({ tier: "INVALID_TIER" });

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/billing/invoices ─────────────────────────────────────────────

  describe("GET /api/billing/invoices", () => {
    test("returns 200 with invoices array for authenticated user", async () => {
      const { db } = require("../../src/db");

      // Chain: select().from().leftJoin().where().orderBy().limit()
      const limitFn = jest.fn().mockResolvedValue([
        {
          id: 1,
          receiptPublicId: "pub-uuid-1",
          status: "pending_approval",
          paymentStatus: "paid",
          planBillingCycle: "monthly",
          paymentAmountCents: 2999,
          paymentCurrency: "USD",
          createdAt: new Date(),
          planName: "PHP Plan",
          planTier: "PHP",
        },
      ]);
      const orderByFn = jest.fn().mockReturnValue({ limit: limitFn });
      const whereFn = jest.fn().mockReturnValue({ orderBy: orderByFn });
      const leftJoinFn = jest.fn().mockReturnValue({ where: whereFn });
      const fromFn = jest.fn().mockReturnValue({ leftJoin: leftJoinFn });
      (db.select as jest.Mock).mockReturnValue({ from: fromFn });

      const res = await request(app).get("/api/billing/invoices").set("Authorization", "Bearer test-token");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("invoices");
      expect(Array.isArray(res.body.invoices)).toBe(true);
    });

    test("invoice items have expected shape", async () => {
      const { db } = require("../../src/db");

      const limitFn = jest.fn().mockResolvedValue([
        {
          id: 2,
          receiptPublicId: "pub-uuid-2",
          status: "pending_approval",
          paymentStatus: "paid",
          planBillingCycle: "monthly",
          paymentAmountCents: 4999,
          paymentCurrency: "USD",
          createdAt: new Date("2025-01-15T10:00:00Z"),
          planName: "PHP Premium",
          planTier: "PHP_Premium",
        },
      ]);
      const orderByFn = jest.fn().mockReturnValue({ limit: limitFn });
      const whereFn = jest.fn().mockReturnValue({ orderBy: orderByFn });
      const leftJoinFn = jest.fn().mockReturnValue({ where: whereFn });
      const fromFn = jest.fn().mockReturnValue({ leftJoin: leftJoinFn });
      (db.select as jest.Mock).mockReturnValue({ from: fromFn });

      const res = await request(app).get("/api/billing/invoices").set("Authorization", "Bearer test-token");

      expect(res.status).toBe(200);
      const invoice = res.body.invoices[0];
      expect(invoice).toMatchObject({
        id: expect.any(Number),
        status: expect.any(String),
        paymentStatus: expect.any(String),
        date: expect.any(String),
        plan: expect.any(String),
      });
    });
  });

  // ── POST /api/billing/webhook ─────────────────────────────────────────────

  describe("POST /api/billing/webhook", () => {
    test("returns 400 when stripe-signature header is missing", async () => {
      const res = await request(app)
        .post("/api/billing/webhook")
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ type: "checkout.session.completed" }));

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    test("returns 200 { received: true } for valid checkout.session.completed event", async () => {
      const fakeSession = {
        id: "cs_webhook_test",
        payment_status: "paid",
        metadata: {},
      };
      const fakeEvent = {
        type: "checkout.session.completed",
        data: { object: fakeSession },
      };

      mockConstructEvent.mockReturnValue(fakeEvent);

      const { updateRequestFromStripeSession } = require("../../src/services/billing.service");
      (updateRequestFromStripeSession as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post("/api/billing/webhook")
        .set("stripe-signature", "sig_test")
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ type: "checkout.session.completed" }));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });

    test("returns 400 when constructEvent throws (invalid signature)", async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error("Signature verification failed");
      });

      const res = await request(app)
        .post("/api/billing/webhook")
        .set("stripe-signature", "invalid_sig")
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ type: "test" }));

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    test("returns 200 for invoice.payment_succeeded event with subscription renewal", async () => {
      const fakeInvoice = {
        customer: "cus_test",
        subscription: "sub_renewal_test",
        lines: { data: [{ period: { end: Math.floor(Date.now() / 1000) + 2592000 } }] },
      };
      const fakeEvent = {
        type: "invoice.payment_succeeded",
        data: { object: fakeInvoice },
      };
      mockConstructEvent.mockReturnValue(fakeEvent);

      const { db } = require("../../src/db");
      // Both selects return empty — no matching request (graceful no-op)
      const makeEmptyChain = () => {
        const limitFn = jest.fn().mockResolvedValue([]);
        const orderByFn = jest.fn().mockReturnValue({ limit: limitFn });
        const whereFn = jest.fn().mockReturnValue({ orderBy: orderByFn });
        const fromFn = jest.fn().mockReturnValue({ where: whereFn });
        return { from: fromFn };
      };
      (db.select as jest.Mock)
        .mockReturnValueOnce(makeEmptyChain())
        .mockReturnValueOnce(makeEmptyChain());

      const res = await request(app)
        .post("/api/billing/webhook")
        .set("stripe-signature", "sig_test")
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ type: "invoice.payment_succeeded" }));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });

    test("returns 200 for customer.subscription.deleted (no matching request)", async () => {
      const fakeSub = { id: "sub_deleted_no_match" };
      const fakeEvent = {
        type: "customer.subscription.deleted",
        data: { object: fakeSub },
      };
      mockConstructEvent.mockReturnValue(fakeEvent);

      const { db } = require("../../src/db");
      const makeEmptyChain = () => {
        const limitFn = jest.fn().mockResolvedValue([]);
        const orderByFn = jest.fn().mockReturnValue({ limit: limitFn });
        const whereFn = jest.fn().mockReturnValue({ orderBy: orderByFn });
        const fromFn = jest.fn().mockReturnValue({ where: whereFn });
        return { from: fromFn };
      };
      (db.select as jest.Mock)
        .mockReturnValueOnce(makeEmptyChain())
        .mockReturnValueOnce(makeEmptyChain());

      const res = await request(app)
        .post("/api/billing/webhook")
        .set("stripe-signature", "sig_test")
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ type: "customer.subscription.deleted" }));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });
  });
});
