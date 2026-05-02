import { and, eq, inArray, ne } from "drizzle-orm";

import { env } from "../config/env";
import { db } from "../db";
import { athleteTable, subscriptionPlanTable, subscriptionRequestTable, userTable } from "../db/schema";
import { pushQueue } from "../jobs";
import { quoteAthleteBillingCycleAmount } from "./billing/plan.service";
import { ATHLETE_BILLING_CYCLES, type AthleteBillingCycle } from "./billing/stripe.service";
import { buildBillingReceiptEmailFromStripeSession } from "../lib/mailer/billing-receipt-email";
import {
  isMailDeliveryConfigured,
  sendSubscriptionApprovedUserEmail,
  sendSubscriptionPendingStaffEmail,
  sendSubscriptionPendingUserEmail,
} from "../lib/mailer";
import { getStripeClient } from "./billing/stripe.service";
import { ROLES_TRAINING_STAFF } from "../lib/user-roles";

/**
 * When a subscription request first enters pending_approval after payment, notify the payer and staff.
 * Idempotent by transition check at call sites (only call when status actually changed).
 */
export async function notifySubscriptionEnteredPendingApproval(requestId: number) {
  if (!isMailDeliveryConfigured()) {
    console.warn(
      "[Mailer] Subscription emails skipped: outbound mail is not configured. Set RESEND_API_KEY, or SMTP_USER + SMTP_PASS + SMTP_FROM, in apps/api/.env then restart the API.",
    );
    return;
  }

  const rows = await db
    .select({
      userId: subscriptionRequestTable.userId,
      userEmail: userTable.email,
      userName: userTable.name,
      userRole: userTable.role,
      stripeSessionId: subscriptionRequestTable.stripeSessionId,
      receiptPublicId: subscriptionRequestTable.receiptPublicId,
      planBillingCycle: subscriptionRequestTable.planBillingCycle,
      planName: subscriptionPlanTable.name,
      planTier: subscriptionPlanTable.tier,
      planDisplayPrice: subscriptionPlanTable.displayPrice,
      planMonthlyPrice: subscriptionPlanTable.monthlyPrice,
      planYearlyPrice: subscriptionPlanTable.yearlyPrice,
      stripePriceId: subscriptionPlanTable.stripePriceId,
      stripePriceIdMonthly: subscriptionPlanTable.stripePriceIdMonthly,
      stripePriceIdYearly: subscriptionPlanTable.stripePriceIdYearly,
      athleteId: subscriptionRequestTable.athleteId,
      athleteName: athleteTable.name,
    })
    .from(subscriptionRequestTable)
    .innerJoin(userTable, eq(subscriptionRequestTable.userId, userTable.id))
    .leftJoin(subscriptionPlanTable, eq(subscriptionRequestTable.planId, subscriptionPlanTable.id))
    .leftJoin(athleteTable, eq(subscriptionRequestTable.athleteId, athleteTable.id))
    .where(eq(subscriptionRequestTable.id, requestId))
    .limit(1);

  const row = rows[0];
  if (!row?.userEmail || !row.planName || !row.planTier) {
    console.warn("[Billing] notifySubscriptionEnteredPendingApproval: missing data", requestId);
    return;
  }

  const adminBase = env.adminWebUrl.replace(/\/$/, "");
  const adminReviewUrl = `${adminBase}/billing/pending-approvals`;

  const cycleRaw = String(row.planBillingCycle ?? "")
    .trim()
    .toLowerCase();
  const billingCycle = ATHLETE_BILLING_CYCLES.includes(cycleRaw as AthleteBillingCycle)
    ? (cycleRaw as AthleteBillingCycle)
    : null;

  const quote =
    billingCycle && row.planTier
      ? await quoteAthleteBillingCycleAmount(
          {
            tier: row.planTier,
            stripePriceId: row.stripePriceId,
            stripePriceIdMonthly: row.stripePriceIdMonthly,
            stripePriceIdYearly: row.stripePriceIdYearly,
            displayPrice: row.planDisplayPrice,
            monthlyPrice: row.planMonthlyPrice,
            yearlyPrice: row.planYearlyPrice,
          },
          billingCycle,
        )
      : null;

  const cycleLabel =
    billingCycle === "monthly"
      ? "Monthly subscription"
      : billingCycle === "six_months"
        ? "6 months (upfront)"
        : billingCycle === "yearly"
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
        internalRequestId: requestId,
        accountRole: row.userRole,
        paidAt: new Date(session.created * 1000),
        billingCycleLabel: cycleLabel,
        teamBlock: null,
        athleteBlock: `${row.athleteName ?? "Athlete"} · athlete #${row.athleteId}`,
      });
    } catch (err) {
      console.warn("[Billing] Could not load Stripe session for receipt email", sid, err);
    }
  }

  await sendSubscriptionPendingUserEmail({
    to: row.userEmail,
    name: row.userName || "there",
    planName: row.planName,
    planTier: row.planTier,
    amount: quote?.amount ?? null,
    billingCycle: billingCycle,
    receipt,
  });

  void pushQueue.enqueue({
    userId: row.userId,
    title: "Subscription pending",
    body: `Your ${row.planName} subscription is being reviewed.`,
    data: { type: "payment", url: "/plans" },
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

  if (!staff.length) {
    console.warn(
      `[Billing] notifySubscriptionEnteredPendingApproval: no staff users found for request #${requestId}. ` +
        "Ensure at least one user with role admin/superAdmin/coach/team_coach/program_coach exists and is not deleted/blocked.",
    );
  }

  const seen = new Set<string>();
  for (const s of staff) {
    if (!s.email || seen.has(s.email)) continue;
    if (s.email === row.userEmail) continue;
    seen.add(s.email);
    try {
      await sendSubscriptionPendingStaffEmail({
        to: s.email,
        recipientName: s.name,
        payerName: row.userName || "Member",
        payerEmail: row.userEmail,
        payerRole: row.userRole,
        subscriptionContext: "athlete",
        team: null,
        athlete: row.athleteId != null ? { id: row.athleteId, name: row.athleteName } : null,
        planName: row.planName,
        planTier: row.planTier,
        amount: quote?.amount ?? null,
        billingCycle: billingCycle,
        paymentMode: quote?.mode ?? null,
        requestId,
        adminReviewUrl,
        receipt,
      });
      console.info(`[Billing] Staff notification sent to ${s.email} for request #${requestId}`);
    } catch (staffEmailErr) {
      console.error(`[Billing] Failed to send staff notification to ${s.email} for request #${requestId}:`, staffEmailErr);
    }
  }
}

export async function notifySubscriptionPlanApproved(userId: number, planTier: string) {
  const users = await db
    .select({ email: userTable.email, name: userTable.name })
    .from(userTable)
    .where(and(eq(userTable.id, userId), eq(userTable.isDeleted, false)))
    .limit(1);
  const u = users[0];
  if (!u?.email) return;
  await sendSubscriptionApprovedUserEmail({
    to: u.email,
    name: u.name || "there",
    planTier,
  });

  void pushQueue.enqueue({
    userId,
    title: "Plan approved",
    body: `Your ${planTier} plan has been approved! You now have full access.`,
    data: { type: "plan_approved", screen: "plans", url: "/plans" },
  });
}
