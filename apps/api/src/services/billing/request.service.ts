import Stripe from "stripe";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  athleteTable,
  guardianTable,
  notificationTable,
  subscriptionPlanTable,
  subscriptionRequestTable,
  subscriptionStatus,
  userTable,
} from "../../db/schema";
import {
  getStripeClient,
  getSuccessUrl,
  getCancelUrl,
  ensureStripePriceId,
  ensureAthleteCheckoutPriceId,
  checkoutModeForBillingCycle,
  lookupKeyForAthleteBilling,
  ATHLETE_BILLING_CYCLES,
  type AthleteBillingCycle,
} from "./stripe.service";
import { newReceiptPublicId } from "../../lib/receipt-public-id";
import { checkoutSessionPaymentIntentId } from "../../lib/stripe-checkout-receipt";
import { computePlanPeriodEnd, computeAthleteAccessEnd, quoteAthleteBillingCycleAmount } from "./plan.service";
import { sendPushNotification } from "../push.service";
import {
  notifySubscriptionEnteredPendingApproval,
  notifySubscriptionPlanApproved,
} from "../subscription-notifications.service";

function schedulePendingApprovalEmails(requestId: number, previousStatus: string, newStatus: string) {
  if (newStatus !== "pending_approval" || previousStatus === "pending_approval") return;
  void notifySubscriptionEnteredPendingApproval(requestId).catch((err) => {
    console.warn("[Billing] notifySubscriptionEnteredPendingApproval failed", err);
  });
}

function isPaidStatus(paymentStatus: string | null | undefined) {
  const normalized = String(paymentStatus ?? "")
    .trim()
    .toLowerCase();
  return normalized === "paid" || normalized === "no_payment_required";
}

function isStripeNotFoundError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const e = error as { statusCode?: unknown; code?: unknown };
  return e.statusCode === 404 || e.code === "resource_missing";
}

function stripeModeFromSecretKey(secretKey: string | null | undefined): "test" | "live" | "unknown" {
  const normalized = String(secretKey ?? "").trim();
  if (normalized.startsWith("sk_test_")) return "test";
  if (normalized.startsWith("sk_live_")) return "live";
  return "unknown";
}

function paymentStatusFromPaymentIntentStatus(status?: string | null): string {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "succeeded") return "paid";
  if (normalized === "canceled") return "canceled";
  if (normalized === "processing") return "processing";
  return "unpaid";
}

export async function syncSubscriptionRequestPaymentFromStripe(requestId: number) {
  const rows = await db
    .select({
      id: subscriptionRequestTable.id,
      status: subscriptionRequestTable.status,
      paymentStatus: subscriptionRequestTable.paymentStatus,
      stripeSessionId: subscriptionRequestTable.stripeSessionId,
    })
    .from(subscriptionRequestTable)
    .where(eq(subscriptionRequestTable.id, requestId))
    .limit(1);

  const request = rows[0] ?? null;
  if (!request) return null;
  const stripeId = String(request.stripeSessionId ?? "").trim();
  if (!stripeId) {
    throw new Error(`Cannot sync request #${requestId}: missing Stripe reference id`);
  }

  const stripeClient = getStripeClient();

  let paymentStatus: string = request.paymentStatus ?? "unpaid";
  try {
    if (stripeId.startsWith("cs_")) {
      const session = await stripeClient.checkout.sessions.retrieve(stripeId);
      paymentStatus = session.payment_status ?? "unpaid";
    } else if (stripeId.startsWith("pi_")) {
      const intent = await stripeClient.paymentIntents.retrieve(stripeId);
      paymentStatus = paymentStatusFromPaymentIntentStatus(intent.status);
    } else {
      throw new Error(`Unsupported Stripe reference id "${stripeId}"`);
    }
  } catch (error: unknown) {
    if (isStripeNotFoundError(error)) {
      throw new Error(
        `Stripe could not find "${stripeId}". Check STRIPE_SECRET_KEY (test vs live) and that this request was created in the same Stripe account.`,
      );
    }
    throw error;
  }

  const nextStatus = isPaidStatus(paymentStatus) ? "pending_approval" : "pending_payment";
  const previousStatus = request.status;

  const updated = await db
    .update(subscriptionRequestTable)
    .set({
      paymentStatus,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionRequestTable.id, requestId))
    .returning();

  const row = updated[0] ?? null;
  if (row) {
    schedulePendingApprovalEmails(row.id, previousStatus, row.status);
  }

  return row;
}

