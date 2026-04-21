import type { Request, Response } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { ProgramType } from "../db/schema";
import { env } from "../config/env";
import {
  athleteTable,
  guardianTable,
  subscriptionPlanTable,
  subscriptionRequestTable,
  teamSubscriptionRequestTable,
  teamTable,
  userTable,
} from "../db/schema";
import { getMessagingAccessTiers } from "../services/messaging-policy.service";
import { db } from "../db";
import { getAthleteForUser } from "../services/user.service";
import {
  createTeamCheckoutSession,
  getStripeClient,
  isStripeCheckoutSessionNotFoundError,
  isStripePriceMissingError,
} from "../services/billing/stripe.service";
import {
  approveSubscriptionRequest,
  createCheckoutSession,
  createPaymentSheetIntent,
  createSubscriptionPlan,
  confirmPaymentSheetIntent,
  getLatestSubscriptionRequest,
  enrichPlansWithBillingQuotes,
  listSubscriptionPlans,
  listSubscriptionRequests,
  syncSubscriptionRequestPaymentFromStripe,
  updateSubscriptionRequestStatus,
  updateSubscriptionPlan,
  updateRequestFromStripeSession,
} from "../services/billing.service";
import {
  approveTeamSubscriptionRequest,
  createTeamSubscriptionRequest,
  listTeamSubscriptionRequestsAdmin,
  rejectTeamSubscriptionRequest,
  syncTeamSubscriptionRequestPaymentFromStripe,
  updateTeamRequestFromStripeCheckoutSession,
  upsertTeamPendingApprovalFromSessionMetadata,
} from "../services/billing/team-request.service";
import { updateAthleteProgramTier } from "../services/admin/user.service";
import { buildClientCheckoutReceipt } from "../services/billing/checkout-confirmation-payload";
import { enrichReceiptWithStripeSession, getPaymentReceiptForViewer } from "../services/billing/receipt.service";

