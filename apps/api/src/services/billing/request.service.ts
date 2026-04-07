import Stripe from "stripe";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  athleteTable,
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
} from "./stripe.service";
import { computePlanPeriodEnd } from "./plan.service";
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
    .where(
      and(
        eq(subscriptionRequestTable.userId, input.userId),
        eq(subscriptionRequestTable.athleteId, input.athleteId)
      )
    )
    .orderBy(desc(subscriptionRequestTable.createdAt))
    .limit(1);
  return rows[0] ?? null;
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