export async function createCheckoutSession(input: {
  userId: number;
  userEmail: string;
  athleteId: number;
  planId: number;
  /** @deprecated use billingCycle */
  interval?: "monthly" | "yearly";
  billingCycle?: AthleteBillingCycle | "one_time";
}) {
  const plans = await db
    .select()
    .from(subscriptionPlanTable)
    .where(eq(subscriptionPlanTable.id, input.planId))
    .limit(1);
  const plan = plans[0];
  if (!plan || !plan.isActive) {
    throw new Error("Plan not available");
  }

  // Anti-duplicate: a user can only have one active subscription per (athlete, plan).
  // If they're already approved or awaiting review for this plan, block the new checkout.
  // If they have an unfinished `pending_payment` for the same plan, reuse the existing
  // Stripe checkout session URL instead of creating a fresh one (prevents accidental double pays).
  const existingForPlan = await db
    .select()
    .from(subscriptionRequestTable)
    .where(
      and(
        eq(subscriptionRequestTable.userId, input.userId),
        eq(subscriptionRequestTable.athleteId, input.athleteId),
        eq(subscriptionRequestTable.planId, input.planId),
      ),
    )
    .orderBy(desc(subscriptionRequestTable.createdAt));

  const alreadyActive = existingForPlan.find(
    (r) => r.status === "approved" || r.status === "pending_approval",
  );
  if (alreadyActive) {
    const reason =
      alreadyActive.status === "approved"
        ? "You already have an active subscription for this plan."
        : "Your previous payment is awaiting coach review — please wait.";
    const err = new Error(reason) as Error & { statusCode?: number; code?: string };
    err.statusCode = 409;
    err.code = "subscription_already_exists";
    throw err;
  }

  const reusable = existingForPlan.find(
    (r) => r.status === "pending_payment" && r.stripeSessionId,
  );
  if (reusable && reusable.stripeSessionId) {
    try {
      const stripeClient = getStripeClient();
      const existing = await stripeClient.checkout.sessions.retrieve(reusable.stripeSessionId);
      if (existing.url && existing.status === "open") {
        return { session: existing, request: reusable };
      }
    } catch {
      // Stale session — fall through and create a new one below.
    }
  }

  const billingCycle = input.billingCycle ?? "monthly";
  let priceId: string;
  let mode: "subscription" | "payment";
  if (billingCycle === "one_time") {
    if (!plan.stripePriceIdOneTime) {
      throw new Error(`Plan is not configured for Stripe payments (one_time price missing for plan #${plan.id}).`);
    }
    priceId = plan.stripePriceIdOneTime;
    mode = "payment";
  } else if (billingCycle === "six_months" && plan.stripePriceIdOneTime) {
    // 6-months one-time payments live in `stripePriceIdOneTime` (with Stripe lookup key `<tier>_six_months`).
    priceId = plan.stripePriceIdOneTime;
    mode = "payment";
  } else {
    priceId = await ensureAthleteCheckoutPriceId(plan, billingCycle);
    mode = checkoutModeForBillingCycle(billingCycle);
  }

  const stripeClient = getStripeClient();
  try {
    await stripeClient.prices.retrieve(priceId);
  } catch (error: unknown) {
    if (isStripeNotFoundError(error)) {
      const stripeMode = stripeModeFromSecretKey(process.env.STRIPE_SECRET_KEY);
      const hint =
        billingCycle === "one_time"
          ? `Recreate the plan's one-time Stripe price (currently "${plan.stripePriceIdOneTime ?? "unset"}").`
          : `Create/activate a Stripe Price with lookup key "${lookupKeyForAthleteBilling(plan.tier, billingCycle)}" in Stripe (${stripeMode} mode), or update the plan's Stripe price id to a valid one in the same Stripe account/mode.`;
      throw new Error(
        `Stripe could not find price "${priceId}" for plan #${plan.id} (${plan.tier}, ${billingCycle}). ${hint}`,
      );
    }
    throw error;
  }

  const session = await stripeClient.checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${getSuccessUrl()}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: getCancelUrl(),
    customer_email: input.userEmail,
    metadata: {
      planId: String(plan.id),
      userId: String(input.userId),
      athleteId: String(input.athleteId),
      planBillingCycle: billingCycle,
    },
    client_reference_id: `${input.userId}:${input.athleteId}:${plan.id}`,
  });

  const request = await db
    .insert(subscriptionRequestTable)
    .values({
      userId: input.userId,
      athleteId: input.athleteId,
      planId: plan.id,
      planBillingCycle: billingCycle,
      stripeSessionId: session.id,
      receiptPublicId: newReceiptPublicId(),
      paymentStatus: session.payment_status ?? "unpaid",
      status: "pending_payment",
    })
    .returning();

  return { session, request: request[0] ?? null };
}

