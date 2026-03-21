import Stripe from "stripe";
import { and, desc, eq } from "drizzle-orm";

import { env } from "../config/env";
import { db } from "../db";
import {
  athleteTable,
  notificationTable,
  ProgramType,
  subscriptionPlanTable,
  subscriptionRequestTable,
  subscriptionStatus,
  userTable,
} from "../db/schema";
import { sendPushNotification } from "./push.service";
import {
  notifySubscriptionEnteredPendingApproval,
  notifySubscriptionPlanApproved,
} from "./subscription-notifications.service";

function schedulePendingApprovalEmails(requestId: number, previousStatus: string, newStatus: string) {
  if (newStatus !== "pending_approval" || previousStatus === "pending_approval") return;
  void notifySubscriptionEnteredPendingApproval(requestId).catch((err) => {
    console.warn("[Billing] notifySubscriptionEnteredPendingApproval failed", err);
  });
}

const stripe = env.stripeSecretKey
  ? new Stripe(env.stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    })
  : null;

function getStripeClient() {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }
  return stripe;
}

function getSuccessUrl() {
  return env.stripeSuccessUrl;
}

function getCancelUrl() {
  return env.stripeCancelUrl;
}

/** Next period end from plan billing interval (coach approval time). One-time plans → no auto-expiry. */
export function computePlanPeriodEnd(billingInterval: string | null | undefined, from: Date): Date | null {
  const bi = (billingInterval ?? "").trim().toLowerCase();
  if (!bi || bi === "one_time") return null;
  const d = new Date(from.getTime());
  if (bi === "monthly") {
    d.setMonth(d.getMonth() + 1);
    return d;
  }
  if (bi === "yearly" || bi === "annual") {
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  return null;
}

function resolveTierFallbackPrice(
  tier: (typeof ProgramType.enumValues)[number],
  interval?: "monthly" | "yearly"
) {
  if (interval === "monthly") {
    if (tier === "PHP") return env.stripePricePhpMonthly || env.stripePricePhp;
    if (tier === "PHP_Plus") return env.stripePricePlusMonthly || env.stripePricePlus;
    if (tier === "PHP_Premium") return env.stripePricePremiumMonthly || env.stripePricePremium;
  }
  if (interval === "yearly") {
    if (tier === "PHP") return env.stripePricePhpYearly || env.stripePricePhp;
    if (tier === "PHP_Plus") return env.stripePricePlusYearly || env.stripePricePlus;
    if (tier === "PHP_Premium") return env.stripePricePremiumYearly || env.stripePricePremium;
  }
  if (tier === "PHP") return env.stripePricePhp;
  if (tier === "PHP_Plus") return env.stripePricePlus;
  if (tier === "PHP_Premium") return env.stripePricePremium;
  return "";
}

function ensureStripePriceId(
  plan: {
    stripePriceId?: string | null;
    stripePriceIdMonthly?: string | null;
    stripePriceIdYearly?: string | null;
    tier?: (typeof ProgramType.enumValues)[number];
  },
  interval?: "monthly" | "yearly"
) {
  const intervalPrice =
    interval === "monthly"
      ? (plan.stripePriceIdMonthly ?? "").trim()
      : interval === "yearly"
      ? (plan.stripePriceIdYearly ?? "").trim()
      : "";
  if (intervalPrice) return intervalPrice;
  const normalized = (plan.stripePriceId ?? "").trim();
  if (!normalized || normalized === "manual") {
    const fallback = plan.tier ? resolveTierFallbackPrice(plan.tier, interval).trim() : "";
    if (fallback) return fallback;
    throw new Error("Plan is not configured for Stripe payments");
  }
  return normalized;
}

function parsePriceToCents(value?: string | null): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

function applyDiscountToAmount(input: {
  originalCents: number;
  discountType?: string | null;
  discountValue?: string | null;
  discountAppliesTo?: string | null;
  interval: "monthly" | "yearly";
}) {
  const { originalCents, discountType, discountValue, discountAppliesTo, interval } = input;
  const appliesTo =
    discountAppliesTo === "monthly"
      ? "monthly"
      : discountAppliesTo === "yearly"
      ? "yearly"
      : discountAppliesTo === "both"
      ? "both"
      : null;
  if (!appliesTo || (appliesTo !== "both" && appliesTo !== interval)) {
    return originalCents;
  }
  if (!discountType || !discountValue) {
    return originalCents;
  }
  if (discountType === "percent") {
    const percent = Number(discountValue);
    if (!Number.isFinite(percent) || percent <= 0) return originalCents;
    const discounted = Math.round(originalCents * (1 - percent / 100));
    return discounted > 0 ? discounted : originalCents;
  }
  if (discountType === "amount") {
    const discounted = parsePriceToCents(discountValue);
    if (!discounted || discounted <= 0) return originalCents;
    return discounted;
  }
  return originalCents;
}

async function createStripePriceForPlan(input: {
  name: string;
  tier: (typeof ProgramType.enumValues)[number];
  interval: "monthly" | "yearly";
  unitAmount: number;
}) {
  const stripeClient = getStripeClient();
  const recurringInterval = input.interval === "yearly" ? "year" : "month";
  const price = await stripeClient.prices.create({
    currency: "gbp",
    unit_amount: input.unitAmount,
    recurring: { interval: recurringInterval },
    product_data: {
      name: `${input.name} (${input.tier.replace("_", " ")} ${input.interval})`,
    },
    metadata: {
      tier: input.tier,
      interval: input.interval,
    },
  });
  return price.id;
}

export async function listSubscriptionPlans(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;
  if (includeInactive) {
    return db.select().from(subscriptionPlanTable).orderBy(subscriptionPlanTable.id);
  }
  return db
    .select()
    .from(subscriptionPlanTable)
    .where(eq(subscriptionPlanTable.isActive, true))
    .orderBy(subscriptionPlanTable.id);
}

export async function getLatestSubscriptionRequest(input: { userId: number; athleteId: number }) {
  const rows = await db
    .select({
      requestId: subscriptionRequestTable.id,
      status: subscriptionRequestTable.status,
      paymentStatus: subscriptionRequestTable.paymentStatus,
      stripeSessionId: subscriptionRequestTable.stripeSessionId,
      createdAt: subscriptionRequestTable.createdAt,
      planId: subscriptionPlanTable.id,
      planName: subscriptionPlanTable.name,
      planTier: subscriptionPlanTable.tier,
      displayPrice: subscriptionPlanTable.displayPrice,
      billingInterval: subscriptionPlanTable.billingInterval,
    })
    .from(subscriptionRequestTable)
    .leftJoin(subscriptionPlanTable, eq(subscriptionRequestTable.planId, subscriptionPlanTable.id))
    .where(and(eq(subscriptionRequestTable.userId, input.userId), eq(subscriptionRequestTable.athleteId, input.athleteId)))
    .orderBy(desc(subscriptionRequestTable.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function createSubscriptionPlan(input: {
  name: string;
  tier: (typeof ProgramType.enumValues)[number];
  stripePriceId: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  displayPrice: string;
  billingInterval: string;
  monthlyPrice?: string;
  yearlyPrice?: string;
  discountType?: string;
  discountValue?: string;
  discountAppliesTo?: string;
  isActive?: boolean;
}) {
  let stripePriceIdMonthly = input.stripePriceIdMonthly;
  let stripePriceIdYearly = input.stripePriceIdYearly;
  let stripePriceId = input.stripePriceId || "manual";
  if (stripe) {
    const monthlyAmount = parsePriceToCents(input.monthlyPrice);
    const yearlyAmount = parsePriceToCents(input.yearlyPrice);
    if (monthlyAmount) {
      const discountedMonthly = applyDiscountToAmount({
        originalCents: monthlyAmount,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAppliesTo: input.discountAppliesTo,
        interval: "monthly",
      });
      stripePriceIdMonthly = await createStripePriceForPlan({
        name: input.name,
        tier: input.tier,
        interval: "monthly",
        unitAmount: discountedMonthly,
      });
      stripePriceId = stripePriceIdMonthly;
    }
    if (yearlyAmount) {
      const discountedYearly = applyDiscountToAmount({
        originalCents: yearlyAmount,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAppliesTo: input.discountAppliesTo,
        interval: "yearly",
      });
      stripePriceIdYearly = await createStripePriceForPlan({
        name: input.name,
        tier: input.tier,
        interval: "yearly",
        unitAmount: discountedYearly,
      });
      if (!stripePriceId) stripePriceId = stripePriceIdYearly;
    }
  }

  const result = await db
    .insert(subscriptionPlanTable)
    .values({
      name: input.name,
      tier: input.tier,
      stripePriceId,
      stripePriceIdMonthly,
      stripePriceIdYearly,
      displayPrice: input.displayPrice,
      billingInterval: input.billingInterval,
      monthlyPrice: input.monthlyPrice,
      yearlyPrice: input.yearlyPrice,
      discountType: input.discountType,
      discountValue: input.discountValue,
      discountAppliesTo: input.discountAppliesTo,
      isActive: input.isActive ?? true,
    })
    .returning();
  return result[0] ?? null;
}

export async function updateSubscriptionPlan(
  planId: number,
  input: Partial<{
    name: string;
    tier: (typeof ProgramType.enumValues)[number];
    stripePriceId: string;
    stripePriceIdMonthly: string;
    stripePriceIdYearly: string;
    displayPrice: string;
    billingInterval: string;
    monthlyPrice: string;
    yearlyPrice: string;
    discountType: string;
    discountValue: string;
    discountAppliesTo: string;
    isActive: boolean;
  }>
) {
  const existingRows = await db
    .select()
    .from(subscriptionPlanTable)
    .where(eq(subscriptionPlanTable.id, planId))
    .limit(1);
  const existing = existingRows[0];
  if (!existing) {
    return null;
  }

  let stripePriceIdMonthly = input.stripePriceIdMonthly ?? existing.stripePriceIdMonthly ?? null;
  let stripePriceIdYearly = input.stripePriceIdYearly ?? existing.stripePriceIdYearly ?? null;
  let stripePriceId = input.stripePriceId ?? existing.stripePriceId;
  if (stripe) {
    const nextName = input.name ?? existing.name;
    const nextTier = input.tier ?? existing.tier;
    const monthlyAmount = parsePriceToCents(input.monthlyPrice ?? existing.monthlyPrice);
    const yearlyAmount = parsePriceToCents(input.yearlyPrice ?? existing.yearlyPrice);
    const discountType = input.discountType ?? existing.discountType ?? null;
    const discountValue = input.discountValue ?? existing.discountValue ?? null;
    const discountAppliesTo = input.discountAppliesTo ?? existing.discountAppliesTo ?? null;
    if (monthlyAmount) {
      const discountedMonthly = applyDiscountToAmount({
        originalCents: monthlyAmount,
        discountType,
        discountValue,
        discountAppliesTo,
        interval: "monthly",
      });
      stripePriceIdMonthly = await createStripePriceForPlan({
        name: nextName,
        tier: nextTier,
        interval: "monthly",
        unitAmount: discountedMonthly,
      });
      stripePriceId = stripePriceIdMonthly;
    }
    if (yearlyAmount) {
      const discountedYearly = applyDiscountToAmount({
        originalCents: yearlyAmount,
        discountType,
        discountValue,
        discountAppliesTo,
        interval: "yearly",
      });
      stripePriceIdYearly = await createStripePriceForPlan({
        name: nextName,
        tier: nextTier,
        interval: "yearly",
        unitAmount: discountedYearly,
      });
      if (!stripePriceId) stripePriceId = stripePriceIdYearly;
    }
  }
  const result = await db
    .update(subscriptionPlanTable)
    .set({
      ...input,
      stripePriceId,
      stripePriceIdMonthly,
      stripePriceIdYearly,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionPlanTable.id, planId))
    .returning();
  return result[0] ?? null;
}

export async function createCheckoutSession(input: {
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
  const mode = plan.billingInterval === "one_time" ? "payment" : "subscription";
  const session = await stripeClient.checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: getSuccessUrl(),
    cancel_url: getCancelUrl(),
    customer_email: input.userEmail,
    metadata: {
      planId: String(plan.id),
      userId: String(input.userId),
      athleteId: String(input.athleteId),
    },
    client_reference_id: `${input.userId}:${input.athleteId}:${plan.id}`,
  });

  const request = await db
    .insert(subscriptionRequestTable)
    .values({
      userId: input.userId,
      athleteId: input.athleteId,
      planId: plan.id,
      stripeSessionId: session.id,
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
    { apiVersion: "2025-02-24.acacia" }
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
    const intent = (subscription.latest_invoice as Stripe.Invoice | null)?.payment_intent as
      | Stripe.PaymentIntent
      | null;
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
    paymentStatus === "succeeded" || paymentStatus === "processing"
      ? "pending_approval"
      : "pending_payment";

  const prior = await db
    .select()
    .from(subscriptionRequestTable)
    .where(
      and(
        eq(subscriptionRequestTable.stripeSessionId, input.paymentIntentId),
        eq(subscriptionRequestTable.userId, input.userId)
      )
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
        eq(subscriptionRequestTable.userId, input.userId)
      )
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
        eq(subscriptionRequestTable.userId, input.userId)
      )
    )
    .limit(1);

  const request = requests[0] ?? null;
  if (!request) {
    return { session, request: null };
  }

  const nextStatus =
    paymentStatus === "paid" || paymentStatus === "no_payment_required"
      ? "pending_approval"
      : "pending_payment";

  const previousStatus = request.status;

  const updated = await db
    .update(subscriptionRequestTable)
    .set({
      paymentStatus,
      status: nextStatus,
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

export async function updateRequestFromStripeSession(sessionId: string, paymentStatus: string) {
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
    paymentStatus === "paid" || paymentStatus === "no_payment_required"
      ? "pending_approval"
      : "pending_payment";

  const previousStatus = request.status;

  const updated = await db
    .update(subscriptionRequestTable)
    .set({
      paymentStatus,
      status: nextStatus,
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
  return db
    .select({
      requestId: subscriptionRequestTable.id,
      status: subscriptionRequestTable.status,
      paymentStatus: subscriptionRequestTable.paymentStatus,
      stripeSessionId: subscriptionRequestTable.stripeSessionId,
      createdAt: subscriptionRequestTable.createdAt,
      userId: userTable.id,
      userName: userTable.name,
      userEmail: userTable.email,
      athleteId: athleteTable.id,
      athleteName: athleteTable.name,
      planId: subscriptionPlanTable.id,
      planName: subscriptionPlanTable.name,
      planTier: subscriptionPlanTable.tier,
      displayPrice: subscriptionPlanTable.displayPrice,
      billingInterval: subscriptionPlanTable.billingInterval,
    })
    .from(subscriptionRequestTable)
    .leftJoin(userTable, eq(subscriptionRequestTable.userId, userTable.id))
    .leftJoin(athleteTable, eq(subscriptionRequestTable.athleteId, athleteTable.id))
    .leftJoin(subscriptionPlanTable, eq(subscriptionRequestTable.planId, subscriptionPlanTable.id))
    .orderBy(desc(subscriptionRequestTable.createdAt));
}

export async function updateSubscriptionRequestStatus(
  requestId: number,
  status: (typeof subscriptionStatus.enumValues)[number]
) {
  const result = await db
    .update(subscriptionRequestTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(subscriptionRequestTable.id, requestId))
    .returning();
  return result[0] ?? null;
}

export async function approveSubscriptionRequest(requestId: number) {
  const { row, planApprovedEmail } = await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        requestId: subscriptionRequestTable.id,
        userId: subscriptionRequestTable.userId,
        athleteId: subscriptionRequestTable.athleteId,
        planTier: subscriptionPlanTable.tier,
        billingInterval: subscriptionPlanTable.billingInterval,
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

    const planExpiresAt = computePlanPeriodEnd(request.billingInterval, new Date());
    const tierPayload = {
      currentProgramTier: request.planTier,
      planExpiresAt,
      planRenewalReminderSentAt: null as null,
      updatedAt: new Date(),
    };

    if (request.guardianId) {
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
        { url: "/plans", type: "plan_approved", planTier: request.planTier }
      );
    } catch (error) {
      console.error("[Billing] Failed to send plan approval push:", error);
    }

    const approvedRow = updated[0] ?? null;
    const planApprovedEmail = approvedRow
      ? { userId: request.userId, planTier: request.planTier }
      : null;
    return { row: approvedRow, planApprovedEmail };
  });

  if (planApprovedEmail) {
    void notifySubscriptionPlanApproved(planApprovedEmail.userId, planApprovedEmail.planTier).catch((err) => {
      console.warn("[Billing] notifySubscriptionPlanApproved failed", err);
    });
  }

  return row;
}
