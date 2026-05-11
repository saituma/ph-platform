import type { Request, Response } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";

import { env } from "../../config/env";
import {
  athleteTable,
  subscriptionPlanTable,
  subscriptionRequestTable,
  teamSubscriptionRequestTable,
  teamTable,
  teamPlayerPaymentInviteTable,
  teamPaymentConfigDraftTable,
  userTable,
} from "../../db/schema";
import { db } from "../../db";
import { getAthleteForUser } from "../../services/user.service";
import {
  createTeamCheckoutSession,
  ensureStripePriceId,
  getCancelUrl,
  getSuccessUrl,
  getStripeClient,
  isStripeCheckoutSessionNotFoundError,
  isStripePriceMissingError,
} from "../../services/billing/stripe.service";
import {
  createCheckoutSession,
  createPaymentSheetIntent,
  confirmPaymentSheetIntent,
  updateRequestFromStripeSession,
} from "../../services/billing.service";
import {
  createTeamSubscriptionRequest,
  upsertTeamPendingApprovalFromSessionMetadata,
  updateTeamRequestFromStripeCheckoutSession,
} from "../../services/billing/team-request.service";
import { buildClientCheckoutReceipt } from "../../services/billing/checkout-confirmation-payload";
import { enrichReceiptWithStripeSession, getPaymentReceiptForViewer } from "../../services/billing/receipt.service";
import { sendTeamPlayerPaymentInviteEmail } from "../../lib/mailer/billing.mailer";
import { logger } from "../../lib/logger";
import { cache, cacheKeys } from "../../lib/cache";

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
  billingCycle: z.enum(["weekly", "monthly", "six_months", "yearly", "one_time"]).optional(),
  interval: z.literal("monthly").optional(),
});

const confirmSchema = z.object({
  sessionId: z.string().min(1),
});

const receiptPublicIdSchema = z.string().uuid("Invalid receipt id");

const teamCheckoutSchema = z.object({
  teamId: z.coerce.number().int().min(1),
  planId: z.coerce.number().int().min(1),
  billingCycle: z.enum(["monthly", "six_months", "yearly"]).default("monthly"),
  paymentMode: z.enum(["coach_pays_all", "per_player_all", "per_player_selected"]).default("coach_pays_all"),
  coachPaysSeats: z.coerce.number().int().min(0).default(0),
  termsAcceptedAt: z.string().optional(),
  termsVersion: z.string().optional(),
  playerEmails: z.array(z.string().email()).optional(),
  playerPayers: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        email: z.string().trim().email(),
      }),
    )
    .optional(),
});

const teamPaymentDraftSchema = z.object({
  scopeKey: z.string().trim().min(1),
  paymentMode: z.enum(["coach_pays_all", "per_player_all", "per_player_selected"]).default("coach_pays_all"),
  coachPaysSeats: z.coerce.number().int().min(0).default(0),
  termsAcceptedAt: z.string().optional(),
  termsVersion: z.string().optional(),
  playerPayers: z
    .array(
      z.object({
        id: z.coerce.number().int().optional(),
        name: z.string().trim().min(1),
        email: z.string().trim().email(),
        selected: z.boolean().optional(),
      }),
    )
    .default([]),
});

export async function getTeamPaymentConfigDraft(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const teamId = z.coerce.number().int().min(1).safeParse(req.params.teamId);
  if (!teamId.success) return res.status(400).json({ error: "Invalid team id" });

  const teamRows = await db
    .select({ id: teamTable.id, adminId: teamTable.adminId })
    .from(teamTable)
    .where(eq(teamTable.id, teamId.data))
    .limit(1);
  const team = teamRows[0];
  if (!team) return res.status(404).json({ error: "Team not found" });
  if (team.adminId !== req.user.id) return res.status(403).json({ error: "You do not have access to this team" });

  const rows = await db
    .select()
    .from(teamPaymentConfigDraftTable)
    .where(eq(teamPaymentConfigDraftTable.teamId, team.id))
    .limit(1);
  const draft = rows[0] ?? null;
  return res.status(200).json({ draft });
}

