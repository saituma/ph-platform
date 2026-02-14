import type { Request, Response } from "express";
import Stripe from "stripe";
import { z } from "zod";

import { ProgramType } from "../db/schema";
import { env } from "../config/env";
import { getGuardianAndAthlete } from "../services/user.service";
import {
  approveSubscriptionRequest,
  confirmCheckoutSession,
  createCheckoutSession,
  createPaymentSheetIntent,
  createSubscriptionPlan,
  confirmPaymentSheetIntent,
  getLatestSubscriptionRequest,
  listSubscriptionPlans,
  listSubscriptionRequests,
  updateSubscriptionPlan,
  updateSubscriptionRequestStatus,
  updateRequestFromStripeSession,
} from "../services/billing.service";

const checkoutSchema = z.object({
  planId: z.number().int().min(1),
  interval: z.enum(["monthly", "yearly"]).optional(),
});

const confirmSchema = z.object({
  sessionId: z.string().min(1),
});

const planCreateSchema = z.object({
  name: z.string().min(1),
  tier: z.enum(ProgramType.enumValues),
  stripePriceId: z.string().optional(),
  displayPrice: z.string().min(1),
  billingInterval: z.string().min(1),
  monthlyPrice: z.string().optional(),
  yearlyPrice: z.string().optional(),
  discountType: z.string().optional(),
  discountValue: z.string().optional(),
  discountAppliesTo: z.string().optional(),
  isActive: z.boolean().optional(),
});

const planUpdateSchema = planCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export async function listPlans(_req: Request, res: Response) {
  const plans = await listSubscriptionPlans({ includeInactive: false });
  return res.status(200).json({ plans });
}

export async function getBillingStatus(req: Request, res: Response) {
  const { athlete } = await getGuardianAndAthlete(req.user!.id);
  if (!athlete) {
    return res.status(200).json({ athlete: null, currentProgramTier: null, latestRequest: null });
  }
  const latestRequest = await getLatestSubscriptionRequest({
    userId: req.user!.id,
    athleteId: athlete.id,
  });
  return res.status(200).json({
    athlete,
    currentProgramTier: athlete.currentProgramTier ?? null,
    latestRequest,
  });
}

export async function createCheckout(req: Request, res: Response) {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { athlete } = await getGuardianAndAthlete(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "No athlete profile found" });
  }

  try {
    const { session, request } = await createCheckoutSession({
      userId: req.user!.id,
      userEmail: req.user!.email,
      athleteId: athlete.id,
      planId: parsed.data.planId,
      interval: parsed.data.interval,
    });
    return res.status(200).json({
      checkoutUrl: session.url,
      sessionId: session.id,
      request,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Failed to create checkout session" });
  }
}

export async function createPaymentSheet(req: Request, res: Response) {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  if (!env.stripePublishableKey) {
    return res.status(500).json({ error: "Stripe publishable key is not configured" });
  }
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { athlete } = await getGuardianAndAthlete(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "No athlete profile found" });
  }

  try {
    const result = await createPaymentSheetIntent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      athleteId: athlete.id,
      planId: parsed.data.planId,
      interval: parsed.data.interval,
    });
    return res.status(200).json({
      customerId: result.customerId,
      ephemeralKey: result.ephemeralKey,
      paymentIntentId: result.paymentIntentId,
      paymentIntentClientSecret: result.paymentIntentClientSecret,
      publishableKey: env.stripePublishableKey,
      request: result.request,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Failed to create payment sheet" });
  }
}

export async function confirmPaymentSheet(req: Request, res: Response) {
  const input = z.object({ paymentIntentId: z.string().min(1) }).safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Invalid request", details: input.error.flatten() });
  }
  try {
    const result = await confirmPaymentSheetIntent({ paymentIntentId: input.data.paymentIntentId });
    return res.status(200).json({ request: result.request, paymentStatus: result.intent.status });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Failed to confirm payment" });
  }
}

export async function confirmCheckout(req: Request, res: Response) {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await confirmCheckoutSession({
      sessionId: parsed.data.sessionId,
      userId: req.user!.id,
    });
    return res.status(200).json({ request: result.request, paymentStatus: result.session.payment_status });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Failed to confirm payment" });
  }
}

export async function listPlansAdmin(_req: Request, res: Response) {
  const plans = await listSubscriptionPlans({ includeInactive: true });
  return res.status(200).json({ plans });
}

export async function createPlanAdmin(req: Request, res: Response) {
  const parsed = planCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const stripePriceId = parsed.data.stripePriceId?.trim() || "manual";
  const plan = await createSubscriptionPlan({ ...parsed.data, stripePriceId });
  return res.status(201).json({ plan });
}

export async function updatePlanAdmin(req: Request, res: Response) {
  const planId = z.coerce.number().int().min(1).parse(req.params.planId);
  const parsed = planUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const updatePayload = { ...parsed.data };
  if ("stripePriceId" in updatePayload) {
    updatePayload.stripePriceId = updatePayload.stripePriceId?.trim() || "manual";
  }
  const plan = await updateSubscriptionPlan(planId, updatePayload);
  if (!plan) {
    return res.status(404).json({ error: "Plan not found" });
  }
  return res.status(200).json({ plan });
}

export async function listRequestsAdmin(_req: Request, res: Response) {
  const requests = await listSubscriptionRequests();
  return res.status(200).json({ requests });
}

export async function approveRequestAdmin(req: Request, res: Response) {
  const requestId = z.coerce.number().int().min(1).parse(req.params.requestId);
  const updated = await approveSubscriptionRequest(requestId);
  if (!updated) {
    return res.status(404).json({ error: "Request not found" });
  }
  return res.status(200).json({ request: updated });
}

export async function rejectRequestAdmin(req: Request, res: Response) {
  const requestId = z.coerce.number().int().min(1).parse(req.params.requestId);
  const updated = await updateSubscriptionRequestStatus(requestId, "rejected");
  if (!updated) {
    return res.status(404).json({ error: "Request not found" });
  }
  return res.status(200).json({ request: updated });
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
        await updateRequestFromStripeSession(session.id, session.payment_status ?? "paid");
      }
    }
    if (event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.id) {
        await updateRequestFromStripeSession(session.id, session.payment_status ?? "paid");
      }
    }
    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.id) {
        await updateRequestFromStripeSession(session.id, session.payment_status ?? "failed");
      }
    }
    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.id) {
        await updateRequestFromStripeSession(session.id, session.payment_status ?? "expired");
      }
    }
  } catch (error) {
    return res.status(500).json({ error: "Failed to process webhook event" });
  }

  return res.status(200).json({ received: true });
}
