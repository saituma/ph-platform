import Stripe from "stripe";
import { and, desc, eq } from "drizzle-orm";

import { db } from "../../db";
import { logger } from "../../lib/logger";
import { subscriptionPlanTable, teamSubscriptionRequestTable, teamPlayerPaymentInviteTable, teamTable, userTable } from "../../db/schema";
import { newReceiptPublicId } from "../../lib/receipt-public-id";
import { checkoutSessionPaymentIntentId } from "../../lib/stripe-checkout-receipt";
import { getStripeClient } from "./stripe.service";
import { parsePriceToCents } from "./plan.service";
import {
  notifyTeamSubscriptionEnteredPendingApproval,
  notifyTeamSubscriptionApproved,
} from "../team-subscription-notifications.service";

function isPaidRequestPaymentStatus(status: string | null | undefined) {
  const s = String(status ?? "")
    .trim()
    .toLowerCase();
  return s === "paid" || s === "no_payment_required";
}

function deriveInviteStatusFromStripe(
  paymentStatus: string | null | undefined,
  eventType?: string,
): "pending" | "paid" | "expired" | "cancelled" {
  const ps = String(paymentStatus ?? "")
    .trim()
    .toLowerCase();
  const ev = String(eventType ?? "")
    .trim()
    .toLowerCase();
  if (ps === "paid" || ps === "no_payment_required") return "paid";
  if (ps === "expired" || ev === "checkout.session.expired") return "expired";
  if (ev === "checkout.session.async_payment_failed") return "cancelled";
  return "pending";
}

function scheduleTeamPendingApprovalEmails(requestId: number, previousStatus: string, newStatus: string) {
  if (newStatus !== "pending_approval" || previousStatus === "pending_approval") return;
  void notifyTeamSubscriptionEnteredPendingApproval(requestId).catch((err) => {
    logger.warn({ err }, "[Billing] notifyTeamSubscriptionEnteredPendingApproval failed");
  });
}

