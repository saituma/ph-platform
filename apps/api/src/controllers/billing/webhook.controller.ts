import type { Request, Response } from "express";
import Stripe from "stripe";

import { env } from "../../config/env";
import {
  updateRequestFromStripeSession,
} from "../../services/billing.service";
import {
  upsertTeamPendingApprovalFromSessionMetadata,
  updateTeamRequestFromStripeCheckoutSession,
  updateTeamPlayerInvitePaymentFromStripeSession,
} from "../../services/billing/team-request.service";

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
          await updateTeamPlayerInvitePaymentFromStripeSession(session, session.payment_status ?? "expired", event.type);
        } else {
          await updateRequestFromStripeSession(session);
        }
      }
    }
  } catch (error) {
    return res.status(500).json({ error: "Failed to process webhook event" });
  }

  return res.status(200).json({ received: true });
}
