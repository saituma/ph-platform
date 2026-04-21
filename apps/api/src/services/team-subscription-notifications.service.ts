import { and, eq, ne, or } from "drizzle-orm";

import { env } from "../config/env";
import { db } from "../db";
import {
  subscriptionPlanTable,
  teamSubscriptionRequestTable,
  teamTable,
  userTable,
} from "../db/schema";
import { sendSubscriptionApprovedUserEmail, sendSubscriptionPendingStaffEmail, sendSubscriptionPendingUserEmail } from "../lib/mailer";

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
  const rows = await db
    .select({
      requestId: teamSubscriptionRequestTable.id,
      planBillingCycle: teamSubscriptionRequestTable.planBillingCycle,
      paymentAmountCents: teamSubscriptionRequestTable.paymentAmountCents,
      paymentCurrency: teamSubscriptionRequestTable.paymentCurrency,
      adminId: userTable.id,
      adminEmail: userTable.email,
      adminName: userTable.name,
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
    console.warn("[Billing] notifyTeamSubscriptionEnteredPendingApproval: missing data", teamRequestId);
    return;
  }

  const adminBase = env.adminWebUrl.replace(/\/$/, "");
  const adminReviewUrl = `${adminBase}/billing/pending-approvals`;

  const amount = formatStripeAmount(row.paymentAmountCents ?? null, row.paymentCurrency ?? null);

  await sendSubscriptionPendingUserEmail({
    to: row.adminEmail,
    name: row.adminName || "there",
    planName: row.planName,
    planTier: row.planTier,
    amount,
    billingCycle: (row.planBillingCycle as any) ?? null,
  });

  const staff = await db
    .select({ email: userTable.email, name: userTable.name })
    .from(userTable)
    .where(
      and(
        eq(userTable.isDeleted, false),
        eq(userTable.isBlocked, false),
        or(eq(userTable.role, "coach"), eq(userTable.role, "admin"), eq(userTable.role, "superAdmin")),
        ne(userTable.email, "")
      )
    );

  const seen = new Set<string>();
  for (const s of staff) {
    if (!s.email || seen.has(s.email)) continue;
    seen.add(s.email);
    await sendSubscriptionPendingStaffEmail({
      to: s.email,
      payerName: row.adminName || "Team admin",
      payerEmail: row.adminEmail,
      athleteName: `Team: ${row.teamName} (${row.maxAthletes} athletes)`,
      planName: row.planName,
      planTier: row.planTier,
      amount,
      billingCycle: (row.planBillingCycle as any) ?? null,
      paymentMode: String(row.planBillingCycle ?? "").trim().toLowerCase() === "monthly" ? "subscription" : "payment",
      requestId: row.requestId,
      adminReviewUrl,
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

