import Stripe from "stripe";
import { and, desc, eq } from "drizzle-orm";

import { db } from "../../db";
import { subscriptionPlanTable, teamSubscriptionRequestTable, teamTable, userTable } from "../../db/schema";
import { newReceiptPublicId } from "../../lib/receipt-public-id";
import { checkoutSessionPaymentIntentId } from "../../lib/stripe-checkout-receipt";
import { getStripeClient } from "./stripe.service";
import {
  notifyTeamSubscriptionEnteredPendingApproval,
  notifyTeamSubscriptionApproved,
} from "../team-subscription-notifications.service";

function scheduleTeamPendingApprovalEmails(requestId: number, previousStatus: string, newStatus: string) {
  if (newStatus !== "pending_approval" || previousStatus === "pending_approval") return;
  void notifyTeamSubscriptionEnteredPendingApproval(requestId).catch((err) => {
    console.warn("[Billing] notifyTeamSubscriptionEnteredPendingApproval failed", err);
  });
}

export async function createTeamSubscriptionRequest(input: {
  adminId: number;
  teamId: number;
  planId: number;
  planBillingCycle: "monthly" | "six_months" | "yearly";
  stripeSessionId: string;
  stripeSubscriptionId?: string | null;
}) {
  const [row] = await db
    .insert(teamSubscriptionRequestTable)
    .values({
      adminId: input.adminId,
      teamId: input.teamId,
      planId: input.planId,
      planBillingCycle: input.planBillingCycle,
      stripeSessionId: input.stripeSessionId,
      stripeSubscriptionId: input.stripeSubscriptionId ?? null,
      receiptPublicId: newReceiptPublicId(),
      paymentStatus: "unpaid",
      status: "pending_payment",
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: teamSubscriptionRequestTable.stripeSessionId })
    .returning();

  return row ?? null;
}

export async function updateTeamRequestFromStripeCheckoutSession(
  session: Stripe.Checkout.Session,
  paymentStatus: string,
) {
  const sessionId = String(session.id ?? "").trim();
  if (!sessionId) return null;

  const requests = await db
    .select()
    .from(teamSubscriptionRequestTable)
    .where(eq(teamSubscriptionRequestTable.stripeSessionId, sessionId))
    .limit(1);
  const request = requests[0] ?? null;
  if (!request) return null;

  const nextStatus =
    paymentStatus === "paid" || paymentStatus === "no_payment_required" ? "pending_approval" : "pending_payment";

  const previousStatus = request.status;

  const amountCents =
    typeof (session as any).amount_total === "number" ? ((session as any).amount_total as number) : null;
  const currency = typeof (session as any).currency === "string" ? ((session as any).currency as string) || null : null;
  const stripeSubscriptionId =
    typeof (session as any).subscription === "string" ? ((session as any).subscription as string) : null;
  const stripePaymentIntentId = checkoutSessionPaymentIntentId(session);
  const receiptPublicId = request.receiptPublicId?.trim() || newReceiptPublicId();

  const updated = await db
    .update(teamSubscriptionRequestTable)
    .set({
      paymentStatus,
      status: nextStatus,
      paymentAmountCents: amountCents,
      paymentCurrency: currency,
      stripeSubscriptionId: stripeSubscriptionId ?? request.stripeSubscriptionId,
      stripePaymentIntentId: stripePaymentIntentId ?? request.stripePaymentIntentId,
      receiptPublicId,
      updatedAt: new Date(),
    })
    .where(eq(teamSubscriptionRequestTable.id, request.id))
    .returning();

  const row = updated[0] ?? null;
  if (row) {
    scheduleTeamPendingApprovalEmails(row.id, previousStatus, row.status);
  }

  return row;
}

export async function syncTeamSubscriptionRequestPaymentFromStripe(requestId: number) {
  const rows = await db
    .select({
      id: teamSubscriptionRequestTable.id,
      stripeSessionId: teamSubscriptionRequestTable.stripeSessionId,
      status: teamSubscriptionRequestTable.status,
    })
    .from(teamSubscriptionRequestTable)
    .where(eq(teamSubscriptionRequestTable.id, requestId))
    .limit(1);
  const request = rows[0] ?? null;
  if (!request) return null;

  const sessionId = String(request.stripeSessionId ?? "").trim();
  if (!sessionId) {
    throw new Error(`Cannot sync team request #${requestId}: missing Stripe session id`);
  }

  const stripeClient = getStripeClient();
  const session = await stripeClient.checkout.sessions.retrieve(sessionId);
  const paymentStatus = session.payment_status ?? "unpaid";
  return updateTeamRequestFromStripeCheckoutSession(session, paymentStatus);
}

