import type { Request, Response } from "express";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("../../src/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../../src/services/billing.service", () => ({
  updateRequestFromStripeSession: jest.fn(),
}));

jest.mock("../../src/services/billing/team-request.service", () => ({
  upsertTeamPendingApprovalFromSessionMetadata: jest.fn(),
  updateTeamRequestFromStripeCheckoutSession: jest.fn(),
  updateTeamPlayerInvitePaymentFromStripeSession: jest.fn(),
}));

jest.mock("../../src/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Stripe — we control constructEvent per test via the mockConstructEvent ref
const mockConstructEvent = jest.fn();
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }));
});

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { db } from "../../src/db";
import { updateRequestFromStripeSession } from "../../src/services/billing.service";
import {
  upsertTeamPendingApprovalFromSessionMetadata,
  updateTeamRequestFromStripeCheckoutSession,
  updateTeamPlayerInvitePaymentFromStripeSession,
} from "../../src/services/billing/team-request.service";
import { stripeWebhook } from "../../src/controllers/billing/webhook.controller";
import { env } from "../../src/config/env";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: { "stripe-signature": "sig_test" },
    body: Buffer.from("{}"),
    ...overrides,
  } as unknown as Request;
}

function makeRes(): { res: Response; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  return { res, json, status };
}

function makeSession(metaType: string, extra: object = {}) {
  return {
    id: "cs_test_abc",
    payment_status: "paid",
    metadata: { type: metaType },
    ...extra,
  };
}

function makeInvoice(subscriptionId: string | null, periodEnd: number | null = null) {
  return {
    customer: "cus_test_1",
    subscription: subscriptionId,
    lines: periodEnd
      ? { data: [{ period: { end: periodEnd } }] }
      : { data: [] },
  };
}

function makeSubscription(id: string) {
  return { id };
}

function fakeEvent(type: string, object: object) {
  return { type, data: { object } };
}

// ── DB chain builder helpers ──────────────────────────────────────────────────

/**
 * Returns a chainable select mock that yields `rows` at the final `.limit()` call.
 * Supports both `select().from().where().limit()` and
 * `select().from().where().orderBy().limit()` patterns.
 */
function mockSelectChain(rows: object[]) {
  const limitFn = jest.fn().mockResolvedValue(rows);
  const orderByFn = jest.fn().mockReturnValue({ limit: limitFn });
  // where() supports both .limit() (no orderBy) and .orderBy().limit()
  const whereFn = jest.fn().mockReturnValue({ orderBy: orderByFn, limit: limitFn });
  const fromFn = jest.fn().mockReturnValue({ where: whereFn });
  return { from: fromFn, where: whereFn, orderBy: orderByFn, limit: limitFn };
}