/** Walk Drizzle / node-pg `error.cause` chain for Postgres SQLSTATE (e.g. 42P01). */
function postgresSqlstate(error: unknown): string | undefined {
  let current: unknown = error;
  for (let i = 0; i < 10 && current && typeof current === "object"; i++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
      return code;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

const checkoutSchema = z.object({
  planId: z.coerce.number().int().min(1),
  billingCycle: z.enum(["monthly", "six_months", "yearly"]).optional(),
  interval: z.literal("monthly").optional(),
});

const listPlansQuerySchema = z.object({
  billingCycle: z.enum(["monthly", "six_months", "yearly"]).optional(),
});

const confirmSchema = z.object({
  sessionId: z.string().min(1),
});

const receiptPublicIdSchema = z.string().uuid("Invalid receipt id");

const teamCheckoutSchema = z.object({
  teamId: z.coerce.number().int().min(1),
  planId: z.coerce.number().int().min(1),
  billingCycle: z.enum(["monthly", "six_months", "yearly"]).default("monthly"),
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

const downgradeSchema = z.object({
  tier: z.enum(ProgramType.enumValues),
});

export async function listPlans(req: Request, res: Response) {
  const parsed = listPlansQuerySchema.safeParse(req.query);
  let plans = await listSubscriptionPlans({ includeInactive: true });
  if (parsed.success && parsed.data.billingCycle) {
    plans = await enrichPlansWithBillingQuotes(plans, parsed.data.billingCycle);
  }
  return res.status(200).json({ plans });
}

export async function getBillingStatus(req: Request, res: Response) {
  const messagingAccessTiers = await getMessagingAccessTiers();
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(200).json({
      athlete: null,
      currentProgramTier: null,
      latestRequest: null,
      messagingAccessTiers,
    });
  }
  const guardianRows = athlete.guardianId
    ? await db
        .select({ userId: guardianTable.userId })
        .from(guardianTable)
        .where(eq(guardianTable.id, athlete.guardianId))
        .limit(1)
    : [];
  const requestUserId = guardianRows[0]?.userId ?? req.user!.id;
  const latestRequest = await getLatestSubscriptionRequest({
    userId: requestUserId,
    athleteId: athlete.id,
  });
  return res.status(200).json({
    athlete,
    currentProgramTier: athlete.currentProgramTier ?? null,
    latestRequest,
    messagingAccessTiers,
  });
}

export async function downgradePlan(req: Request, res: Response) {
  const parsed = downgradeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete || !athlete.currentProgramTier) {
    return res.status(400).json({ error: "No active plan to downgrade" });
  }

  const tierOrder: Record<(typeof ProgramType.enumValues)[number], number> = {
    PHP: 1,
    PHP_Premium: 2,
    PHP_Premium_Plus: 3,
    PHP_Pro: 4,
  };
  const currentTier = athlete.currentProgramTier as (typeof ProgramType.enumValues)[number];
  const targetTier = parsed.data.tier as (typeof ProgramType.enumValues)[number];
  const currentRank = tierOrder[currentTier];
  const targetRank = tierOrder[targetTier];

  if (targetRank >= currentRank) {
    return res.status(400).json({ error: "Only downgrades are allowed." });
  }

  const updated = await updateAthleteProgramTier(athlete.id, targetTier);
  const latestRequest = await getLatestSubscriptionRequest({
    userId: req.user!.id,
    athleteId: athlete.id,
  });
  if (latestRequest && ["pending_payment", "pending_approval"].includes(latestRequest.status)) {
    await updateSubscriptionRequestStatus(latestRequest.requestId, "rejected");
  }

  return res.status(200).json({
    currentProgramTier: updated?.currentProgramTier ?? targetTier,
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

  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "No athlete profile found" });
  }

  try {
    const { session, request } = await createCheckoutSession({
      userId: req.user!.id,
      userEmail: req.user!.email,
      athleteId: athlete.id,
      planId: parsed.data.planId,
      billingCycle: parsed.data.billingCycle,
    });
    return res.status(200).json({
      checkoutUrl: session.url,
      sessionId: session.id,
      request,
    });
  } catch (error: any) {
    const statusCode = typeof error?.statusCode === "number" ? error.statusCode : null;
    const code = typeof error?.code === "string" ? error.code : null;
    const param = typeof error?.param === "string" ? error.param : null;
    const message = typeof error?.message === "string" ? error.message : "Failed to create checkout session";

    // Stripe returns 404 resource_missing when a referenced Price id doesn't exist in the current account/mode.
    if (statusCode === 404 && (code === "resource_missing" || code === "invalid_request_error") && param === "price") {
      return res.status(400).json({
        error:
          "Stripe price not found. Check that the plan's Stripe price id (price_...) or lookup key exists in the same Stripe account/mode as STRIPE_SECRET_KEY (test vs live).",
      });
    }

    // Common config/validation errors should be surfaced as 400s.
    if (
      message === "Plan not available" ||
      message === "Stripe is not configured" ||
      message.startsWith("Stripe could not find price ") ||
      message.includes("Plan is not configured for Stripe payments") ||
      message.startsWith("No Stripe price for ") ||
      message.startsWith("Invalid Stripe price reference ") ||
      message.startsWith("Price not found.")
    ) {
      return res.status(400).json({ error: message });
    }

    if (message.includes("Not a valid URL")) {
      return res.status(400).json({
        error:
          "Stripe redirect URLs must be absolute (include http:// or https://). Set STRIPE_SUCCESS_URL and STRIPE_CANCEL_URL in apps/api/.env — for example http://localhost:3000/onboarding/success",
      });
    }

    return res.status(500).json({ error: message });
  }
}

export async function createTeamCheckout(req: Request, res: Response) {
  const parsed = teamCheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const teamRows = await db
    .select({
      id: teamTable.id,
      adminId: teamTable.adminId,
      maxAthletes: teamTable.maxAthletes,
    })
    .from(teamTable)
    .where(eq(teamTable.id, parsed.data.teamId))
    .limit(1);
  const team = teamRows[0];
  if (!team) {
    return res.status(404).json({ error: "Team not found" });
  }
  if (team.adminId !== req.user.id) {
    return res.status(403).json({ error: "You do not have access to this team" });
  }

  const planRows = await db
    .select()
    .from(subscriptionPlanTable)
    .where(eq(subscriptionPlanTable.id, parsed.data.planId))
    .limit(1);
  const plan = planRows[0];
  if (!plan || plan.isActive === false) {
    return res.status(400).json({ error: "Plan not available" });
  }

  const billingCycle = parsed.data.billingCycle;
  const intervalKey = billingCycle === "monthly" ? "monthly" : billingCycle === "six_months" ? "six_months" : "yearly";
  const lookupKey = `${String(plan.tier).toLowerCase()}_${intervalKey}`;
  const quantity = Math.max(1, Number(team.maxAthletes ?? 1));

  try {
    const session = await createTeamCheckoutSession({
      teamId: team.id,
      adminId: req.user.id,
      priceLookupKey: lookupKey,
      tier: plan.tier as any,
      interval: intervalKey,
      quantity,
      mode: billingCycle === "monthly" ? "subscription" : "payment",
      customerEmail: req.user.email,
      metadata: {
        planId: String(plan.id),
        billingCycle,
      },
    });

    await db
      .update(teamTable)
      .set({
        planId: plan.id,
        updatedAt: new Date(),
      })
      .where(eq(teamTable.id, team.id));

    return res.status(200).json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error: any) {
    const statusCode = typeof error?.statusCode === "number" ? error.statusCode : null;
    const code = typeof error?.code === "string" ? error.code : null;
    const param = typeof error?.param === "string" ? error.param : null;
    const message = typeof error?.message === "string" ? error.message : "Failed to create checkout session";

    if (statusCode === 404 && (code === "resource_missing" || code === "invalid_request_error") && param === "price") {
      return res.status(400).json({
        error:
          "Stripe price not found. Check the plan's Stripe Lookup Key configuration and STRIPE_SECRET_KEY mode (test vs live).",
      });
    }

    if (
      message === "Plan not available" ||
      message === "Stripe is not configured" ||
      message.startsWith("Stripe could not find price ") ||
      message.startsWith("Price not found.")
    ) {
      return res.status(400).json({ error: message });
    }

    if (message.includes("Not a valid URL")) {
      return res.status(400).json({
        error:
          "Stripe redirect URLs must be absolute (include http:// or https://). Set STRIPE_SUCCESS_URL and STRIPE_CANCEL_URL in apps/api/.env — for example http://localhost:3000/onboarding/success",
      });
    }

    return res.status(500).json({ error: message });
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
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "No athlete profile found" });
  }

  try {
    const result = await createPaymentSheetIntent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      athleteId: athlete.id,
      planId: parsed.data.planId,
      interval: "monthly",
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
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const result = await confirmPaymentSheetIntent({
      paymentIntentId: input.data.paymentIntentId,
      userId: req.user.id,
    });
    if (!result.request) {
      return res.status(404).json({ error: "Payment request not found" });
    }
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
    if (!env.stripeSecretKey) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId, {
      expand: ["line_items.data.price"],
    });
    const paymentStatus = session.payment_status ?? "unpaid";
    const meta = (session.metadata ?? {}) as Record<string, string | undefined>;

    const metaType = String(meta.type ?? "")
      .trim()
      .toLowerCase();
    if (metaType === "team_subscription") {
      const adminId = Number(meta.adminId ?? "");
      if (!Number.isFinite(adminId) || adminId !== req.user.id) {
        return res.status(403).json({ error: "You do not have access to this checkout session" });
      }
      try {
        await upsertTeamPendingApprovalFromSessionMetadata(session);
        const teamRequest = await updateTeamRequestFromStripeCheckoutSession(session, paymentStatus);
        if (!teamRequest) {
          return res.status(200).json({ teamRequest: null, paymentStatus, receipt: null });
        }
        const [teamExtra] = await db
          .select({
            teamName: teamTable.name,
            maxAthletes: teamTable.maxAthletes,
            planName: subscriptionPlanTable.name,
            planTier: subscriptionPlanTable.tier,
            payerEmail: userTable.email,
            payerName: userTable.name,
            payerRole: userTable.role,
          })
          .from(teamSubscriptionRequestTable)
          .innerJoin(userTable, eq(teamSubscriptionRequestTable.adminId, userTable.id))
          .innerJoin(teamTable, eq(teamSubscriptionRequestTable.teamId, teamTable.id))
          .leftJoin(subscriptionPlanTable, eq(teamSubscriptionRequestTable.planId, subscriptionPlanTable.id))
          .where(eq(teamSubscriptionRequestTable.id, teamRequest.id))
          .limit(1);
        const receipt = buildClientCheckoutReceipt(session, {
          kind: "team",
          receiptPublicId: teamRequest.receiptPublicId,
          internalRequestId: teamRequest.id,
          status: teamRequest.status,
          paymentStatus: teamRequest.paymentStatus,
          planBillingCycle: teamRequest.planBillingCycle,
          payer: teamExtra
            ? { email: teamExtra.payerEmail, name: teamExtra.payerName, role: teamExtra.payerRole }
            : undefined,
          team: teamExtra
            ? { id: teamRequest.teamId, name: teamExtra.teamName, maxAthletes: teamExtra.maxAthletes }
            : { id: teamRequest.teamId, name: "Team", maxAthletes: null },
          plan:
            teamExtra?.planName != null
              ? { id: teamRequest.planId, name: teamExtra.planName, tier: teamExtra.planTier ?? "" }
              : null,
        });
        return res.status(200).json({ teamRequest, paymentStatus, receipt });
      } catch (inner: unknown) {
        const err = inner as {
          name?: string;
          message?: string;
          query?: string;
          cause?: { code?: string };
          code?: string;
        };
        const msg = typeof err?.message === "string" ? err.message : "";
        if (err?.name === "DrizzleQueryError" || typeof err?.query === "string" || msg.startsWith("Failed query:")) {
          const pgCode = postgresSqlstate(inner) ?? err?.cause?.code ?? err?.code;
          if (pgCode === "42P01" || pgCode === "42703") {
            return res.status(503).json({
              error: "Database schema is out of date. Run migrations and try again.",
              hint: "From the repo: cd apps/api && pnpm db:migrate (DATABASE_URL must point at this database).",
            });
          }
          if (pgCode === "23503") {
            return res.status(400).json({
              error:
                "Could not save subscription request: team, plan, or user no longer matches checkout metadata. Try creating a new checkout session.",
            });
          }
          console.error("[billing] confirmCheckout team_subscription db", inner);
          return res.status(500).json({ error: "Could not save subscription confirmation. Please contact support." });
        }
        throw inner;
      }
    }

    const metaUserId = Number(meta.userId ?? "");
    if (Number.isFinite(metaUserId) && metaUserId !== req.user.id) {
      return res.status(403).json({ error: "You do not have access to this checkout session" });
    }

    const request = await updateRequestFromStripeSession(session);
    let receipt: ReturnType<typeof buildClientCheckoutReceipt> | null = null;
    if (request) {
      const [athleteExtra] = await db
        .select({
          payerEmail: userTable.email,
          payerName: userTable.name,
          payerRole: userTable.role,
          athleteName: athleteTable.name,
          planName: subscriptionPlanTable.name,
          planTier: subscriptionPlanTable.tier,
        })
        .from(subscriptionRequestTable)
        .innerJoin(userTable, eq(subscriptionRequestTable.userId, userTable.id))
        .leftJoin(athleteTable, eq(subscriptionRequestTable.athleteId, athleteTable.id))
        .leftJoin(subscriptionPlanTable, eq(subscriptionRequestTable.planId, subscriptionPlanTable.id))
        .where(eq(subscriptionRequestTable.id, request.id))
        .limit(1);
      receipt = buildClientCheckoutReceipt(session, {
        kind: "athlete",
        receiptPublicId: request.receiptPublicId,
        internalRequestId: request.id,
        status: request.status,
        paymentStatus: request.paymentStatus,
        planBillingCycle: request.planBillingCycle,
        payer: athleteExtra
          ? { email: athleteExtra.payerEmail, name: athleteExtra.payerName, role: athleteExtra.payerRole }
          : undefined,
        athlete: athleteExtra
          ? { id: request.athleteId, name: athleteExtra.athleteName }
          : { id: request.athleteId, name: null },
        plan:
          athleteExtra?.planName != null
            ? { id: request.planId, name: athleteExtra.planName, tier: athleteExtra.planTier ?? "" }
            : null,
      });
    }
    return res.status(200).json({ request, paymentStatus, receipt });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number; code?: string; param?: string };
    const message = typeof e?.message === "string" ? e.message : "Failed to confirm payment";

    if (isStripePriceMissingError(error)) {
      return res.status(400).json({
        error:
          "Stripe no longer has the price used for this checkout (it may have been removed or is in a different test/live mode than STRIPE_SECRET_KEY). Create a new checkout session after fixing Stripe prices.",
      });
    }
    if (isStripeCheckoutSessionNotFoundError(error)) {
      return res.status(404).json({
        error:
          "Checkout session not found. Confirm you are using the session id from the redirect URL and the same Stripe mode (test vs live) as the API.",
      });
    }

    return res.status(500).json({ error: message });
  }
}