export async function listTeamSubscriptionRequestsAdmin() {
  const rows = await db
    .select({
      requestId: teamSubscriptionRequestTable.id,
      status: teamSubscriptionRequestTable.status,
      paymentStatus: teamSubscriptionRequestTable.paymentStatus,
      planBillingCycle: teamSubscriptionRequestTable.planBillingCycle,
      createdAt: teamSubscriptionRequestTable.createdAt,
      adminId: userTable.id,
      adminName: userTable.name,
      adminEmail: userTable.email,
      teamId: teamTable.id,
      teamName: teamTable.name,
      maxAthletes: teamTable.maxAthletes,
      planId: subscriptionPlanTable.id,
      planName: subscriptionPlanTable.name,
      planTier: subscriptionPlanTable.tier,
      planDisplayPrice: subscriptionPlanTable.displayPrice,
      planBillingInterval: subscriptionPlanTable.billingInterval,
      paymentAmountCents: teamSubscriptionRequestTable.paymentAmountCents,
      paymentCurrency: teamSubscriptionRequestTable.paymentCurrency,
    })
    .from(teamSubscriptionRequestTable)
    .innerJoin(userTable, eq(teamSubscriptionRequestTable.adminId, userTable.id))
    .innerJoin(teamTable, eq(teamSubscriptionRequestTable.teamId, teamTable.id))
    .leftJoin(subscriptionPlanTable, eq(teamSubscriptionRequestTable.planId, subscriptionPlanTable.id))
    .orderBy(desc(teamSubscriptionRequestTable.createdAt));

  return rows;
}

function commitmentMonthsForCycle(cycle: string | null | undefined): number {
  const c = String(cycle ?? "")
    .trim()
    .toLowerCase();
  if (c === "six_months") return 6;
  if (c === "6months") return 6;
  if (c === "yearly") return 12;
  return 1;
}

function paymentTypeForCycle(cycle: string | null | undefined): "monthly" | "upfront" {
  const c = String(cycle ?? "")
    .trim()
    .toLowerCase();
  return c === "monthly" ? "monthly" : "upfront";
}

function computeTeamExpiryFromNow(cycle: string | null | undefined) {
  const months = commitmentMonthsForCycle(cycle);
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);
  return expiresAt;
}

export async function approveTeamSubscriptionRequest(requestId: number) {
  const rows = await db
    .select()
    .from(teamSubscriptionRequestTable)
    .where(eq(teamSubscriptionRequestTable.id, requestId))
    .limit(1);
  const request = rows[0] ?? null;
  if (!request) return null;

  const previousStatus = request.status;
  const [updatedRequest] = await db
    .update(teamSubscriptionRequestTable)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(teamSubscriptionRequestTable.id, requestId))
    .returning();

  const cycle = request.planBillingCycle ?? null;
  const expiresAt = computeTeamExpiryFromNow(cycle);

  await db
    .update(teamTable)
    .set({
      planId: request.planId,
      subscriptionStatus: "active",
      planPaymentType: paymentTypeForCycle(cycle),
      planCommitmentMonths: commitmentMonthsForCycle(cycle),
      planExpiresAt: expiresAt,
      stripeSubscriptionId: request.stripeSubscriptionId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(teamTable.id, request.teamId));

  if (updatedRequest && previousStatus !== "approved") {
    void notifyTeamSubscriptionApproved(updatedRequest.id).catch((err) => {
      console.warn("[Billing] notifyTeamSubscriptionApproved failed", err);
    });
  }

  return updatedRequest ?? null;
}

export async function rejectTeamSubscriptionRequest(requestId: number) {
  const [updated] = await db
    .update(teamSubscriptionRequestTable)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(teamSubscriptionRequestTable.id, requestId))
    .returning();
  return updated ?? null;
}

export async function upsertTeamPendingApprovalFromSessionMetadata(session: Stripe.Checkout.Session) {
  const sessionId = String(session.id ?? "").trim();
  const meta = (session.metadata ?? {}) as Record<string, string | undefined>;
  const teamId = Number(meta.teamId ?? "");
  const adminId = Number(meta.adminId ?? "");
  const planId = Number(meta.planId ?? "");
  const billingCycle = (meta.billingCycle as any) ?? "monthly";

  if (!sessionId || !Number.isFinite(teamId) || !Number.isFinite(adminId) || !Number.isFinite(planId)) {
    return null;
  }

  const stripeSubscriptionId =
    typeof (session as any).subscription === "string" ? ((session as any).subscription as string) : null;

  const inserted = await createTeamSubscriptionRequest({
    adminId,
    teamId,
    planId,
    planBillingCycle: billingCycle,
    stripeSessionId: sessionId,
    stripeSubscriptionId,
  });

  // Ensure the team record knows which plan was selected even before approval.
  await db
    .update(teamTable)
    .set({ planId, updatedAt: new Date() })
    .where(and(eq(teamTable.id, teamId), eq(teamTable.adminId, adminId)));

  return inserted;
}