export async function createPaymentSheetIntent(input: {
  userId: number;
  userEmail: string;
  athleteId: number;
  planId: number;
  interval?: "monthly" | "yearly";
}) {
  const plans = await db
    .select()
    .from(subscriptionPlanTable)
    .where(eq(subscriptionPlanTable.id, input.planId))
    .limit(1);
  const plan = plans[0];
  if (!plan || !plan.isActive) {
    throw new Error("Plan not available");
  }
  const priceId = ensureStripePriceId(plan, input.interval);

  const stripeClient = getStripeClient();
  const customer = await stripeClient.customers.create({
    email: input.userEmail,
    metadata: { userId: String(input.userId), athleteId: String(input.athleteId) },
  });
  const ephemeralKey = await stripeClient.ephemeralKeys.create(
    { customer: customer.id },
    { apiVersion: "2025-02-24.acacia" },
  );

  let paymentIntentId: string;
  let clientSecret: string | null;
  let paymentStatus: string | null = null;

  if (plan.billingInterval === "one_time") {
    const price = await stripeClient.prices.retrieve(priceId);
    const amount = price.unit_amount ?? 0;
    if (!amount || !price.currency) {
      throw new Error("Invalid Stripe price");
    }
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount,
      currency: price.currency,
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
      metadata: {
        planId: String(plan.id),
        userId: String(input.userId),
        athleteId: String(input.athleteId),
      },
    });
    paymentIntentId = paymentIntent.id;
    clientSecret = paymentIntent.client_secret ?? null;
    paymentStatus = paymentIntent.status ?? null;
  } else {
    const subscription = await stripeClient.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        planId: String(plan.id),
        userId: String(input.userId),
        athleteId: String(input.athleteId),
      },
    });
    const intent = (subscription.latest_invoice as Stripe.Invoice | null)
      ?.payment_intent as Stripe.PaymentIntent | null;
    if (!intent) {
      throw new Error("Unable to create payment intent");
    }
    paymentIntentId = intent.id;
    clientSecret = intent.client_secret ?? null;
    paymentStatus = intent.status ?? null;
  }

  if (!clientSecret) {
    throw new Error("Missing payment intent client secret");
  }

  const request = await db
    .insert(subscriptionRequestTable)
    .values({
      userId: input.userId,
      athleteId: input.athleteId,
      planId: plan.id,
      receiptPublicId: newReceiptPublicId(),
      stripeSessionId: paymentIntentId,
      paymentStatus: paymentStatus ?? "requires_payment_method",
      status: "pending_payment",
    })
    .returning();

  return {
    customerId: customer.id,
    ephemeralKey: ephemeralKey.secret,
    paymentIntentId,
    paymentIntentClientSecret: clientSecret,
    request: request[0] ?? null,
  };
}

export async function confirmPaymentSheetIntent(input: { paymentIntentId: string; userId: number }) {
  const stripeClient = getStripeClient();
  const intent = await stripeClient.paymentIntents.retrieve(input.paymentIntentId);
  const paymentStatus = intent.status ?? "unknown";
  const nextStatus =
    paymentStatus === "succeeded" || paymentStatus === "processing" ? "pending_approval" : "pending_payment";

  const prior = await db
    .select()
    .from(subscriptionRequestTable)
    .where(
      and(
        eq(subscriptionRequestTable.stripeSessionId, input.paymentIntentId),
        eq(subscriptionRequestTable.userId, input.userId),
      ),
    )
    .limit(1);
  const previousStatus = prior[0]?.status ?? "pending_payment";

  const updated = await db
    .update(subscriptionRequestTable)
    .set({
      paymentStatus,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(subscriptionRequestTable.stripeSessionId, input.paymentIntentId),
        eq(subscriptionRequestTable.userId, input.userId),
      ),
    )
    .returning();

  const row = updated[0] ?? null;
  if (row) {
    schedulePendingApprovalEmails(row.id, previousStatus, row.status);
  }

  return { intent, request: row };
}