export async function upsertTeamPaymentConfigDraft(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const teamId = z.coerce.number().int().min(1).safeParse(req.params.teamId);
  if (!teamId.success) return res.status(400).json({ error: "Invalid team id" });
  const parsed = teamPaymentDraftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const teamRows = await db
    .select({ id: teamTable.id, adminId: teamTable.adminId })
    .from(teamTable)
    .where(eq(teamTable.id, teamId.data))
    .limit(1);
  const team = teamRows[0];
  if (!team) return res.status(404).json({ error: "Team not found" });
  if (team.adminId !== req.user.id) return res.status(403).json({ error: "You do not have access to this team" });

  const termsAcceptedAt = parsed.data.termsAcceptedAt ? new Date(parsed.data.termsAcceptedAt) : null;

  const [draft] = await db
    .insert(teamPaymentConfigDraftTable)
    .values({
      adminId: req.user.id,
      teamId: team.id,
      scopeKey: parsed.data.scopeKey,
      paymentMode: parsed.data.paymentMode,
      coachPaysSeats: parsed.data.coachPaysSeats,
      termsAcceptedAt,
      termsVersion: parsed.data.termsVersion,
      playerPayers: parsed.data.playerPayers,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [teamPaymentConfigDraftTable.adminId, teamPaymentConfigDraftTable.teamId],
      set: {
        scopeKey: parsed.data.scopeKey,
        paymentMode: parsed.data.paymentMode,
        coachPaysSeats: parsed.data.coachPaysSeats,
        termsAcceptedAt,
        termsVersion: parsed.data.termsVersion,
        playerPayers: parsed.data.playerPayers,
        updatedAt: new Date(),
      },
    })
    .returning();

  return res.status(200).json({ draft });
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
      name: teamTable.name,
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

  // Prevent duplicate charge attempts when a prior team request is already paid
  // and waiting on admin approval.
  const latestRequestRows = await db
    .select({
      id: teamSubscriptionRequestTable.id,
      status: teamSubscriptionRequestTable.status,
      paymentStatus: teamSubscriptionRequestTable.paymentStatus,
    })
    .from(teamSubscriptionRequestTable)
    .where(eq(teamSubscriptionRequestTable.teamId, team.id))
    .orderBy(desc(teamSubscriptionRequestTable.createdAt))
    .limit(1);
  const latestRequest = latestRequestRows[0] ?? null;
  if (latestRequest) {
    const status = String(latestRequest.status ?? "").toLowerCase();
    const paymentStatus = String(latestRequest.paymentStatus ?? "").toLowerCase();
    const isPaid = paymentStatus === "paid" || paymentStatus === "no_payment_required";
    if (status === "pending_approval" || (isPaid && status !== "rejected")) {
      return res.status(409).json({
        error: "You've already completed payment. Please wait for an approval message from the admin.",
        requestId: latestRequest.id,
      });
    }
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
  const paymentMode = parsed.data.paymentMode;
  const coachPaysSeats = parsed.data.coachPaysSeats;
  const intervalKey = billingCycle === "monthly" ? "monthly" : billingCycle === "six_months" ? "six_months" : "yearly";
  const lookupKey =
    plan.tier
      ? `${String(plan.tier).toLowerCase()}_${intervalKey}`
      : intervalKey === "monthly"
        ? ensureStripePriceId(
            {
              stripePriceId: plan.stripePriceId,
              stripePriceIdMonthly: plan.stripePriceIdMonthly,
              stripePriceIdYearly: plan.stripePriceIdYearly,
              tier: null,
            },
            "monthly",
          )
        : intervalKey === "yearly"
          ? ensureStripePriceId(
              {
                stripePriceId: plan.stripePriceId,
                stripePriceIdMonthly: plan.stripePriceIdMonthly,
                stripePriceIdYearly: plan.stripePriceIdYearly,
                tier: null,
              },
              "yearly",
            )
          : String(plan.stripePriceIdOneTime ?? plan.stripePriceId ?? "").trim();

  let coachQuantity = Math.max(1, Number(team.maxAthletes ?? 1));
  if (paymentMode === "per_player_all") {
    coachQuantity = 0;
  } else if (paymentMode === "per_player_selected") {
    coachQuantity = coachPaysSeats;
  }

  try {
    // 1. If coach needs to pay, create their checkout session
    let session: Stripe.Checkout.Session | null = null;
    if (coachQuantity > 0) {
      session = await createTeamCheckoutSession({
        teamId: team.id,
        adminId: req.user.id,
        priceLookupKey: lookupKey,
        tier: plan.tier as any,
        interval: intervalKey,
        quantity: coachQuantity,
        mode: billingCycle === "monthly" ? "subscription" : "payment",
        customerEmail: req.user.email,
        metadata: {
          planId: String(plan.id),
          billingCycle,
          paymentMode,
          coachPaysSeats: String(coachPaysSeats),
          termsAcceptedAt: parsed.data.termsAcceptedAt ?? "",
          termsVersion: parsed.data.termsVersion ?? "",
        },
      });
    }

    // 2. We always need a team request row for player invites.
    // If coach has a session, upsertTeamPendingApprovalFromSessionMetadata handles it later,
    // BUT we need it NOW to create player invites. Let's create it upfront.
    const termsAcceptedAt = parsed.data.termsAcceptedAt ? new Date(parsed.data.termsAcceptedAt) : null;
    const request = await createTeamSubscriptionRequest({
      adminId: req.user.id,
      teamId: team.id,
      planId: plan.id,
      planBillingCycle: billingCycle,
      stripeSessionId: session?.id ?? `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      paymentMode,
      coachPaysSeats,
      termsAcceptedAt,
      termsVersion: parsed.data.termsVersion,
    });

    await db
      .update(teamTable)
      .set({
        planId: plan.id,
        updatedAt: new Date(),
      })
      .where(eq(teamTable.id, team.id));

    // 3. Generate player invites if applicable
    let invitesSent = 0;
    let inviteEmailsSent = 0;
    let inviteEmailsError: string | null = null;
    if ((paymentMode === "per_player_all" || paymentMode === "per_player_selected") && request) {
       // We will generate Stripe payment links/sessions for players and send emails here
       const { getStripeClient, resolveTierFallbackPrice } = await import("../../services/billing/stripe.service");
       const { createPlayerPaymentInvites } = await import("../../services/billing/team-request.service");

       const stripeClient = getStripeClient();
       let priceId: string | undefined;
       try {
         if (lookupKey.startsWith("price_")) {
           priceId = lookupKey;
         } else {
           const prices = await stripeClient.prices.list({ lookup_keys: [lookupKey], active: true });
           if (prices.data[0]) priceId = prices.data[0].id;
         }
       } catch {}
       if (!priceId && intervalKey === "monthly" && plan.tier) {
         priceId = resolveTierFallbackPrice(plan.tier as any, "monthly");
       }
       if (!priceId) throw new Error("Price not found for player invites");

       // Calculate amount for per-player. Usually price.unit_amount.
       const priceObj = await stripeClient.prices.retrieve(priceId);
       const amountCents = priceObj.unit_amount ?? 0;

       const payerRows =
         parsed.data.playerPayers && parsed.data.playerPayers.length > 0
           ? parsed.data.playerPayers.map((p) => ({ name: p.name.trim(), email: p.email.trim() }))
           : (parsed.data.playerEmails ?? []).map((email) => ({ email: email.trim() }));

       const invites = await createPlayerPaymentInvites(
         request.id,
         team.id,
         payerRows,
         amountCents,
         priceObj.currency
       );

       for (const invite of invites) {
         // Create a checkout session for each player
         const playerSession = await stripeClient.checkout.sessions.create({
           mode: billingCycle === "monthly" ? "subscription" : "payment",
           customer_email: invite.playerEmail,
           ...(billingCycle !== "monthly" ? { customer_creation: "always" } : {}),
           payment_method_types: ["card"],
           line_items: [{ price: priceId, quantity: 1 }],
           ...(billingCycle !== "monthly"
             ? { payment_intent_data: { receipt_email: invite.playerEmail } }
             : {}),
           metadata: {
             type: "team_player_invite",
             inviteId: String(invite.id),
             requestId: String(request.id),
             teamId: String(team.id),
           },
           success_url: `${getSuccessUrl()}?session_id={CHECKOUT_SESSION_ID}&player_paid=true`,
           cancel_url: getCancelUrl(),
         });

         await db.update(teamPlayerPaymentInviteTable)
           .set({ stripeSessionId: playerSession.id, stripePaymentLinkUrl: playerSession.url })
           .where(eq(teamPlayerPaymentInviteTable.id, invite.id));

         if (playerSession.url) {
           const emailResult = await sendTeamPlayerPaymentInviteEmail({
             to: invite.playerEmail,
             payerName: invite.playerName,
             teamName: team.name,
             planName: String(plan.name ?? plan.tier ?? "PH Performance plan"),
             checkoutUrl: playerSession.url,
           });
           if (emailResult.ok) {
             inviteEmailsSent += 1;
             await db
               .update(teamPlayerPaymentInviteTable)
               .set({ emailSentAt: new Date(), emailLastError: null, updatedAt: new Date() })
               .where(eq(teamPlayerPaymentInviteTable.id, invite.id));
           } else {
             inviteEmailsError = emailResult.error;
             await db
               .update(teamPlayerPaymentInviteTable)
               .set({ emailLastError: emailResult.error, updatedAt: new Date() })
               .where(eq(teamPlayerPaymentInviteTable.id, invite.id));
           }
         }
       }
       invitesSent = invites.length;
       const allEmailsSent = invitesSent > 0 && inviteEmailsSent === invitesSent;
       await db
         .update(teamSubscriptionRequestTable)
         .set({
           inviteEmailsReady: allEmailsSent,
           inviteEmailsLastAttemptAt: new Date(),
           inviteEmailsError,
           updatedAt: new Date(),
         })
         .where(eq(teamSubscriptionRequestTable.id, request.id));
    } else if (request) {
      await db
        .update(teamSubscriptionRequestTable)
        .set({
          inviteEmailsReady: true,
          inviteEmailsLastAttemptAt: new Date(),
          inviteEmailsError: null,
          updatedAt: new Date(),
        })
        .where(eq(teamSubscriptionRequestTable.id, request.id));
    }

    if (session) {
      return res.status(200).json({ checkoutUrl: session.url, sessionId: session.id, invitesSent });
    } else {
      return res.status(200).json({ success: true, invitesSent });
    }
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
          logger.error({ err: inner }, "[billing] confirmCheckout team_subscription db");
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
    if (req.user) void cache.del(cacheKeys.billingStatus(req.user.id));
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

/**
 * Public variant of `confirmCheckout` — no auth required because the Stripe session ID itself
 * is the credential (only the paying user knows it). Verifies the session is `paid` before
 * doing any state changes. Used by the success page when the visitor isn't signed in
 * (e.g. invite-flow checkouts where the user pays before logging in).
 */
export async function confirmCheckoutPublic(req: Request, res: Response) {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
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
    if (paymentStatus !== "paid") {
      return res.status(409).json({ error: "Checkout session is not paid yet.", paymentStatus });
    }

    const meta = (session.metadata ?? {}) as Record<string, string | undefined>;
    const metaType = String(meta.type ?? "").trim().toLowerCase();
    if (metaType === "team_subscription") {
      // Public flow doesn't currently support team checkouts; fall back to no-op success.
      return res.status(200).json({ teamRequest: null, paymentStatus, receipt: null });
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
    const message = error instanceof Error ? error.message : "Failed to confirm payment";
    if (isStripeCheckoutSessionNotFoundError(error)) {
      return res.status(404).json({ error: "Checkout session not found." });
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
