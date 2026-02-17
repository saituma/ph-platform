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
  return env.stripeSuccessUrl || "http://localhost:3000/parent/billing?stripe=success&session_id={CHECKOUT_SESSION_ID}";
}

function getCancelUrl() {
  return env.stripeCancelUrl || "http://localhost:3000/parent/billing?stripe=cancel";
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
  stripePriceId?: string | null,
  tier?: (typeof ProgramType.enumValues)[number],
  interval?: "monthly" | "yearly"
) {
  const normalized = (stripePriceId ?? "").trim();
  if (!normalized || normalized === "manual") {
    const fallback = tier ? resolveTierFallbackPrice(tier, interval).trim() : "";
    if (fallback) return fallback;
    throw new Error("Plan is not configured for Stripe payments");
  }
  return normalized;
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
  displayPrice: string;
  billingInterval: string;
  monthlyPrice?: string;
  yearlyPrice?: string;
  discountType?: string;
  discountValue?: string;
  discountAppliesTo?: string;
  isActive?: boolean;
}) {
  const result = await db
    .insert(subscriptionPlanTable)
    .values({
      name: input.name,
      tier: input.tier,
      stripePriceId: input.stripePriceId,
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
  const result = await db
    .update(subscriptionPlanTable)
    .set({
      ...input,
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
  const priceId = ensureStripePriceId(plan.stripePriceId, plan.tier, input.interval);

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
  const priceId = ensureStripePriceId(plan.stripePriceId, plan.tier, input.interval);

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

export async function confirmPaymentSheetIntent(input: { paymentIntentId: string }) {
  const stripeClient = getStripeClient();
  const intent = await stripeClient.paymentIntents.retrieve(input.paymentIntentId);
  const paymentStatus = intent.status ?? "unknown";
  const nextStatus =
    paymentStatus === "succeeded" || paymentStatus === "processing"
      ? "pending_approval"
      : "pending_payment";

  const updated = await db
    .update(subscriptionRequestTable)
    .set({
      paymentStatus,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionRequestTable.stripeSessionId, input.paymentIntentId))
    .returning();

  return { intent, request: updated[0] ?? null };
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

  const updated = await db
    .update(subscriptionRequestTable)
    .set({
      paymentStatus,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionRequestTable.id, request.id))
    .returning();

  return { session, request: updated[0] ?? null };
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

  const updated = await db
    .update(subscriptionRequestTable)
    .set({
      paymentStatus,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionRequestTable.id, request.id))
    .returning();

  return updated[0] ?? null;
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
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        requestId: subscriptionRequestTable.id,
        userId: subscriptionRequestTable.userId,
        athleteId: subscriptionRequestTable.athleteId,
        planTier: subscriptionPlanTable.tier,
        guardianId: athleteTable.guardianId,
      })
      .from(subscriptionRequestTable)
      .leftJoin(subscriptionPlanTable, eq(subscriptionRequestTable.planId, subscriptionPlanTable.id))
      .leftJoin(athleteTable, eq(subscriptionRequestTable.athleteId, athleteTable.id))
      .where(eq(subscriptionRequestTable.id, requestId))
      .limit(1);

    const request = rows[0];
    if (!request?.athleteId || !request.planTier) {
      return null;
    }

    if (request.guardianId) {
      await tx
        .update(athleteTable)
        .set({ currentProgramTier: request.planTier, updatedAt: new Date() })
        .where(eq(athleteTable.guardianId, request.guardianId));
    } else {
      await tx
        .update(athleteTable)
        .set({ currentProgramTier: request.planTier, updatedAt: new Date() })
        .where(eq(athleteTable.id, request.athleteId));
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

    return updated[0] ?? null;
  });
}