export async function confirmCheckoutSession(input: { sessionId: string; userId: number }) {
  const stripeClient = getStripeClient();
  const session = await stripeClient.checkout.sessions.retrieve(input.sessionId);
  const paymentStatus = session.payment_status ?? "unpaid";

  const requests = await db
    .select()
    .from(subscriptionRequestTable)
    .where(
      and(
        eq(subscriptionRequestTable.stripeSessionId, input.sessionId),
        eq(subscriptionRequestTable.userId, input.userId),
      ),
    )
    .limit(1);

  const request = requests[0] ?? null;
  if (!request) {
    return { session, request: null };
  }

  const nextStatus =
    paymentStatus === "paid" || paymentStatus === "no_payment_required" ? "pending_approval" : "pending_payment";

  const previousStatus = request.status;

  const amountCents = typeof session.amount_total === "number" ? session.amount_total : null;
  const currency = typeof session.currency === "string" ? session.currency : null;
  const stripePaymentIntentId = checkoutSessionPaymentIntentId(session);
  const receiptPublicId = request.receiptPublicId?.trim() || newReceiptPublicId();

  const updated = await db
    .update(subscriptionRequestTable)
    .set({
      paymentStatus,
      status: nextStatus,
      paymentAmountCents: amountCents ?? request.paymentAmountCents,
      paymentCurrency: currency ?? request.paymentCurrency,
      stripePaymentIntentId: stripePaymentIntentId ?? request.stripePaymentIntentId,
      receiptPublicId,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionRequestTable.id, request.id))
    .returning();

  const row = updated[0] ?? null;
  if (row) {
    schedulePendingApprovalEmails(row.id, previousStatus, row.status);
  }

  return { session, request: row };
}

export async function updateRequestFromStripeSession(session: Stripe.Checkout.Session) {
  const sessionId = String(session.id ?? "").trim();
  if (!sessionId) return null;

  const paymentStatus = session.payment_status ?? "unpaid";

  const requests = await db
    .select()
    .from(subscriptionRequestTable)
    .where(eq(subscriptionRequestTable.stripeSessionId, sessionId))
    .limit(1);

  const request = requests[0] ?? null;
  if (!request) {
    return null;
  }

  const nextStatus =
    paymentStatus === "paid" || paymentStatus === "no_payment_required" ? "pending_approval" : "pending_payment";

  const previousStatus = request.status;

  const amountCents = typeof session.amount_total === "number" ? session.amount_total : null;
  const currency = typeof session.currency === "string" ? session.currency : null;
  const stripePaymentIntentId = checkoutSessionPaymentIntentId(session);
  const receiptPublicId = request.receiptPublicId?.trim() || newReceiptPublicId();

  const updated = await db
    .update(subscriptionRequestTable)
    .set({
      paymentStatus,
      status: nextStatus,
      paymentAmountCents: amountCents ?? request.paymentAmountCents,
      paymentCurrency: currency ?? request.paymentCurrency,
      stripePaymentIntentId: stripePaymentIntentId ?? request.stripePaymentIntentId,
      receiptPublicId,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionRequestTable.id, request.id))
    .returning();

  const row = updated[0] ?? null;
  if (row) {
    schedulePendingApprovalEmails(row.id, previousStatus, row.status);
  }

  return row;
}

