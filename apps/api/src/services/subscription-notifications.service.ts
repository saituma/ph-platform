import { and, eq, ne, or } from "drizzle-orm";

import { env } from "../config/env";
import { db } from "../db";
import { athleteTable, subscriptionPlanTable, subscriptionRequestTable, userTable } from "../db/schema";
import { sendPushNotification } from "./push.service";
import { quoteAthleteBillingCycleAmount } from "./billing/plan.service";
import { ATHLETE_BILLING_CYCLES, type AthleteBillingCycle } from "./billing/stripe.service";
import {
  sendSubscriptionApprovedUserEmail,
  sendSubscriptionPendingStaffEmail,
  sendSubscriptionPendingUserEmail,
} from "../lib/mailer";

/**
 * When a subscription request first enters pending_approval after payment, notify the payer and staff.
 * Idempotent by transition check at call sites (only call when status actually changed).
 */
export async function notifySubscriptionEnteredPendingApproval(requestId: number) {
  const rows = await db
    .select({
      userId: subscriptionRequestTable.userId,
      userEmail: userTable.email,
      userName: userTable.name,
      planBillingCycle: subscriptionRequestTable.planBillingCycle,
      planName: subscriptionPlanTable.name,
      planTier: subscriptionPlanTable.tier,
      planDisplayPrice: subscriptionPlanTable.displayPrice,
      planMonthlyPrice: subscriptionPlanTable.monthlyPrice,
      planYearlyPrice: subscriptionPlanTable.yearlyPrice,
      stripePriceId: subscriptionPlanTable.stripePriceId,
      stripePriceIdMonthly: subscriptionPlanTable.stripePriceIdMonthly,
      stripePriceIdYearly: subscriptionPlanTable.stripePriceIdYearly,
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

  const cycleRaw = String(row.planBillingCycle ?? "").trim().toLowerCase();
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
          billingCycle
        )
      : null;

  await sendSubscriptionPendingUserEmail({
    to: row.userEmail,
    name: row.userName || "there",
    planName: row.planName,
    planTier: row.planTier,
    amount: quote?.amount ?? null,
    billingCycle: billingCycle,
  });

  void sendPushNotification(
    row.userId,
    "Subscription pending",
    `Your ${row.planName} subscription is being reviewed.`,
    { type: "payment", url: "/plans" },
  );

  const staff = await db
    .select({ email: userTable.email, name: userTable.name })
    .from(userTable)
    .where(
      and(
        eq(userTable.isDeleted, false),
        eq(userTable.isBlocked, false),
        or(
          eq(userTable.role, "coach"),
          eq(userTable.role, "admin"),
          eq(userTable.role, "superAdmin")
        ),
        ne(userTable.email, "")
      )
    );

  const seen = new Set<string>();
  for (const s of staff) {
    if (!s.email || seen.has(s.email)) continue;
    seen.add(s.email);
    await sendSubscriptionPendingStaffEmail({
      to: s.email,
      payerName: row.userName || "Member",
      payerEmail: row.userEmail,
      athleteName: row.athleteName,
      planName: row.planName,
      planTier: row.planTier,
      amount: quote?.amount ?? null,
      billingCycle: billingCycle,
      paymentMode: quote?.mode ?? null,
      requestId,
      adminReviewUrl,
    });
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

  void sendPushNotification(
    userId,
    "Plan approved",
    `Your ${planTier} plan has been approved! You now have full access.`,
    { type: "plan_approved", screen: "plans", url: "/plans" },
  );
}
