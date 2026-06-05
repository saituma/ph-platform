import type { Request, Response } from "express";
import Stripe from "stripe";
import { eq, desc } from "drizzle-orm";

import { env } from "../../config/env";
import { db } from "../../db";
import {
  subscriptionRequestTable,
  teamSubscriptionRequestTable,
  athleteTable,
  teamTable,
  guardianTable,
  userTable,
  subscriptionPlanTable,
} from "../../db/schema";
import { updateRequestFromStripeSession } from "../../services/billing.service";
import {
  upsertTeamPendingApprovalFromSessionMetadata,
  updateTeamRequestFromStripeCheckoutSession,
  updateTeamPlayerInvitePaymentFromStripeSession,
} from "../../services/billing/team-request.service";
import { sendPaymentFailedEmail } from "../../lib/mailer/billing.mailer";
import { logger } from "../../lib/logger";

/**
 * Mark the most recent subscription request for a Stripe customer as past_due.
 * Called when invoice.payment_failed fires for a recurring subscription.
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : (invoice.customer as any)?.id;
  if (!customerId) return;

  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : ((invoice.subscription as any)?.id ?? null);

  if (!subscriptionId) return;

  // Individual subscription request
  const [req] = await db
    .select({
      id: subscriptionRequestTable.id,
      athleteId: subscriptionRequestTable.athleteId,
      planId: subscriptionRequestTable.planId,
    })
    .from(subscriptionRequestTable)
    .where(eq(subscriptionRequestTable.stripeSubscriptionId, subscriptionId))
    .orderBy(desc(subscriptionRequestTable.createdAt))
    .limit(1);

  if (req) {
    await db
      .update(subscriptionRequestTable)
      .set({ paymentStatus: "past_due", updatedAt: new Date() })
      .where(eq(subscriptionRequestTable.id, req.id));

    // Revoke access immediately — don't wait for the daily cron
    await db
      .update(athleteTable)
      .set({ currentProgramTier: null, currentPlanId: null, planExpiresAt: null, updatedAt: new Date() })
      .where(eq(athleteTable.id, req.athleteId));

    logger.info({ requestId: req.id, athleteId: req.athleteId }, "Revoked athlete access after failed invoice");

    // Notify the payer by email
    void notifyPayerPaymentFailed(req.athleteId, req.planId);
    return;
  }

  // Team subscription request
  const [teamReq] = await db
    .select({ id: teamSubscriptionRequestTable.id, teamId: teamSubscriptionRequestTable.teamId })
    .from(teamSubscriptionRequestTable)
    .where(eq(teamSubscriptionRequestTable.stripeSubscriptionId, subscriptionId))
    .orderBy(desc(teamSubscriptionRequestTable.createdAt))
    .limit(1);

  if (teamReq) {
    await db
      .update(teamSubscriptionRequestTable)
      .set({ paymentStatus: "past_due", updatedAt: new Date() })
      .where(eq(teamSubscriptionRequestTable.id, teamReq.id));
    logger.info({ teamRequestId: teamReq.id }, "Marked team subscription request past_due after failed invoice");
  }
}

async function notifyPayerPaymentFailed(athleteId: number, planId: number | null) {
  try {
    const [athlete] = await db
      .select({
        id: athleteTable.id,
        name: athleteTable.name,
        userId: athleteTable.userId,
        guardianId: athleteTable.guardianId,
      })
      .from(athleteTable)
      .where(eq(athleteTable.id, athleteId))
      .limit(1);
    if (!athlete) return;

    const guardianUserId = athlete.guardianId
      ? (
          await db
            .select({ userId: guardianTable.userId })
            .from(guardianTable)
            .where(eq(guardianTable.id, athlete.guardianId))
            .limit(1)
        )[0]?.userId
      : null;
    const payerUserId = guardianUserId ?? athlete.userId;
    if (!payerUserId) return;

    const [payer] = await db
      .select({ email: userTable.email, name: userTable.name, isDeleted: userTable.isDeleted })
      .from(userTable)
      .where(eq(userTable.id, payerUserId))
      .limit(1);
    if (!payer || payer.isDeleted) return;

    let planName: string | null = null;
    if (planId) {
      const [plan] = await db
        .select({ name: subscriptionPlanTable.name })
        .from(subscriptionPlanTable)
        .where(eq(subscriptionPlanTable.id, planId))
        .limit(1);
      planName = plan?.name ?? null;
    }

    await sendPaymentFailedEmail({ to: payer.email, name: payer.name, athleteName: athlete.name, planName });
  } catch (err) {
    logger.warn({ err, athleteId }, "notifyPayerPaymentFailed skipped");
  }
}

/**
 * Handle subscription cancellation — mark the request as cancelled.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;

  const [req] = await db
    .select({ id: subscriptionRequestTable.id, athleteId: subscriptionRequestTable.athleteId })
    .from(subscriptionRequestTable)
    .where(eq(subscriptionRequestTable.stripeSubscriptionId, subscriptionId))
    .orderBy(desc(subscriptionRequestTable.createdAt))
    .limit(1);

  if (req) {
    await db
      .update(subscriptionRequestTable)
      .set({ status: "rejected", paymentStatus: "cancelled", updatedAt: new Date() })
      .where(eq(subscriptionRequestTable.id, req.id));

    // Revoke athlete access immediately on cancellation
    await db
      .update(athleteTable)
      .set({ currentProgramTier: null, currentPlanId: null, planExpiresAt: null, updatedAt: new Date() })
      .where(eq(athleteTable.id, req.athleteId));

    logger.info({ requestId: req.id, athleteId: req.athleteId }, "Revoked athlete access after subscription.deleted");
    return;
  }

  const [teamReq] = await db
    .select({ id: teamSubscriptionRequestTable.id, teamId: teamSubscriptionRequestTable.teamId })
    .from(teamSubscriptionRequestTable)
    .where(eq(teamSubscriptionRequestTable.stripeSubscriptionId, subscriptionId))
    .orderBy(desc(teamSubscriptionRequestTable.createdAt))
    .limit(1);

  if (teamReq) {
    await db
      .update(teamSubscriptionRequestTable)
      .set({ status: "rejected", paymentStatus: "cancelled", updatedAt: new Date() })
      .where(eq(teamSubscriptionRequestTable.id, teamReq.id));

    if (teamReq.teamId) {
      await db
        .update(teamTable)
        .set({ planExpiresAt: null, updatedAt: new Date() })
        .where(eq(teamTable.id, teamReq.teamId));
    }

    logger.info({ teamRequestId: teamReq.id }, "Marked team subscription cancelled after subscription.deleted");
  }
}

/**
 * Handle subscription renewal success — clear past_due and extend planExpiresAt
 * on the athlete record so access continues for the new billing period.
 * Stripe provides `lines.data[0].period.end` as the Unix timestamp for the new period end.
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : ((invoice.subscription as any)?.id ?? null);
  if (!subscriptionId) return;

  // Derive the new access end from Stripe's period end (falls back to now + 1 month)
  const periodEndUnix = invoice.lines?.data?.[0]?.period?.end ?? null;
  const newPlanExpiresAt = periodEndUnix
    ? new Date(periodEndUnix * 1000)
    : (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d;
      })();

  // Individual subscription
  const [req] = await db
    .select({
      id: subscriptionRequestTable.id,
      athleteId: subscriptionRequestTable.athleteId,
    })
    .from(subscriptionRequestTable)
    .where(eq(subscriptionRequestTable.stripeSubscriptionId, subscriptionId))
    .orderBy(desc(subscriptionRequestTable.createdAt))
    .limit(1);

  if (req) {
    await db
      .update(subscriptionRequestTable)
      .set({ paymentStatus: "paid", updatedAt: new Date() })
      .where(eq(subscriptionRequestTable.id, req.id));

    if (req.athleteId) {
      // Also update guardian if this athlete has one
      const [athlete] = await db
        .select({ guardianId: athleteTable.guardianId })
        .from(athleteTable)
        .where(eq(athleteTable.id, req.athleteId))
        .limit(1);

      await db
        .update(athleteTable)
        .set({ planExpiresAt: newPlanExpiresAt, updatedAt: new Date() })
        .where(eq(athleteTable.id, req.athleteId));

      if (athlete?.guardianId) {
        await db.update(guardianTable).set({ updatedAt: new Date() }).where(eq(guardianTable.id, athlete.guardianId));
      }

      logger.info(
        { requestId: req.id, athleteId: req.athleteId, newPlanExpiresAt },
        "Extended athlete planExpiresAt on subscription renewal",
      );
    }
    return;
  }

  // Team subscription
  const [teamReq] = await db
    .select({ id: teamSubscriptionRequestTable.id, teamId: teamSubscriptionRequestTable.teamId })
    .from(teamSubscriptionRequestTable)
    .where(eq(teamSubscriptionRequestTable.stripeSubscriptionId, subscriptionId))
    .orderBy(desc(teamSubscriptionRequestTable.createdAt))
    .limit(1);

  if (teamReq) {
    await db
      .update(teamSubscriptionRequestTable)
      .set({ paymentStatus: "paid", updatedAt: new Date() })
      .where(eq(teamSubscriptionRequestTable.id, teamReq.id));

    if (teamReq.teamId) {
      await db
        .update(teamTable)
        .set({ planExpiresAt: newPlanExpiresAt, updatedAt: new Date() })
        .where(eq(teamTable.id, teamReq.teamId));

      logger.info(
        { teamRequestId: teamReq.id, teamId: teamReq.teamId, newPlanExpiresAt },
        "Extended team planExpiresAt on subscription renewal",
      );
    }
  }
}

export async function stripeWebhook(req: Request, res: Response) {
  if (!env.stripeSecretKey || !env.stripeWebhookSecret) {
    return res.status(500).json({ error: "Stripe is not configured" });
  }

  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    return res.status(400).json({ error: "Missing Stripe signature" });
  }

  const stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2025-02-24.acacia" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.stripeWebhookSecret);
  } catch (error: any) {
    return res.status(400).json({ error: `Webhook signature verification failed. ${error?.message || ""}` });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.id) {
        const metaType = String((session.metadata as any)?.type ?? "")
          .trim()
          .toLowerCase();
        if (metaType === "team_subscription") {
          await upsertTeamPendingApprovalFromSessionMetadata(session);
          await updateTeamRequestFromStripeCheckoutSession(session, session.payment_status ?? "paid");
        } else if (metaType === "team_player_invite") {
          await updateTeamPlayerInvitePaymentFromStripeSession(session, session.payment_status ?? "paid", event.type);
        } else {
          await updateRequestFromStripeSession(session);
        }
      }
    }
    if (event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.id) {
        const metaType = String((session.metadata as any)?.type ?? "")
          .trim()
          .toLowerCase();
        if (metaType === "team_subscription") {
          await upsertTeamPendingApprovalFromSessionMetadata(session);
          await updateTeamRequestFromStripeCheckoutSession(session, session.payment_status ?? "paid");
        } else if (metaType === "team_player_invite") {
          await updateTeamPlayerInvitePaymentFromStripeSession(session, session.payment_status ?? "paid", event.type);
        } else {
          await updateRequestFromStripeSession(session);
        }
      }
    }
    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.id) {
        const metaType = String((session.metadata as any)?.type ?? "")
          .trim()
          .toLowerCase();
        if (metaType === "team_subscription") {
          await upsertTeamPendingApprovalFromSessionMetadata(session);
          await updateTeamRequestFromStripeCheckoutSession(session, session.payment_status ?? "failed");
        } else if (metaType === "team_player_invite") {
          await updateTeamPlayerInvitePaymentFromStripeSession(session, session.payment_status ?? "unpaid", event.type);
        } else {
          await updateRequestFromStripeSession(session);
        }
      }
    }
    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.id) {
        const metaType = String((session.metadata as any)?.type ?? "")
          .trim()
          .toLowerCase();
        if (metaType === "team_subscription") {
          await upsertTeamPendingApprovalFromSessionMetadata(session);
          await updateTeamRequestFromStripeCheckoutSession(session, session.payment_status ?? "expired");
        } else if (metaType === "team_player_invite") {
          await updateTeamPlayerInvitePaymentFromStripeSession(
            session,
            session.payment_status ?? "expired",
            event.type,
          );
        } else {
          await updateRequestFromStripeSession(session);
        }
      }
    }
    // Subscription lifecycle events
    if (event.type === "invoice.payment_failed") {
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
    }
    if (event.type === "invoice.payment_succeeded") {
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
    }
    if (event.type === "customer.subscription.deleted") {
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
    }
  } catch (error) {
    logger.error({ error }, "Failed to process Stripe webhook event");
    return res.status(500).json({ error: "Failed to process webhook event" });
  }

  return res.status(200).json({ received: true });
}