async function reconcileTeamRequestPayments(requestId: number) {
  const rows = await db
    .select({
      id: teamSubscriptionRequestTable.id,
      status: teamSubscriptionRequestTable.status,
      paymentStatus: teamSubscriptionRequestTable.paymentStatus,
      paymentMode: teamSubscriptionRequestTable.paymentMode,
      coachPaysSeats: teamSubscriptionRequestTable.coachPaysSeats,
      allPaymentsComplete: teamSubscriptionRequestTable.allPaymentsComplete,
    })
    .from(teamSubscriptionRequestTable)
    .where(eq(teamSubscriptionRequestTable.id, requestId))
    .limit(1);
  const request = rows[0] ?? null;
  if (!request) return null;

  const invites = await db
    .select({ status: teamPlayerPaymentInviteTable.status })
    .from(teamPlayerPaymentInviteTable)
    .where(eq(teamPlayerPaymentInviteTable.requestId, requestId));

  const inviteCount = invites.length;
  const paidInviteCount = invites.filter((i) => i.status === "paid").length;
  const requiresInvitePayments =
    request.paymentMode === "per_player_all" || request.paymentMode === "per_player_selected";
  const invitePaymentsComplete = !requiresInvitePayments || inviteCount === 0 || paidInviteCount >= inviteCount;

  const coachNeedsPayment =
    request.paymentMode === "coach_pays_all" ||
    (request.paymentMode === "per_player_selected" && Number(request.coachPaysSeats ?? 0) > 0);
  const coachPaymentComplete = !coachNeedsPayment || isPaidRequestPaymentStatus(request.paymentStatus);

  const allPaymentsComplete = coachPaymentComplete && invitePaymentsComplete;
  const nextPaymentStatus = allPaymentsComplete ? "paid" : request.paymentStatus ?? "unpaid";
  const nextStatus =
    request.status === "approved" || request.status === "rejected"
      ? request.status
      : allPaymentsComplete
        ? "pending_approval"
        : "pending_payment";
  const previousStatus = request.status;

  const [updated] = await db
    .update(teamSubscriptionRequestTable)
    .set({
      allPaymentsComplete,
      paymentStatus: nextPaymentStatus,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(teamSubscriptionRequestTable.id, requestId))
    .returning();

  if (updated) {
    scheduleTeamPendingApprovalEmails(updated.id, previousStatus, updated.status);
  }
  return updated ?? null;
}

export async function createTeamSubscriptionRequest(input: {
  adminId: number;
  teamId: number;
  planId: number;
  planBillingCycle: "monthly" | "six_months" | "yearly";
  stripeSessionId: string | null;
  stripeSubscriptionId?: string | null;
  paymentMode?: "coach_pays_all" | "per_player_all" | "per_player_selected";
  coachPaysSeats?: number;
  termsAcceptedAt?: Date | null;
  termsVersion?: string | null;
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
      paymentMode: input.paymentMode ?? "coach_pays_all",
      coachPaysSeats: input.coachPaysSeats ?? 0,
      termsAcceptedAt: input.termsAcceptedAt,
      termsVersion: input.termsVersion,
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
  if (!row) return null;
  return await reconcileTeamRequestPayments(row.id);
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
      allPaymentsComplete: teamSubscriptionRequestTable.allPaymentsComplete,
      inviteEmailsReady: teamSubscriptionRequestTable.inviteEmailsReady,
      inviteEmailsError: teamSubscriptionRequestTable.inviteEmailsError,
      paymentMode: teamSubscriptionRequestTable.paymentMode,
      coachPaysSeats: teamSubscriptionRequestTable.coachPaysSeats,
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
      planMonthlyPrice: subscriptionPlanTable.monthlyPrice,
      planYearlyPrice: subscriptionPlanTable.yearlyPrice,
      planBillingInterval: subscriptionPlanTable.billingInterval,
      paymentAmountCents: teamSubscriptionRequestTable.paymentAmountCents,
      paymentCurrency: teamSubscriptionRequestTable.paymentCurrency,
    })
    .from(teamSubscriptionRequestTable)
    .innerJoin(userTable, eq(teamSubscriptionRequestTable.adminId, userTable.id))
    .innerJoin(teamTable, eq(teamSubscriptionRequestTable.teamId, teamTable.id))
    .leftJoin(subscriptionPlanTable, eq(teamSubscriptionRequestTable.planId, subscriptionPlanTable.id))
    .orderBy(desc(teamSubscriptionRequestTable.createdAt));

  return await Promise.all(
    rows.map(async (row) => {
      const seatAmountCents = planSeatAmountCents(row.planBillingCycle, {
        displayPrice: row.planDisplayPrice,
        monthlyPrice: row.planMonthlyPrice,
        yearlyPrice: row.planYearlyPrice,
      });
      const invites = await listPlayerPaymentInvites(row.requestId);
      const effectiveInvites = invites.map((invite) => ({
        ...invite,
        amountCents: invite.amountCents ?? seatAmountCents,
      }));
      const managerAmountCents =
        row.paymentAmountCents ??
        (seatAmountCents != null ? Math.max(0, row.coachPaysSeats ?? 0) * seatAmountCents : null);
      const playerAmountCents = effectiveInvites.reduce((sum, invite) => sum + (invite.amountCents ?? 0), 0);
      const paidPlayerAmountCents = effectiveInvites
        .filter((invite) => invite.status === "paid")
        .reduce((sum, invite) => sum + (invite.amountCents ?? 0), 0);
      const managerPaidAmountCents = isPaidRequestPaymentStatus(row.paymentStatus) ? (managerAmountCents ?? 0) : 0;
      const totalAmountCents = (managerAmountCents ?? 0) + playerAmountCents;
      const paidAmountCents = managerPaidAmountCents + paidPlayerAmountCents;

      return {
        ...row,
        paymentAmountCents: managerAmountCents,
        paymentCurrency: row.paymentCurrency ?? effectiveInvites.find((invite) => invite.currency)?.currency ?? "gbp",
        managerAmountCents,
        playerAmountCents,
        totalAmountCents,
        paidAmountCents,
        remainingAmountCents: Math.max(0, totalAmountCents - paidAmountCents),
      };
    }),
  );
}

