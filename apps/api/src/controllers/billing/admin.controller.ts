import type { Request, Response } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { ProgramType } from "../../db/schema";
import {
  subscriptionPlanTable,
  subscriptionRequestTable,
  teamSubscriptionRequestTable,
  teamTable,
  teamPlayerPaymentInviteTable,
} from "../../db/schema";
import { db } from "../../db";
import { logger } from "../../lib/logger";
import { cache, cacheKeys } from "../../lib/cache";
import {
  ensureStripePriceId,
  getStripeClient,
  isStripePriceMissingError,
  getSuccessUrl,
  getCancelUrl,
} from "../../services/billing/stripe.service";
import {
  approveSubscriptionRequest,
  createSubscriptionPlan,
  importStripePriceAsPlan,
  inviteUserToPlan,
  getPlanInviteSummary,
  consumePlanInvite,
  listSubscriptionPlans,
  listSubscriptionRequests,
  syncSubscriptionRequestPaymentFromStripe,
  updateSubscriptionRequestStatus,
  updateSubscriptionPlan,
} from "../../services/billing.service";
import {
  approveTeamSubscriptionRequest,
  listTeamSubscriptionRequestsAdmin,
  rejectTeamSubscriptionRequest,
  sponsorTeamPlayerPaymentInvite,
  syncTeamPlayerInvitePaymentsFromStripe,
  syncTeamSubscriptionRequestPaymentFromStripe,
} from "../../services/billing/team-request.service";
import { parsePriceToCents } from "../../services/billing/plan.service";
import { sendTeamPlayerPaymentInviteEmail } from "../../lib/mailer/billing.mailer";