export async function listSubscriptionRequests() {
  const rows = await db
    .select({
      requestId: subscriptionRequestTable.id,
      status: subscriptionRequestTable.status,
      paymentStatus: subscriptionRequestTable.paymentStatus,
      stripeSessionId: subscriptionRequestTable.stripeSessionId,
      createdAt: subscriptionRequestTable.createdAt,
      planBillingCycle: subscriptionRequestTable.planBillingCycle,
      userId: userTable.id,
      userName: userTable.name,
      userEmail: userTable.email,
      athleteId: athleteTable.id,
      athleteName: athleteTable.name,
      planId: subscriptionPlanTable.id,
      planName: subscriptionPlanTable.name,
      planTier: subscriptionPlanTable.tier,
      planDisplayPrice: subscriptionPlanTable.displayPrice,
      planBillingInterval: subscriptionPlanTable.billingInterval,
      planMonthlyPrice: subscriptionPlanTable.monthlyPrice,
      planYearlyPrice: subscriptionPlanTable.yearlyPrice,
      stripePriceId: subscriptionPlanTable.stripePriceId,
      stripePriceIdMonthly: subscriptionPlanTable.stripePriceIdMonthly,
      stripePriceIdYearly: subscriptionPlanTable.stripePriceIdYearly,
    })
    .from(subscriptionRequestTable)
    .leftJoin(userTable, eq(subscriptionRequestTable.userId, userTable.id))
    .leftJoin(athleteTable, eq(subscriptionRequestTable.athleteId, athleteTable.id))
    .leftJoin(subscriptionPlanTable, eq(subscriptionRequestTable.planId, subscriptionPlanTable.id))
    .orderBy(desc(subscriptionRequestTable.createdAt));

  return Promise.all(
    rows.map(async (row) => {
      const cycleRaw = String(row.planBillingCycle ?? "")
        .trim()
        .toLowerCase();
      const cycle = ATHLETE_BILLING_CYCLES.includes(cycleRaw as AthleteBillingCycle)
        ? (cycleRaw as AthleteBillingCycle)
        : null;

      let displayPrice = row.planDisplayPrice ?? null;
      let billingInterval = row.planBillingInterval ?? null;
      let paymentMode: "subscription" | "payment" | null = null;

      if (cycle && row.planTier) {
        billingInterval = cycle;
        const quote = await quoteAthleteBillingCycleAmount(
          {
            tier: row.planTier,
            stripePriceId: row.stripePriceId,
            stripePriceIdMonthly: row.stripePriceIdMonthly,
            stripePriceIdYearly: row.stripePriceIdYearly,
            displayPrice: row.planDisplayPrice,
            monthlyPrice: row.planMonthlyPrice,
            yearlyPrice: row.planYearlyPrice,
          },
          cycle,
        );
        paymentMode = quote.mode;
        if (quote.amount) {
          displayPrice = cycle === "monthly" ? `${quote.amount}/month` : `${quote.amount} upfront`;
        }
      }

      return {
        requestId: row.requestId,
        status: row.status,
        paymentStatus: row.paymentStatus,
        stripeSessionId: row.stripeSessionId,
        createdAt: row.createdAt,
        userId: row.userId,
        userName: row.userName,
        userEmail: row.userEmail,
        athleteId: row.athleteId,
        athleteName: row.athleteName,
        planId: row.planId,
        planName: row.planName,
        planTier: row.planTier,
        planBillingCycle: row.planBillingCycle,
        displayPrice,
        billingInterval,
        paymentMode,
      };
    }),
  );
}

