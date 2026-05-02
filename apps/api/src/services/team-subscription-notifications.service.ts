import { and, eq, inArray, ne } from "drizzle-orm";

import { env } from "../config/env";
import { logger } from "../lib/logger";
import { db } from "../db";
import { subscriptionPlanTable, teamSubscriptionRequestTable, teamTable, userTable } from "../db/schema";
import { buildBillingReceiptEmailFromStripeSession } from "../lib/mailer/billing-receipt-email";
import {
  isMailDeliveryConfigured,
  sendSubscriptionApprovedUserEmail,
  sendSubscriptionPendingStaffEmail,
  sendSubscriptionPendingUserEmail,
} from "../lib/mailer";
import { getStripeClient } from "./billing/stripe.service";
import { ROLES_TRAINING_STAFF } from "../lib/user-roles";

function formatStripeAmount(amountCents: number | null, currency: string | null) {
  if (amountCents == null) return null;
  const cur = (currency || "gbp").toUpperCase();
  const amount = (amountCents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Keep it simple and human-readable; Stripe emails will show exact amounts anyway.
  return `${amount} ${cur}`;
}

export async function notifyTeamSubscriptionEnteredPendingApproval(teamRequestId: number) {
  if (!isMailDeliveryConfigured()) {
    logger.warn(
      '[Mailer] Team subscription emails skipped: outbound mail is not configured. Set RESEND_API_KEY, or SMTP_USER + SMTP_PASS + SMTP_FROM (From can be e.g. "PH Performance <on@resend.dev>"), in apps/api/.env then restart the API.',
    );
    return;
  }

  const rows = await db
    .select({
      requestId: teamSubscriptionRequestTable.id,
      planBillingCycle: teamSubscriptionRequestTable.planBillingCycle,
      paymentAmountCents: teamSubscriptionRequestTable.paymentAmountCents,
      paymentCurrency: teamSubscriptionRequestTable.paymentCurrency,
      stripeSessionId: teamSubscriptionRequestTable.stripeSessionId,
      receiptPublicId: teamSubscriptionRequestTable.receiptPublicId,
      teamId: teamTable.id,
      adminId: userTable.id,
      adminEmail: userTable.email,
      adminName: userTable.name,
      adminRole: userTable.role,
      teamName: teamTable.name,
      maxAthletes: teamTable.maxAthletes,
      planName: subscriptionPlanTable.name,
      planTier: subscriptionPlanTable.tier,
    })
    .from(teamSubscriptionRequestTable)
    .innerJoin(userTable, eq(teamSubscriptionRequestTable.adminId, userTable.id))
    .innerJoin(teamTable, eq(teamSubscriptionRequestTable.teamId, teamTable.id))
    .leftJoin(subscriptionPlanTable, eq(teamSubscriptionRequestTable.planId, subscriptionPlanTable.id))
    .where(eq(teamSubscriptionRequestTable.id, teamRequestId))
    .limit(1);

  const row = rows[0];
  if (!row?.adminEmail || !row.planName || !row.planTier) {
    logger.warn({ teamRequestId }, "[Billing] notifyTeamSubscriptionEnteredPendingApproval: missing data");
    return;
  }

  const adminBase = env.adminWebUrl.replace(/\/$/, "");
  const adminReviewUrl = `${adminBase}/billing/pending-approvals`;

  const amount = formatStripeAmount(row.paymentAmountCents ?? null, row.paymentCurrency ?? null);

  const cycleRaw = String(row.planBillingCycle ?? "")
    .trim()
    .toLowerCase();
  const cycleLabel =
    cycleRaw === "monthly"
      ? "Monthly subscription (per seat in checkout)"
      : cycleRaw === "six_months"
        ? "6 months (upfront)"
        : cycleRaw === "yearly"
          ? "Yearly (upfront)"
          : null;

  let receipt: ReturnType<typeof buildBillingReceiptEmailFromStripeSession> | null = null;
  const sid = String(row.stripeSessionId ?? "").trim();
  if (sid.startsWith("cs_") && row.receiptPublicId) {
    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sid, {
        expand: ["line_items.data.price"],
      });
      receipt = buildBillingReceiptEmailFromStripeSession(session, {
        receiptPublicId: row.receiptPublicId,
        internalRequestId: row.requestId,
        accountRole: row.adminRole,
        paidAt: new Date(session.created * 1000),
        billingCycleLabel: cycleLabel,
        teamBlock: `Team #${row.teamId} · ${row.teamName} · seats: ${row.maxAthletes ?? "—"}`,
        athleteBlock: null,
      });
    } catch (err) {
      logger.warn({ err, stripeSessionId: sid }, "[Billing] Could not load Stripe session for team receipt email");
    }
  }

  await sendSubscriptionPendingUserEmail({
    to: row.adminEmail,
    name: row.adminName || "there",
    planName: row.planName,
    planTier: row.planTier,
    amount,
    billingCycle: (row.planBillingCycle as any) ?? null,
    receipt,
  });

  const staff = await db
    .select({ email: userTable.email, name: userTable.name })
    .from(userTable)
    .where(
      and(
        eq(userTable.isDeleted, false),
        eq(userTable.isBlocked, false),
        inArray(userTable.role, ROLES_TRAINING_STAFF),
        ne(userTable.email, ""),
      ),
    );

  const seen = new Set<string>();
  for (const s of staff) {
    if (!s.email || seen.has(s.email)) continue;
    if (s.email === row.adminEmail) continue;
    seen.add(s.email);
    await sendSubscriptionPendingStaffEmail({
      to: s.email,
      recipientName: s.name,
      payerName: row.adminName || "Team admin",
      payerEmail: row.adminEmail,
      payerRole: row.adminRole,
      subscriptionContext: "team",
      team: { id: row.teamId, name: row.teamName, maxAthletes: row.maxAthletes },
      athlete: null,
      planName: row.planName,
      planTier: row.planTier,
      amount,
      billingCycle: (row.planBillingCycle as any) ?? null,
      paymentMode:
        String(row.planBillingCycle ?? "")
          .trim()
          .toLowerCase() === "monthly"
          ? "subscription"
          : "payment",
      requestId: row.requestId,
      adminReviewUrl,
      receipt,
    });
  }
}

export async function notifyTeamSubscriptionApproved(teamRequestId: number) {
  const rows = await db
    .select({
      adminEmail: userTable.email,
      adminName: userTable.name,
      planTier: subscriptionPlanTable.tier,
    })
    .from(teamSubscriptionRequestTable)
    .innerJoin(userTable, eq(teamSubscriptionRequestTable.adminId, userTable.id))
    .leftJoin(subscriptionPlanTable, eq(teamSubscriptionRequestTable.planId, subscriptionPlanTable.id))
    .where(eq(teamSubscriptionRequestTable.id, teamRequestId))
    .limit(1);
  const row = rows[0];
  if (!row?.adminEmail || !row.planTier) return;
  await sendSubscriptionApprovedUserEmail({
    to: row.adminEmail,
    name: row.adminName || "there",
    planTier: row.planTier,
  });
}