const planCreateSchema = z.object({
  name: z.string().min(1),
  tier: z.enum(ProgramType.enumValues).optional().nullable(),
  stripePriceId: z.string().optional(),
  displayPrice: z.string().min(1),
  billingInterval: z.string().min(1),
  monthlyPrice: z.string().optional().nullable(),
  yearlyPrice: z.string().optional().nullable(),
  oneTimePrice: z.string().optional().nullable(),
  discountType: z.string().optional().nullable(),
  discountValue: z.string().optional().nullable(),
  discountAppliesTo: z.string().optional().nullable(),
  discounts: z
    .array(
      z.object({
        type: z.enum(["percent", "amount"]),
        value: z.string(),
        appliesTo: z.enum(["monthly", "yearly", "six_months", "all", "custom"]),
        label: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  features: z.array(z.string()).optional().nullable(),
  durationWeeks: z.coerce.number().int().min(1).max(104).optional().nullable(),
  durationWeeksPrice: z.coerce.number().int().min(0).optional().nullable(),
  durationDaysPerWeek: z.coerce.number().int().min(1).max(7).optional().nullable(),
  durationDaysPrice: z.coerce.number().int().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
});

const planUpdateSchema = planCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const planInviteSchema = z.object({
  email: z.string().trim().email(),
});

const planInviteConsumeSchema = z.object({
  fullName: z.string().trim().min(1),
  birthDate: z.string().trim().min(8),
  phone: z.string().trim().optional().nullable(),
  trainingPerWeek: z.coerce.number().int().min(1).max(14).optional().nullable(),
  performanceGoals: z.string().trim().optional().nullable(),
  injuries: z.string().trim().optional().nullable(),
  billingCycle: z.enum(["monthly", "yearly", "six_months"]),
});

const planImportSchema = z.object({
  name: z.string().min(1),
  tier: z.enum(ProgramType.enumValues),
  stripePriceId: z.string().min(1),
  interval: z.enum(["monthly", "yearly", "one_time"]),
  displayPrice: z.string().min(1),
  priceLabel: z.string().min(1),
  features: z.array(z.string()).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function listPlansAdmin(_req: Request, res: Response) {
  const plans = await listSubscriptionPlans({ includeInactive: true });
  return res.status(200).json({ plans });
}

export async function listStripePricesAdmin(_req: Request, res: Response) {
  const { stripe } = await import("../../services/billing/stripe.service");
  if (!stripe) {
    return res.status(503).json({ error: "Stripe is not configured" });
  }
  try {
    const [productsPage, pricesPage] = await Promise.all([
      stripe.products.list({ active: true, limit: 100 }),
      stripe.prices.list({ active: true, limit: 100 }),
    ]);

    const pricesByProduct: Record<string, typeof pricesPage.data> = {};
    for (const price of pricesPage.data) {
      const productId = typeof price.product === "string" ? price.product : (price.product as { id: string }).id;
      if (!pricesByProduct[productId]) pricesByProduct[productId] = [];
      pricesByProduct[productId].push(price);
    }

    const products = productsPage.data.map((product) => ({
      stripeProductId: product.id,
      name: product.name,
      description: product.description ?? null,
      prices: (pricesByProduct[product.id] ?? []).map((price) => ({
        stripePriceId: price.id,
        lookupKey: price.lookup_key ?? null,
        currency: price.currency,
        unitAmount: price.unit_amount ?? null,
        interval: price.recurring?.interval ?? null,
        intervalCount: price.recurring?.interval_count ?? null,
      })),
    }));

    return res.status(200).json({ products });
  } catch (error: any) {
    logger.error({ err: error }, "[listStripePricesAdmin]");
    return res.status(500).json({ error: error?.message ?? "Failed to fetch Stripe prices" });
  }
}

export async function createPlanAdmin(req: Request, res: Response) {
  const parsed = planCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const stripePriceId = parsed.data.stripePriceId?.trim() || "manual";
  const plan = await createSubscriptionPlan({
    ...parsed.data,
    stripePriceId,
  });
  void cache.del(cacheKeys.billingPlans());
  return res.status(201).json({ plan });
}

export async function invitePlanUserAdmin(req: Request, res: Response) {
  const planId = z.coerce.number().int().min(1).parse(req.params.planId);
  const parsed = planInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const result = await inviteUserToPlan({
      planId,
      email: parsed.data.email,
      invitedByUserId: req.user.id,
      invitedByName: req.user.name ?? null,
    });
    return res.status(200).json({ invite: result });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    return res.status(status).json({ error: err?.message ?? "Failed to send invite." });
  }
}

export async function getPlanInviteSummaryPublic(req: Request, res: Response) {
  const token = String(req.params.token ?? "").trim();
  if (!token) return res.status(400).json({ error: "Token is required." });
  try {
    const summary = await getPlanInviteSummary(token);
    return res.status(200).json(summary);
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 401;
    return res.status(status).json({ error: err?.message ?? "Invalid invite." });
  }
}

export async function consumePlanInvitePublic(req: Request, res: Response) {
  const token = String(req.params.token ?? "").trim();
  if (!token) return res.status(400).json({ error: "Token is required." });
  const parsed = planInviteConsumeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  try {
    const result = await consumePlanInvite({ token, ...parsed.data });
    return res.status(200).json(result);
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    return res.status(status).json({ error: err?.message ?? "Failed to start checkout." });
  }
}

export async function importPlanAdmin(req: Request, res: Response) {
  const parsed = planImportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const plan = await importStripePriceAsPlan(parsed.data);
  void cache.del(cacheKeys.billingPlans());
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
  void cache.del(cacheKeys.billingPlans());
  return res.status(200).json({ plan });
}

export async function listRequestsAdmin(_req: Request, res: Response) {
  const requests = await listSubscriptionRequests();
  return res.status(200).json({ requests });
}

export async function approveRequestAdmin(req: Request, res: Response) {
  const requestId = z.coerce.number().int().min(1).parse(req.params.requestId);
  try {
    const updated = await approveSubscriptionRequest(requestId);
    if (!updated) {
      return res.status(404).json({ error: "Request not found" });
    }
    return res.status(200).json({ request: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || "Failed to approve request" });
  }
}

export async function rejectRequestAdmin(req: Request, res: Response) {
  const requestId = z.coerce.number().int().min(1).parse(req.params.requestId);
  const updated = await updateSubscriptionRequestStatus(requestId, "rejected");
  if (!updated) {
    return res.status(404).json({ error: "Request not found" });
  }
  return res.status(200).json({ request: updated });
}

export async function syncRequestPaymentAdmin(req: Request, res: Response) {
  const requestId = z.coerce.number().int().min(1).parse(req.params.requestId);
  try {
    const updated = await syncSubscriptionRequestPaymentFromStripe(requestId);
    if (!updated) {
      return res.status(404).json({ error: "Request not found" });
    }
    return res.status(200).json({ request: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || "Failed to sync payment" });
  }
}

export async function listTeamRequestsAdmin(_req: Request, res: Response) {
  let requests = await listTeamSubscriptionRequestsAdmin();
  // Safety net for missed/delayed webhooks: reconcile unresolved requests from Stripe before rendering admin state.
  for (const reqItem of requests) {
    const requestId = Number((reqItem as any)?.requestId ?? 0);
    const status = String((reqItem as any)?.status ?? "").toLowerCase();
    const paymentStatus = String((reqItem as any)?.paymentStatus ?? "").toLowerCase();
    const isFinal = status === "approved" || status === "rejected";
    const looksUnresolved =
      !isFinal && (status === "pending_payment" || status === "pending_approval" || paymentStatus === "unpaid");
    if (!requestId || !looksUnresolved) continue;
    try {
      await syncTeamSubscriptionRequestPaymentFromStripe(requestId);
      await syncTeamPlayerInvitePaymentsFromStripe(requestId);
    } catch (err) {
      logger.warn({ err, requestId }, "[Billing] team payment sync failed before admin list");
    }
  }
  requests = await listTeamSubscriptionRequestsAdmin();
  const { listPlayerPaymentInvites } = await import("../../services/billing/team-request.service");
  const enriched = await Promise.all(
    requests.map(async (r) => {
      const requestId = Number((r as any)?.requestId ?? 0);
      if (!requestId) return { ...r, inviteEmailsTotal: 0, inviteEmailsSent: 0 };
      const invites = await listPlayerPaymentInvites(requestId);
      return {
        ...r,
        inviteEmailsTotal: invites.length,
        inviteEmailsSent: invites.filter((i: any) => i?.emailSentAt != null).length,
      };
    }),
  );
  return res.status(200).json({ requests: enriched });
}

export async function approveTeamRequestAdmin(req: Request, res: Response) {
  const requestId = z.coerce.number().int().min(1).parse(req.params.requestId);
  try {
    const updated = await approveTeamSubscriptionRequest(requestId);
    if (!updated) {
      return res.status(404).json({ error: "Request not found" });
    }
    return res.status(200).json({ request: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || "Failed to approve team request" });
  }
}

export async function rejectTeamRequestAdmin(req: Request, res: Response) {
  const requestId = z.coerce.number().int().min(1).parse(req.params.requestId);
  const updated = await rejectTeamSubscriptionRequest(requestId);
  if (!updated) {
    return res.status(404).json({ error: "Request not found" });
  }
  return res.status(200).json({ request: updated });
}

export async function syncTeamRequestPaymentAdmin(req: Request, res: Response) {
  const requestId = z.coerce.number().int().min(1).parse(req.params.requestId);
  try {
    const updated = await syncTeamSubscriptionRequestPaymentFromStripe(requestId);
    if (!updated) {
      return res.status(404).json({ error: "Request not found" });
    }
    return res.status(200).json({ request: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || "Failed to sync payment" });
  }
}

export async function listTeamPlayerInvitesAdmin(req: Request, res: Response) {
  const requestId = parseInt(req.params.requestId as string, 10);
  if (isNaN(requestId)) {
    return res.status(400).json({ error: "Invalid request id" });
  }
  const { listPlayerPaymentInvites } = await import("../../services/billing/team-request.service");
  try {
    await syncTeamPlayerInvitePaymentsFromStripe(requestId);
  } catch (err) {
    logger.warn({ err, requestId }, "[Billing] invite payment sync failed before admin list");
  }
  const invites = await listPlayerPaymentInvites(requestId);
  return res.status(200).json({ invites });
}

export async function resendTeamPlayerInviteAdmin(req: Request, res: Response) {
  const requestId = z.coerce.number().int().min(1).parse(req.params.requestId);
  const inviteId = z.coerce.number().int().min(1).parse(req.params.inviteId);

  try {
    const [row] = await db
      .select({
        requestId: teamSubscriptionRequestTable.id,
        teamId: teamSubscriptionRequestTable.teamId,
        billingCycle: teamSubscriptionRequestTable.planBillingCycle,
        teamName: teamTable.name,
        planName: subscriptionPlanTable.name,
        planTier: subscriptionPlanTable.tier,
        stripePriceId: subscriptionPlanTable.stripePriceId,
        stripePriceIdMonthly: subscriptionPlanTable.stripePriceIdMonthly,
        stripePriceIdYearly: subscriptionPlanTable.stripePriceIdYearly,
        planDisplayPrice: subscriptionPlanTable.displayPrice,
        planMonthlyPrice: subscriptionPlanTable.monthlyPrice,
        planYearlyPrice: subscriptionPlanTable.yearlyPrice,
        inviteId: teamPlayerPaymentInviteTable.id,
        playerEmail: teamPlayerPaymentInviteTable.playerEmail,
        playerName: teamPlayerPaymentInviteTable.playerName,
        amountCents: teamPlayerPaymentInviteTable.amountCents,
        currency: teamPlayerPaymentInviteTable.currency,
        status: teamPlayerPaymentInviteTable.status,
      })
      .from(teamPlayerPaymentInviteTable)
      .innerJoin(teamSubscriptionRequestTable, eq(teamPlayerPaymentInviteTable.requestId, teamSubscriptionRequestTable.id))
      .innerJoin(teamTable, eq(teamSubscriptionRequestTable.teamId, teamTable.id))
      .leftJoin(subscriptionPlanTable, eq(teamSubscriptionRequestTable.planId, subscriptionPlanTable.id))
      .where(eq(teamPlayerPaymentInviteTable.id, inviteId))
      .limit(1);

    if (!row || row.requestId !== requestId) {
      return res.status(404).json({ error: "Invite not found for this request." });
    }
    if (row.status === "paid") {
      return res.status(400).json({ error: "This player has already paid." });
    }

    const interval =
      row.billingCycle === "yearly" ? "yearly" : row.billingCycle === "six_months" || row.billingCycle === "6months" ? "six_months" : "monthly";
    let priceId = "";
    if (interval === "six_months") {
      const lookupKey = row.planTier ? `${String(row.planTier).toLowerCase()}_six_months` : "";
      if (lookupKey) {
        const prices = await getStripeClient().prices.list({ lookup_keys: [lookupKey], active: true });
        priceId = prices.data[0]?.id ?? "";
      }
    } else {
      priceId = ensureStripePriceId(
        {
          stripePriceId: row.stripePriceId,
          stripePriceIdMonthly: row.stripePriceIdMonthly,
          stripePriceIdYearly: row.stripePriceIdYearly,
          tier: row.planTier,
        },
        interval,
      );
    }
    if (!priceId) {
      return res.status(400).json({ error: "Plan is not configured for Stripe payment links." });
    }

    const amountCents =
      row.amountCents ??
      (interval === "yearly"
        ? parsePriceToCents(row.planYearlyPrice) ?? parsePriceToCents(row.planMonthlyPrice ?? row.planDisplayPrice)
        : interval === "six_months"
          ? (() => {
              const monthly = parsePriceToCents(row.planMonthlyPrice ?? row.planDisplayPrice);
              return monthly == null ? parsePriceToCents(row.planDisplayPrice) : monthly * 6;
            })()
          : parsePriceToCents(row.planMonthlyPrice ?? row.planDisplayPrice));
    const currency = (row.currency ?? "gbp").toLowerCase();
    const productName = `${row.teamName} - ${String(row.planName ?? row.planTier ?? "PH Performance plan")}`;
    const fallbackLineItem = () => {
      if (!amountCents) {
        throw new Error("Plan amount is missing, so a fallback Stripe checkout price cannot be created.");
      }
      return {
        price_data: {
          currency,
          product_data: { name: productName },
          unit_amount: amountCents,
          ...(interval === "monthly" ? { recurring: { interval: "month" as const } } : {}),
        },
        quantity: 1,
      };
    };
    const primaryLineItem =
      priceId && !priceId.startsWith("seed_") ? { price: priceId, quantity: 1 } : fallbackLineItem();
    const createCheckoutSession = (lineItem: Stripe.Checkout.SessionCreateParams.LineItem) =>
      getStripeClient().checkout.sessions.create({
      mode: interval === "monthly" ? "subscription" : "payment",
      customer_email: row.playerEmail,
      ...(interval !== "monthly" ? { customer_creation: "always" as const } : {}),
      payment_method_types: ["card"],
      line_items: [lineItem],
      ...(interval !== "monthly" ? { payment_intent_data: { receipt_email: row.playerEmail } } : {}),
      metadata: {
        type: "team_player_invite",
        inviteId: String(row.inviteId),
        requestId: String(row.requestId),
        teamId: String(row.teamId),
      },
      success_url: `${getSuccessUrl()}?session_id={CHECKOUT_SESSION_ID}&player_paid=true`,
      cancel_url: getCancelUrl(),
      });
    let session: Stripe.Checkout.Session;
    try {
      session = await createCheckoutSession(primaryLineItem);
    } catch (err) {
      if (!("price" in primaryLineItem) || !isStripePriceMissingError(err)) {
        throw err;
      }
      session = await createCheckoutSession(fallbackLineItem());
    }

    await db
      .update(teamPlayerPaymentInviteTable)
      .set({
        stripeSessionId: session.id,
        stripePaymentLinkUrl: session.url,
        emailLastError: null,
        updatedAt: new Date(),
      })
      .where(eq(teamPlayerPaymentInviteTable.id, inviteId));

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    const emailResult = await sendTeamPlayerPaymentInviteEmail({
      to: row.playerEmail,
      payerName: row.playerName,
      teamName: row.teamName,
      planName: String(row.planName ?? row.planTier ?? "PH Performance plan"),
      checkoutUrl: session.url,
    });

    if (!emailResult.ok) {
      await db
        .update(teamPlayerPaymentInviteTable)
        .set({ emailLastError: emailResult.error, updatedAt: new Date() })
        .where(eq(teamPlayerPaymentInviteTable.id, inviteId));
      await db
        .update(teamSubscriptionRequestTable)
        .set({ inviteEmailsReady: false, inviteEmailsLastAttemptAt: new Date(), inviteEmailsError: emailResult.error, updatedAt: new Date() })
        .where(eq(teamSubscriptionRequestTable.id, requestId));
      return res.status(502).json({ error: emailResult.error });
    }

    await db
      .update(teamPlayerPaymentInviteTable)
      .set({ emailSentAt: new Date(), emailLastError: null, updatedAt: new Date() })
      .where(eq(teamPlayerPaymentInviteTable.id, inviteId));

    const { listPlayerPaymentInvites } = await import("../../services/billing/team-request.service");
    const invites = await listPlayerPaymentInvites(requestId);
    const allEmailsSent = invites.length > 0 && invites.every((invite) => invite.emailSentAt != null);
    await db
      .update(teamSubscriptionRequestTable)
      .set({
        inviteEmailsReady: allEmailsSent,
        inviteEmailsLastAttemptAt: new Date(),
        inviteEmailsError: allEmailsSent ? null : "Some invite emails have not been sent yet.",
        updatedAt: new Date(),
      })
      .where(eq(teamSubscriptionRequestTable.id, requestId));

    const refreshed = await listPlayerPaymentInvites(requestId);
    return res.status(200).json({ ok: true, invites: refreshed });
  } catch (error: any) {
    logger.warn({ err: error, requestId, inviteId }, "[Billing] resend team player invite failed");
    return res.status(500).json({ error: error?.message || "Failed to resend invite email." });
  }
}

export async function sponsorTeamPlayerInviteAdmin(req: Request, res: Response) {
  const requestId = z.coerce.number().int().min(1).parse(req.params.requestId);
  const inviteId = z.coerce.number().int().min(1).parse(req.params.inviteId);

  try {
    const request = await sponsorTeamPlayerPaymentInvite(requestId, inviteId);
    if (!request) {
      return res.status(404).json({ error: "Invite not found for this request." });
    }
    const { listPlayerPaymentInvites } = await import("../../services/billing/team-request.service");
    const invites = await listPlayerPaymentInvites(requestId);
    return res.status(200).json({ ok: true, request, invites });
  } catch (error: any) {
    logger.warn({ err: error, requestId, inviteId }, "[Billing] sponsor team player invite failed");
    return res.status(500).json({ error: error?.message || "Failed to sponsor player invite." });
  }
}