export async function getLatestSubscriptionRequest(input: { userId: number; athleteId: number }) {
  const rows = await db
    .select({
      requestId: subscriptionRequestTable.id,
      status: subscriptionRequestTable.status,
      paymentStatus: subscriptionRequestTable.paymentStatus,
      stripeSessionId: subscriptionRequestTable.stripeSessionId,
      createdAt: subscriptionRequestTable.createdAt,
      planBillingCycle: subscriptionRequestTable.planBillingCycle,
      planId: subscriptionPlanTable.id,
      planName: subscriptionPlanTable.name,
      planTier: subscriptionPlanTable.tier,
      displayPrice: subscriptionPlanTable.displayPrice,
      billingInterval: subscriptionPlanTable.billingInterval,
    })
    .from(subscriptionRequestTable)
    .leftJoin(subscriptionPlanTable, eq(subscriptionRequestTable.planId, subscriptionPlanTable.id))
    .where(
      and(eq(subscriptionRequestTable.userId, input.userId), eq(subscriptionRequestTable.athleteId, input.athleteId)),
    )
    .orderBy(desc(subscriptionRequestTable.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateSubscriptionRequestStatus(
  requestId: number,
  status: (typeof subscriptionStatus.enumValues)[number],
) {
  const result = await db
    .update(subscriptionRequestTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(subscriptionRequestTable.id, requestId))
    .returning();
  return result[0] ?? null;
}

export async function approveSubscriptionRequest(requestId: number) {
  const current = await db
    .select({
      id: subscriptionRequestTable.id,
      status: subscriptionRequestTable.status,
      paymentStatus: subscriptionRequestTable.paymentStatus,
    })
    .from(subscriptionRequestTable)
    .where(eq(subscriptionRequestTable.id, requestId))
    .limit(1);

  const currentRow = current[0] ?? null;
  if (!currentRow) return null;

  if (!isPaidStatus(currentRow.paymentStatus)) {
    await syncSubscriptionRequestPaymentFromStripe(requestId);
    const refreshed = await db
      .select({
        status: subscriptionRequestTable.status,
        paymentStatus: subscriptionRequestTable.paymentStatus,
      })
      .from(subscriptionRequestTable)
      .where(eq(subscriptionRequestTable.id, requestId))
      .limit(1);
    const refreshedRow = refreshed[0] ?? null;
    if (!isPaidStatus(refreshedRow?.paymentStatus)) {
      throw new Error(
        `Cannot approve request #${requestId}: payment not confirmed (status=${refreshedRow?.status ?? "unknown"}, paymentStatus=${refreshedRow?.paymentStatus ?? "unknown"})`,
      );
    }
  }

  const { row, planApprovedEmail } = await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        requestId: subscriptionRequestTable.id,
        userId: subscriptionRequestTable.userId,
        athleteId: subscriptionRequestTable.athleteId,
        planTier: subscriptionPlanTable.tier,
        billingInterval: subscriptionPlanTable.billingInterval,
        planBillingCycle: subscriptionRequestTable.planBillingCycle,
        guardianId: athleteTable.guardianId,
      })
      .from(subscriptionRequestTable)
      .leftJoin(subscriptionPlanTable, eq(subscriptionRequestTable.planId, subscriptionPlanTable.id))
      .leftJoin(athleteTable, eq(subscriptionRequestTable.athleteId, athleteTable.id))
      .where(eq(subscriptionRequestTable.id, requestId))
      .limit(1);

    const request = rows[0];
    if (!request?.athleteId || !request.planTier) {
      return { row: null as null, planApprovedEmail: null as null };
    }

    const cycleRaw = (request.planBillingCycle ?? "").toLowerCase();
    const planExpiresAt =
      cycleRaw === "one_time"
        ? null
        : cycleRaw === "monthly" || cycleRaw === "six_months" || cycleRaw === "yearly"
          ? computeAthleteAccessEnd(cycleRaw as AthleteBillingCycle, new Date())
          : computePlanPeriodEnd(request.billingInterval, new Date());

    const tierPayload: {
      currentProgramTier: typeof request.planTier;
      planExpiresAt: Date | null;
      planRenewalReminderSentAt: null;
      planPaymentType?: "monthly" | "upfront";
      planCommitmentMonths?: number | null;
      onboardingCompleted: boolean;
      onboardingCompletedAt: Date;
      updatedAt: Date;
    } = {
      currentProgramTier: request.planTier,
      planExpiresAt,
      planRenewalReminderSentAt: null,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
      updatedAt: new Date(),
    };

    if (cycleRaw === "one_time") {
      tierPayload.planPaymentType = "upfront";
      tierPayload.planCommitmentMonths = null;
    } else if (cycleRaw === "monthly" || cycleRaw === "six_months" || cycleRaw === "yearly") {
      tierPayload.planPaymentType = cycleRaw === "monthly" ? "monthly" : "upfront";
      tierPayload.planCommitmentMonths = cycleRaw === "monthly" ? 1 : cycleRaw === "six_months" ? 6 : 12;
    }

    if (request.guardianId) {
      // Guardian owns the tier — set it on the guardian record (source of truth)
      // and mirror to managed athletes so expiry/content-gating queries still work.
      await tx.update(guardianTable).set({ currentProgramTier: request.planTier, updatedAt: new Date() }).where(eq(guardianTable.id, request.guardianId));
      await tx.update(athleteTable).set(tierPayload).where(eq(athleteTable.guardianId, request.guardianId));
    } else {
      await tx.update(athleteTable).set(tierPayload).where(eq(athleteTable.id, request.athleteId));
    }

    const updated = await tx
      .update(subscriptionRequestTable)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(subscriptionRequestTable.id, requestId))
      .returning();

    await tx.insert(notificationTable).values({
      userId: request.userId,
      type: "plan_approved",
      content: `Your ${request.planTier.replace("_", " ")} plan has been approved.`,
      link: "/plans",
      read: false,
    });

    try {
      await sendPushNotification(
        request.userId,
        "Plan approved",
        `Your ${request.planTier.replace("_", " ")} plan is now active.`,
        { url: "/plans", type: "plan_approved", planTier: request.planTier },
      );
    } catch (error) {
      console.error("[Billing] Failed to send plan approval push:", error);
    }

    const approvedRow = updated[0] ?? null;
    const planApprovedEmail = approvedRow ? { userId: request.userId, planTier: request.planTier } : null;
    return { row: approvedRow, planApprovedEmail };
  });

  if (planApprovedEmail) {
    void notifySubscriptionPlanApproved(planApprovedEmail.userId, planApprovedEmail.planTier).catch((err) => {
      console.warn("[Billing] notifySubscriptionPlanApproved failed", err);
    });
  }

  return row;
}
