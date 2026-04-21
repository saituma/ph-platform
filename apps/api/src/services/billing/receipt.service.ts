import { eq } from "drizzle-orm";

import { db } from "../../db";
import {
  athleteTable,
  subscriptionPlanTable,
  subscriptionRequestTable,
  teamSubscriptionRequestTable,
  teamTable,
  userTable,
} from "../../db/schema";
import { summarizeStripeCheckoutSession } from "../../lib/stripe-checkout-receipt";
import { getStripeClient } from "./stripe.service";

const staffRoles = ["coach", "admin", "superAdmin"] as const;

export type PaymentReceiptDetail =
  | {
      kind: "team";
      receiptPublicId: string;
      internalRequestId: number;
      status: string;
      paymentStatus: string | null;
      planBillingCycle: string | null;
      stripeSessionId: string | null;
      stripePaymentIntentId: string | null;
      stripeSubscriptionId: string | null;
      paymentAmountCents: number | null;
      paymentCurrency: string | null;
      createdAt: Date;
      updatedAt: Date;
      payer: { userId: number; email: string; name: string | null; role: string };
      team: { id: number; name: string; maxAthletes: number | null };
      plan: { id: number; name: string; tier: string } | null;
    }
  | {
      kind: "athlete";
      receiptPublicId: string;
      internalRequestId: number;
      status: string;
      paymentStatus: string | null;
      planBillingCycle: string | null;
      stripeSessionId: string | null;
      stripePaymentIntentId: string | null;
      paymentAmountCents: number | null;
      paymentCurrency: string | null;
      createdAt: Date;
      updatedAt: Date;
      payer: { userId: number; email: string; name: string | null; role: string };
      athlete: { id: number; name: string | null };
      plan: { id: number; name: string; tier: string } | null;
    };