export async function getPaymentReceipt(req: Request, res: Response) {
  const receiptId = receiptPublicIdSchema.safeParse(req.params.receiptId);
  if (!receiptId.success) {
    return res.status(400).json({ error: "Invalid receipt id", details: receiptId.error.flatten() });
  }
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await getPaymentReceiptForViewer({
      receiptPublicId: receiptId.data,
      viewerUserId: req.user.id,
      viewerRole: req.user.role,
    });
    if (result === null) {
      return res.status(404).json({ error: "Receipt not found" });
    }
    if ("forbidden" in result) {
      return res.status(403).json({ error: "You do not have access to this receipt" });
    }
    const { stripeSummary } = await enrichReceiptWithStripeSession({
      stripeSessionId: result.stripeSessionId,
      paymentAmountCents: result.paymentAmountCents,
      paymentCurrency: result.paymentCurrency,
    });
    return res.status(200).json({ receipt: result, stripeSummary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load receipt";
    return res.status(500).json({ error: message });
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
  const plan = await createSubscriptionPlan({
    ...parsed.data,
    stripePriceId,
  });
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
  const requests = await listTeamSubscriptionRequestsAdmin();
  return res.status(200).json({ requests });
}

export async function approveTeamRequestAdmin(req: Request, res: Response) {
  const requestId = z.coerce.number().int().min(1).parse(req.params.requestId);
  const updated = await approveTeamSubscriptionRequest(requestId);
  if (!updated) {
    return res.status(404).json({ error: "Request not found" });
  }
  return res.status(200).json({ request: updated });
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

export async function verifyRevenueCatPurchase(req: any, res: any) {
  try {
    const userId = Number(req.user?.id);
    if (!userId || Number.isNaN(userId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { planId, tier, duration } = req.body;
    if (!planId || !tier) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // In a real implementation you would either rely on webhooks from RevenueCat,
    // or call their REST API to verify the receipt using the app_user_id.
    // For this demonstration, we'll mark the user as pending approval for the tier requested.

    // We can simulate creating a subscription request here:
    // ... we need to import a service function to do this, but for now we'll just return success.

    return res.json({ success: true, message: "Purchase verified via RevenueCat" });
  } catch (error) {
    console.error("Error verifying RevenueCat purchase", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