function planSeatAmountCents(
  billingCycle: string | null | undefined,
  plan: { displayPrice?: string | null; monthlyPrice?: string | null; yearlyPrice?: string | null },
) {
  const cycle = String(billingCycle ?? "monthly").toLowerCase();
  const monthly = parsePriceToCents(plan.monthlyPrice ?? plan.displayPrice);
  if (cycle === "yearly") return parsePriceToCents(plan.yearlyPrice) ?? monthly;
  if (cycle === "6months" || cycle === "six_months") return monthly != null ? monthly * 6 : parsePriceToCents(plan.displayPrice);
  return monthly;
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

function computeTeamExpiryFromNow(cycle: string | null | undefined, durationWeeks?: number | null) {
  const normalized = String(cycle ?? "")
    .trim()
    .toLowerCase();
  const weeks = Number(durationWeeks ?? 0);
  if (normalized === "six_months" && Number.isFinite(weeks) && weeks > 0) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + weeks * 7);
    return expiresAt;
  }
  const months = commitmentMonthsForCycle(cycle);
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);
  return expiresAt;
}

export async function approveTeamSubscriptionRequest(requestId: number) {
  const rows = await db
    .select({
      request: teamSubscriptionRequestTable,
      planDurationWeeks: subscriptionPlanTable.durationWeeks,
    })
    .from(teamSubscriptionRequestTable)
    .leftJoin(subscriptionPlanTable, eq(teamSubscriptionRequestTable.planId, subscriptionPlanTable.id))
    .where(eq(teamSubscriptionRequestTable.id, requestId))
    .limit(1);
  const request = rows[0]?.request ?? null;
  const planDurationWeeks = rows[0]?.planDurationWeeks ?? null;
  if (!request) return null;
  const requiresInviteEmails =
    request.paymentMode === "per_player_all" || request.paymentMode === "per_player_selected";
  if (requiresInviteEmails && !request.inviteEmailsReady) {
    throw new Error("Invite emails are still sending. Approve will unlock automatically once delivery is confirmed.");
  }

  const previousStatus = request.status;
  const [updatedRequest] = await db
    .update(teamSubscriptionRequestTable)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(teamSubscriptionRequestTable.id, requestId))
    .returning();

  const cycle = request.planBillingCycle ?? null;
  const expiresAt = computeTeamExpiryFromNow(cycle, planDurationWeeks);

  await db
    .update(teamTable)
    .set({
      planId: request.planId,
      subscriptionStatus: "active",
      planPaymentType: paymentTypeForCycle(cycle),
      planCommitmentMonths:
        String(cycle ?? "").trim().toLowerCase() === "six_months" && Number(planDurationWeeks ?? 0) > 0
          ? null
          : commitmentMonthsForCycle(cycle),
      planExpiresAt: expiresAt,
      stripeSubscriptionId: request.stripeSubscriptionId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(teamTable.id, request.teamId));

  if (updatedRequest && previousStatus !== "approved") {
    void notifyTeamSubscriptionApproved(updatedRequest.id).catch((err) => {
      logger.warn({ err }, "[Billing] notifyTeamSubscriptionApproved failed");
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

export async function sponsorTeamPlayerPaymentInvite(requestId: number, inviteId: number) {
  const [invite] = await db
    .select({
      id: teamPlayerPaymentInviteTable.id,
      requestId: teamPlayerPaymentInviteTable.requestId,
      status: teamPlayerPaymentInviteTable.status,
    })
    .from(teamPlayerPaymentInviteTable)
    .where(and(eq(teamPlayerPaymentInviteTable.id, inviteId), eq(teamPlayerPaymentInviteTable.requestId, requestId)))
    .limit(1);

  if (!invite) return null;
  if (invite.status === "paid") {
    return reconcileTeamRequestPayments(requestId);
  }

  await db
    .update(teamPlayerPaymentInviteTable)
    .set({
      status: "paid",
      paidAt: new Date(),
      emailLastError: "sponsored_by_manager",
      updatedAt: new Date(),
    })
    .where(eq(teamPlayerPaymentInviteTable.id, inviteId));

  const invites = await db
    .select({
      status: teamPlayerPaymentInviteTable.status,
      emailSentAt: teamPlayerPaymentInviteTable.emailSentAt,
      emailLastError: teamPlayerPaymentInviteTable.emailLastError,
    })
    .from(teamPlayerPaymentInviteTable)
    .where(eq(teamPlayerPaymentInviteTable.requestId, requestId));
  const inviteEmailsReady =
    invites.length === 0 ||
    invites.every((row) => row.status === "paid" || row.emailSentAt != null || row.emailLastError === "sponsored_by_manager");

  await db
    .update(teamSubscriptionRequestTable)
    .set({
      inviteEmailsReady,
      inviteEmailsLastAttemptAt: new Date(),
      inviteEmailsError: inviteEmailsReady ? null : "Some invite emails have not been sent yet.",
      updatedAt: new Date(),
    })
    .where(eq(teamSubscriptionRequestTable.id, requestId));

  return reconcileTeamRequestPayments(requestId);
}

export async function upsertTeamPendingApprovalFromSessionMetadata(session: Stripe.Checkout.Session) {
  const sessionId = String(session.id ?? "").trim();
  const meta = (session.metadata ?? {}) as Record<string, string | undefined>;
  const teamId = Number(meta.teamId ?? "");
  const adminId = Number(meta.adminId ?? "");
  const planId = Number(meta.planId ?? "");
  const billingCycle = (meta.billingCycle as any) ?? "monthly";
  const paymentMode = (meta.paymentMode as any) ?? "coach_pays_all";
  const coachPaysSeats = Number(meta.coachPaysSeats ?? "0");
  const termsAcceptedAt = meta.termsAcceptedAt ? new Date(meta.termsAcceptedAt) : undefined;
  const termsVersion = meta.termsVersion ?? undefined;

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
    paymentMode,
    coachPaysSeats,
    termsAcceptedAt,
    termsVersion,
  });

  // Ensure the team record knows which plan was selected even before approval.
  await db
    .update(teamTable)
    .set({ planId, updatedAt: new Date() })
    .where(and(eq(teamTable.id, teamId), eq(teamTable.adminId, adminId)));

  return inserted;
}

export async function createPlayerPaymentInvites(
  requestId: number,
  teamId: number,
  players: { email: string; name?: string }[],
  amountCents: number,
  currency: string = "gbp",
) {
  if (players.length === 0) return [];

  const values = players.map((p) => ({
    requestId,
    teamId,
    playerEmail: p.email,
    playerName: p.name ?? null,
    amountCents,
    currency,
    status: "pending" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const inserted = await db.insert(teamPlayerPaymentInviteTable).values(values).returning();
  return inserted;
}

export async function listPlayerPaymentInvites(requestId: number) {
  const rows = await db
    .select({
      id: teamPlayerPaymentInviteTable.id,
      requestId: teamPlayerPaymentInviteTable.requestId,
      teamId: teamPlayerPaymentInviteTable.teamId,
      playerEmail: teamPlayerPaymentInviteTable.playerEmail,
      playerName: teamPlayerPaymentInviteTable.playerName,
      stripePaymentLinkId: teamPlayerPaymentInviteTable.stripePaymentLinkId,
      stripePaymentLinkUrl: teamPlayerPaymentInviteTable.stripePaymentLinkUrl,
      stripeSessionId: teamPlayerPaymentInviteTable.stripeSessionId,
      amountCents: teamPlayerPaymentInviteTable.amountCents,
      currency: teamPlayerPaymentInviteTable.currency,
      status: teamPlayerPaymentInviteTable.status,
      paidAt: teamPlayerPaymentInviteTable.paidAt,
      emailSentAt: teamPlayerPaymentInviteTable.emailSentAt,
      emailLastError: teamPlayerPaymentInviteTable.emailLastError,
      createdAt: teamPlayerPaymentInviteTable.createdAt,
      updatedAt: teamPlayerPaymentInviteTable.updatedAt,
      planBillingCycle: teamSubscriptionRequestTable.planBillingCycle,
      planDisplayPrice: subscriptionPlanTable.displayPrice,
      planMonthlyPrice: subscriptionPlanTable.monthlyPrice,
      planYearlyPrice: subscriptionPlanTable.yearlyPrice,
    })
    .from(teamPlayerPaymentInviteTable)
    .innerJoin(teamSubscriptionRequestTable, eq(teamPlayerPaymentInviteTable.requestId, teamSubscriptionRequestTable.id))
    .leftJoin(subscriptionPlanTable, eq(teamSubscriptionRequestTable.planId, subscriptionPlanTable.id))
    .where(eq(teamPlayerPaymentInviteTable.requestId, requestId))
    .orderBy(desc(teamPlayerPaymentInviteTable.createdAt));

  return rows.map((row) => {
    const fallbackAmountCents = planSeatAmountCents(row.planBillingCycle, {
      displayPrice: row.planDisplayPrice,
      monthlyPrice: row.planMonthlyPrice,
      yearlyPrice: row.planYearlyPrice,
    });
    const { planBillingCycle: _planBillingCycle, planDisplayPrice: _planDisplayPrice, planMonthlyPrice: _planMonthlyPrice, planYearlyPrice: _planYearlyPrice, ...invite } = row;
    return {
      ...invite,
      amountCents: invite.amountCents ?? fallbackAmountCents,
    };
  });
}

export async function updateTeamPlayerInvitePaymentFromStripeSession(
  session: Stripe.Checkout.Session,
  paymentStatus: string,
  eventType?: string,
) {
  const sessionId = String(session.id ?? "").trim();
  if (!sessionId) return null;

  const inviteIdFromMeta = Number((session.metadata as Record<string, string | undefined>)?.inviteId ?? "");
  const inviteRows =
    Number.isFinite(inviteIdFromMeta) && inviteIdFromMeta > 0
      ? await db
          .select()
          .from(teamPlayerPaymentInviteTable)
          .where(eq(teamPlayerPaymentInviteTable.id, inviteIdFromMeta))
          .limit(1)
      : await db
          .select()
          .from(teamPlayerPaymentInviteTable)
          .where(eq(teamPlayerPaymentInviteTable.stripeSessionId, sessionId))
          .limit(1);
  const invite = inviteRows[0] ?? null;
  if (!invite) return null;

  const nextInviteStatus = deriveInviteStatusFromStripe(paymentStatus, eventType);
  // Keep paid invites sticky; do not regress to non-paid due out-of-order webhook events.
  const finalInviteStatus = invite.status === "paid" && nextInviteStatus !== "paid" ? "paid" : nextInviteStatus;
  const paidAt =
    finalInviteStatus === "paid"
      ? invite.paidAt ?? new Date((session.created ? session.created : Math.floor(Date.now() / 1000)) * 1000)
      : null;

  const [updatedInvite] = await db
    .update(teamPlayerPaymentInviteTable)
    .set({
      stripeSessionId: invite.stripeSessionId ?? sessionId,
      status: finalInviteStatus,
      paidAt,
      updatedAt: new Date(),
    })
    .where(eq(teamPlayerPaymentInviteTable.id, invite.id))
    .returning();

  await reconcileTeamRequestPayments(invite.requestId);
  return updatedInvite ?? null;
}

export async function syncTeamPlayerInvitePaymentsFromStripe(requestId: number) {
  const invites = await db
    .select({
      id: teamPlayerPaymentInviteTable.id,
      stripeSessionId: teamPlayerPaymentInviteTable.stripeSessionId,
    })
    .from(teamPlayerPaymentInviteTable)
    .where(eq(teamPlayerPaymentInviteTable.requestId, requestId));
  if (invites.length === 0) return { synced: 0 };

  const stripeClient = getStripeClient();
  let synced = 0;
  for (const invite of invites) {
    const sessionId = String(invite.stripeSessionId ?? "").trim();
    if (!sessionId.startsWith("cs_")) continue;
    try {
      const session = await stripeClient.checkout.sessions.retrieve(sessionId);
      await updateTeamPlayerInvitePaymentFromStripeSession(session, session.payment_status ?? "unpaid");
      synced += 1;
    } catch (err) {
      logger.warn(
        { err, requestId, inviteId: invite.id, stripeSessionId: sessionId },
        "[Billing] Failed syncing player invite payment from Stripe",
      );
    }
  }
  return { synced };
}