export async function getPaymentReceiptForViewer(input: {
  receiptPublicId: string;
  viewerUserId: number;
  viewerRole: string;
}): Promise<{ forbidden: true } | PaymentReceiptDetail | null> {
  const rid = String(input.receiptPublicId ?? "").trim();
  if (!rid) return null;
  const isStaff = (staffRoles as readonly string[]).includes(input.viewerRole);

  const team = await db
    .select({
      internalId: teamSubscriptionRequestTable.id,
      status: teamSubscriptionRequestTable.status,
      paymentStatus: teamSubscriptionRequestTable.paymentStatus,
      planBillingCycle: teamSubscriptionRequestTable.planBillingCycle,
      stripeSessionId: teamSubscriptionRequestTable.stripeSessionId,
      stripePaymentIntentId: teamSubscriptionRequestTable.stripePaymentIntentId,
      stripeSubscriptionId: teamSubscriptionRequestTable.stripeSubscriptionId,
      paymentAmountCents: teamSubscriptionRequestTable.paymentAmountCents,
      paymentCurrency: teamSubscriptionRequestTable.paymentCurrency,
      createdAt: teamSubscriptionRequestTable.createdAt,
      updatedAt: teamSubscriptionRequestTable.updatedAt,
      adminId: teamSubscriptionRequestTable.adminId,
      teamId: teamSubscriptionRequestTable.teamId,
      teamName: teamTable.name,
      maxAthletes: teamTable.maxAthletes,
      planId: subscriptionPlanTable.id,
      planName: subscriptionPlanTable.name,
      planTier: subscriptionPlanTable.tier,
      payerEmail: userTable.email,
      payerName: userTable.name,
      payerRole: userTable.role,
      receiptPublicId: teamSubscriptionRequestTable.receiptPublicId,
    })
    .from(teamSubscriptionRequestTable)
    .innerJoin(userTable, eq(teamSubscriptionRequestTable.adminId, userTable.id))
    .innerJoin(teamTable, eq(teamSubscriptionRequestTable.teamId, teamTable.id))
    .leftJoin(subscriptionPlanTable, eq(teamSubscriptionRequestTable.planId, subscriptionPlanTable.id))
    .where(eq(teamSubscriptionRequestTable.receiptPublicId, rid))
    .limit(1);

  const t = team[0];
  if (t) {
    if (!isStaff && t.adminId !== input.viewerUserId) {
      return { forbidden: true };
    }
    return {
      kind: "team",
      receiptPublicId: t.receiptPublicId,
      internalRequestId: t.internalId,
      status: t.status,
      paymentStatus: t.paymentStatus,
      planBillingCycle: t.planBillingCycle,
      stripeSessionId: t.stripeSessionId,
      stripePaymentIntentId: t.stripePaymentIntentId,
      stripeSubscriptionId: t.stripeSubscriptionId,
      paymentAmountCents: t.paymentAmountCents,
      paymentCurrency: t.paymentCurrency,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      payer: {
        userId: t.adminId,
        email: t.payerEmail,
        name: t.payerName,
        role: t.payerRole,
      },
      team: { id: t.teamId, name: t.teamName, maxAthletes: t.maxAthletes },
      plan: t.planId ? { id: t.planId, name: t.planName ?? "", tier: t.planTier ?? "" } : null,
    };
  }

  const athlete = await db
    .select({
      internalId: subscriptionRequestTable.id,
      status: subscriptionRequestTable.status,
      paymentStatus: subscriptionRequestTable.paymentStatus,
      planBillingCycle: subscriptionRequestTable.planBillingCycle,
      stripeSessionId: subscriptionRequestTable.stripeSessionId,
      stripePaymentIntentId: subscriptionRequestTable.stripePaymentIntentId,
      paymentAmountCents: subscriptionRequestTable.paymentAmountCents,
      paymentCurrency: subscriptionRequestTable.paymentCurrency,
      createdAt: subscriptionRequestTable.createdAt,
      updatedAt: subscriptionRequestTable.updatedAt,
      userId: subscriptionRequestTable.userId,
      athleteId: subscriptionRequestTable.athleteId,
      athleteName: athleteTable.name,
      planId: subscriptionPlanTable.id,
      planName: subscriptionPlanTable.name,
      planTier: subscriptionPlanTable.tier,
      payerEmail: userTable.email,
      payerName: userTable.name,
      payerRole: userTable.role,
      receiptPublicId: subscriptionRequestTable.receiptPublicId,
    })
    .from(subscriptionRequestTable)
    .innerJoin(userTable, eq(subscriptionRequestTable.userId, userTable.id))
    .leftJoin(athleteTable, eq(subscriptionRequestTable.athleteId, athleteTable.id))
    .leftJoin(subscriptionPlanTable, eq(subscriptionRequestTable.planId, subscriptionPlanTable.id))
    .where(eq(subscriptionRequestTable.receiptPublicId, rid))
    .limit(1);

  const a = athlete[0];
  if (!a) return null;

  if (!isStaff && a.userId !== input.viewerUserId) {
    return { forbidden: true };
  }

  return {
    kind: "athlete",
    receiptPublicId: a.receiptPublicId,
    internalRequestId: a.internalId,
    status: a.status,
    paymentStatus: a.paymentStatus,
    planBillingCycle: a.planBillingCycle,
    stripeSessionId: a.stripeSessionId,
    stripePaymentIntentId: a.stripePaymentIntentId,
    paymentAmountCents: a.paymentAmountCents,
    paymentCurrency: a.paymentCurrency,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    payer: {
      userId: a.userId,
      email: a.payerEmail,
      name: a.payerName,
      role: a.payerRole,
    },
    athlete: { id: a.athleteId, name: a.athleteName },
    plan: a.planId ? { id: a.planId, name: a.planName ?? "", tier: a.planTier ?? "" } : null,
  };
}

export async function enrichReceiptWithStripeSession(receipt: {
  stripeSessionId: string | null;
  paymentAmountCents: number | null;
  paymentCurrency: string | null;
}) {
  const sid = String(receipt.stripeSessionId ?? "").trim();
  if (!sid || !sid.startsWith("cs_")) {
    return { stripeSummary: null as ReturnType<typeof summarizeStripeCheckoutSession> | null };
  }
  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sid, {
      expand: ["line_items.data.price"],
    });
    return { stripeSummary: summarizeStripeCheckoutSession(session) };
  } catch {
    return { stripeSummary: null };
  }
}