function mockUpdateChain() {
  const whereFn = jest.fn().mockResolvedValue([]);
  const setFn = jest.fn().mockReturnValue({ where: whereFn });
  return { set: setFn, where: whereFn };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("stripeWebhook controller", () => {
  const originalStripeKey = env.stripeSecretKey;
  const originalWebhookSecret = env.stripeWebhookSecret;

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore env defaults between tests
    (env as any).stripeSecretKey = "sk_test_dummy";
    (env as any).stripeWebhookSecret = "whsec_test_dummy";
  });

  afterAll(() => {
    (env as any).stripeSecretKey = originalStripeKey;
    (env as any).stripeWebhookSecret = originalWebhookSecret;
  });

  // ── Signature verification ──────────────────────────────────────────────────

  describe("signature verification", () => {
    test("returns 400 when stripe-signature header is missing", async () => {
      const { res, status, json } = makeRes();
      const req = makeReq({ headers: {} });

      await stripeWebhook(req, res);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("Missing Stripe signature") }));
    });

    test("returns 400 when constructEvent throws (invalid signature)", async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error("No signatures found matching the expected signature for payload.");
      });

      const { res, status, json } = makeRes();
      const req = makeReq();

      await stripeWebhook(req, res);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("Webhook signature verification failed") }),
      );
    });

    test("returns 500 when STRIPE_SECRET_KEY env is missing", async () => {
      (env as any).stripeSecretKey = "";
      (env as any).stripeWebhookSecret = "";

      const { res, status, json } = makeRes();
      const req = makeReq();

      await stripeWebhook(req, res);

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("Stripe is not configured") }));
    });
  });

  // ── checkout.session.completed ──────────────────────────────────────────────

  describe("checkout.session.completed", () => {
    test("team_subscription type calls upsert + updateTeamRequest", async () => {
      const session = makeSession("team_subscription");
      mockConstructEvent.mockReturnValue(fakeEvent("checkout.session.completed", session));

      const { res } = makeRes();
      await stripeWebhook(makeReq(), res);

      expect(upsertTeamPendingApprovalFromSessionMetadata).toHaveBeenCalledWith(session);
      expect(updateTeamRequestFromStripeCheckoutSession).toHaveBeenCalledWith(session, "paid");
      expect(updateRequestFromStripeSession).not.toHaveBeenCalled();
    });

    test("team_player_invite type calls updateTeamPlayerInvitePaymentFromStripeSession", async () => {
      const session = makeSession("team_player_invite");
      mockConstructEvent.mockReturnValue(fakeEvent("checkout.session.completed", session));

      const { res } = makeRes();
      await stripeWebhook(makeReq(), res);

      expect(updateTeamPlayerInvitePaymentFromStripeSession).toHaveBeenCalledWith(
        session,
        "paid",
        "checkout.session.completed",
      );
      expect(upsertTeamPendingApprovalFromSessionMetadata).not.toHaveBeenCalled();
      expect(updateRequestFromStripeSession).not.toHaveBeenCalled();
    });

    test("individual checkout (no type) calls updateRequestFromStripeSession", async () => {
      const session = makeSession("");
      mockConstructEvent.mockReturnValue(fakeEvent("checkout.session.completed", session));

      const { res } = makeRes();
      await stripeWebhook(makeReq(), res);

      expect(updateRequestFromStripeSession).toHaveBeenCalledWith(session);
      expect(upsertTeamPendingApprovalFromSessionMetadata).not.toHaveBeenCalled();
    });

    test("returns 200 { received: true } on success", async () => {
      const session = makeSession("");
      mockConstructEvent.mockReturnValue(fakeEvent("checkout.session.completed", session));
      (updateRequestFromStripeSession as jest.Mock).mockResolvedValue(undefined);

      const { res, status, json } = makeRes();
      await stripeWebhook(makeReq(), res);

      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith({ received: true });
    });
  });

  // ── invoice.payment_failed ──────────────────────────────────────────────────

  describe("invoice.payment_failed", () => {
    test("marks subscriptionRequest as past_due when a matching request exists", async () => {
      const invoice = makeInvoice("sub_test_1");
      mockConstructEvent.mockReturnValue(fakeEvent("invoice.payment_failed", invoice));

      const mockSelect = db.select as jest.Mock;
      const mockUpdate = db.update as jest.Mock;

      // First select → individual subscription request found
      mockSelect.mockReturnValueOnce(mockSelectChain([{ id: 42 }]));
      mockUpdate.mockReturnValue(mockUpdateChain());

      const { res, status, json } = makeRes();
      await stripeWebhook(makeReq(), res);

      expect(db.update).toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith({ received: true });
    });

    test("falls through to team request when individual request not found", async () => {
      const invoice = makeInvoice("sub_test_team");
      mockConstructEvent.mockReturnValue(fakeEvent("invoice.payment_failed", invoice));

      const mockSelect = db.select as jest.Mock;
      const mockUpdate = db.update as jest.Mock;

      // First select → no individual request
      mockSelect.mockReturnValueOnce(mockSelectChain([]));
      // Second select → team request found
      mockSelect.mockReturnValueOnce(mockSelectChain([{ id: 99 }]));
      mockUpdate.mockReturnValue(mockUpdateChain());

      const { res, status } = makeRes();
      await stripeWebhook(makeReq(), res);

      expect(db.update).toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(200);
    });

    test("does not write to DB when invoice has no subscription ID", async () => {
      const invoice = makeInvoice(null);
      mockConstructEvent.mockReturnValue(fakeEvent("invoice.payment_failed", invoice));

      const { res, status } = makeRes();
      await stripeWebhook(makeReq(), res);

      expect(db.update).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(200);
    });

    test("returns 500 when db.select throws during payment_failed handling", async () => {
      const invoice = makeInvoice("sub_throws");
      mockConstructEvent.mockReturnValue(fakeEvent("invoice.payment_failed", invoice));

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockRejectedValue(new Error("DB connection lost")),
            }),
          }),
        }),
      });

      const { res, status, json } = makeRes();
      await stripeWebhook(makeReq(), res);

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("Failed to process webhook") }));
    });
  });

  // ── invoice.payment_succeeded ───────────────────────────────────────────────

  describe("invoice.payment_succeeded", () => {
    test("updates athleteTable planExpiresAt and marks request paid", async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now
      const invoice = makeInvoice("sub_success_1", periodEnd);
      mockConstructEvent.mockReturnValue(fakeEvent("invoice.payment_succeeded", invoice));

      const mockSelect = db.select as jest.Mock;
      const mockUpdate = db.update as jest.Mock;

      // First select → individual subscription request with athleteId
      mockSelect.mockReturnValueOnce(mockSelectChain([{ id: 5, athleteId: 10 }]));
      // Second select → athlete row (no guardianId)
      mockSelect.mockReturnValueOnce(mockSelectChain([{ guardianId: null }]));
      mockUpdate.mockReturnValue(mockUpdateChain());

      const { res, status, json } = makeRes();
      await stripeWebhook(makeReq(), res);

      // Should update subscription request status to paid and athlete planExpiresAt
      expect(db.update).toHaveBeenCalledTimes(2);
      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith({ received: true });
    });

    test("also touches guardianTable when athlete has a guardianId", async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const invoice = makeInvoice("sub_guardian_1", periodEnd);
      mockConstructEvent.mockReturnValue(fakeEvent("invoice.payment_succeeded", invoice));

      const mockSelect = db.select as jest.Mock;
      const mockUpdate = db.update as jest.Mock;

      // First select → individual subscription request
      mockSelect.mockReturnValueOnce(mockSelectChain([{ id: 7, athleteId: 11 }]));
      // Second select → athlete with guardianId
      mockSelect.mockReturnValueOnce(mockSelectChain([{ guardianId: 88 }]));
      mockUpdate.mockReturnValue(mockUpdateChain());

      const { res, status } = makeRes();
      await stripeWebhook(makeReq(), res);

      // subscriptionRequest update + athleteTable update + guardianTable update = 3
      expect(db.update).toHaveBeenCalledTimes(3);
      expect(status).toHaveBeenCalledWith(200);
    });

    test("updates teamTable planExpiresAt on team subscription renewal", async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const invoice = makeInvoice("sub_team_renew", periodEnd);
      mockConstructEvent.mockReturnValue(fakeEvent("invoice.payment_succeeded", invoice));

      const mockSelect = db.select as jest.Mock;
      const mockUpdate = db.update as jest.Mock;

      // First select → no individual request
      mockSelect.mockReturnValueOnce(mockSelectChain([]));
      // Second select → team request
      mockSelect.mockReturnValueOnce(mockSelectChain([{ id: 20, teamId: 5 }]));
      mockUpdate.mockReturnValue(mockUpdateChain());

      const { res, status } = makeRes();
      await stripeWebhook(makeReq(), res);

      // teamSubscriptionRequest update + teamTable update = 2
      expect(db.update).toHaveBeenCalledTimes(2);
      expect(status).toHaveBeenCalledWith(200);
    });

    test("does nothing when invoice has no subscription ID", async () => {
      const invoice = makeInvoice(null);
      mockConstructEvent.mockReturnValue(fakeEvent("invoice.payment_succeeded", invoice));

      const { res, status } = makeRes();
      await stripeWebhook(makeReq(), res);

      expect(db.update).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(200);
    });
  });

  // ── customer.subscription.deleted ──────────────────────────────────────────

  describe("customer.subscription.deleted", () => {
    test("marks individual subscription request as rejected+cancelled", async () => {
      const subscription = makeSubscription("sub_del_1");
      mockConstructEvent.mockReturnValue(fakeEvent("customer.subscription.deleted", subscription));

      const mockSelect = db.select as jest.Mock;
      const mockUpdate = db.update as jest.Mock;

      mockSelect.mockReturnValueOnce(mockSelectChain([{ id: 77 }]));
      mockUpdate.mockReturnValue(mockUpdateChain());

      const { res, status, json } = makeRes();
      await stripeWebhook(makeReq(), res);

      expect(db.update).toHaveBeenCalledTimes(1);
      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith({ received: true });
    });

    test("cancels team subscription request when no individual request matches", async () => {
      const subscription = makeSubscription("sub_team_del");
      mockConstructEvent.mockReturnValue(fakeEvent("customer.subscription.deleted", subscription));

      const mockSelect = db.select as jest.Mock;
      const mockUpdate = db.update as jest.Mock;

      // First select → no individual request
      mockSelect.mockReturnValueOnce(mockSelectChain([]));
      // Second select → team request found
      mockSelect.mockReturnValueOnce(mockSelectChain([{ id: 55 }]));
      mockUpdate.mockReturnValue(mockUpdateChain());

      const { res, status } = makeRes();
      await stripeWebhook(makeReq(), res);

      expect(db.update).toHaveBeenCalledTimes(1);
      expect(status).toHaveBeenCalledWith(200);
    });

    test("does not error when no matching request exists at all", async () => {
      const subscription = makeSubscription("sub_no_match");
      mockConstructEvent.mockReturnValue(fakeEvent("customer.subscription.deleted", subscription));

      const mockSelect = db.select as jest.Mock;

      // Both selects return no rows
      mockSelect.mockReturnValueOnce(mockSelectChain([]));
      mockSelect.mockReturnValueOnce(mockSelectChain([]));

      const { res, status } = makeRes();
      await stripeWebhook(makeReq(), res);

      expect(db.update).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(200);
    });
  });

  // ── Unknown event types ─────────────────────────────────────────────────────

  describe("unknown event type", () => {
    test("returns 200 and does not call any service for an unhandled event type", async () => {
      mockConstructEvent.mockReturnValue(fakeEvent("payment_intent.created", { id: "pi_test" }));

      const { res, status, json } = makeRes();
      await stripeWebhook(makeReq(), res);

      expect(updateRequestFromStripeSession).not.toHaveBeenCalled();
      expect(upsertTeamPendingApprovalFromSessionMetadata).not.toHaveBeenCalled();
      expect(db.update).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith({ received: true });
    });
  });
});
