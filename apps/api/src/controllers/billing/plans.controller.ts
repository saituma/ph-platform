import type { Request, Response } from "express";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";

import { ProgramType } from "../../db/schema";
import {
  athleteTable,
  guardianTable,
  subscriptionPlanTable,
  subscriptionRequestTable,
} from "../../db/schema";
import { getMessagingAccessTiers } from "../../services/messaging-policy.service";
import { db } from "../../db";
import { getAthleteForUser } from "../../services/user.service";
import {
  enrichPlansWithBillingQuotes,
  getLatestSubscriptionRequest,
  listSubscriptionPlans,
  updateSubscriptionRequestStatus,
} from "../../services/billing.service";
import { updateAthleteProgramTier } from "../../services/admin/user.service";
import { logger } from "../../lib/logger";
import { cache, cacheKeys } from "../../lib/cache";

const listPlansQuerySchema = z.object({
  billingCycle: z.enum(["monthly", "six_months", "yearly", "one_time"]).optional(),
});

const downgradeSchema = z.object({
  tier: z.enum(ProgramType.enumValues),
});

export async function listPlans(req: Request, res: Response) {
  const parsed = listPlansQuerySchema.safeParse(req.query);
  const billingCycle = parsed.success && parsed.data.billingCycle !== "one_time" ? parsed.data.billingCycle : undefined;

  // Cache the public plans list (no billingCycle enrichment variants are cached separately)
  if (!billingCycle) {
    const plans = await cache.getOrSet(cacheKeys.billingPlans(), 300, () =>
      listSubscriptionPlans({ includeInactive: true }),
    );
    return res.status(200).json({ plans });
  }

  // Enriched (quote-decorated) variant — not cached because quotes can change frequently
  let plans = await listSubscriptionPlans({ includeInactive: true });
  plans = await enrichPlansWithBillingQuotes(plans, billingCycle);
  return res.status(200).json({ plans });
}

export async function getBillingStatus(req: Request, res: Response) {
  const userId = req.user!.id;
  const isDebugUser = String(req.user?.email ?? "").trim().toLowerCase() === "dawitanother@gmail.com";

  const fetchStatus = async () => {
    const [messagingAccessTiers, athlete] = await Promise.all([
      getMessagingAccessTiers(),
      getAthleteForUser(userId),
    ]);
    if (!athlete) {
      return { athlete: null, currentProgramTier: null, latestRequest: null, messagingAccessTiers };
    }
    const guardianRows = athlete.guardianId
      ? await db
          .select({ userId: guardianTable.userId, currentProgramTier: guardianTable.currentProgramTier })
          .from(guardianTable)
          .where(eq(guardianTable.id, athlete.guardianId))
          .limit(1)
      : [];
    const guardian = guardianRows[0] ?? null;
    const requestUserId = guardian?.userId ?? userId;
    const latestRequest = await getLatestSubscriptionRequest({ userId: requestUserId, athleteId: athlete.id });
    const effectiveTier = guardian?.currentProgramTier ?? athlete.currentProgramTier ?? null;
    return { athlete, currentProgramTier: effectiveTier, latestRequest, messagingAccessTiers };
  };

  // Skip cache for the debug-instrumented user so logs always fire
  const result = isDebugUser
    ? await fetchStatus()
    : await cache.getOrSet(cacheKeys.billingStatus(userId), 120, fetchStatus);

  if (isDebugUser) {
    logger.info(
      {
        marker: "portal-debug",
        route: "GET /api/billing/status",
        reqUserId: req.user?.id,
        reqEmail: req.user?.email,
        athleteId: result.athlete?.id ?? null,
        athleteOnboardingCompleted: result.athlete?.onboardingCompleted ?? null,
        athletePlanId: (result.athlete as any)?.currentPlanId ?? (result.athlete as any)?.current_plan_id ?? null,
        athletePlanExpiresAt: result.athlete?.planExpiresAt ?? null,
        effectiveTier: result.currentProgramTier,
        latestRequestStatus: result.latestRequest?.status ?? null,
        latestRequestPaymentStatus: result.latestRequest?.paymentStatus ?? null,
        latestRequestPlanId: result.latestRequest?.planId ?? null,
        latestRequestCycle: result.latestRequest?.planBillingCycle ?? null,
      },
      "[portal-debug] billing status snapshot",
    );
  }

  return res.status(200).json(result);
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
  if (athlete.guardianId) {
    await db.update(guardianTable).set({ currentProgramTier: targetTier, updatedAt: new Date() }).where(eq(guardianTable.id, athlete.guardianId));
  }
  const latestRequest = await getLatestSubscriptionRequest({
    userId: req.user!.id,
    athleteId: athlete.id,
  });
  if (latestRequest && ["pending_payment", "pending_approval"].includes(latestRequest.status)) {
    await updateSubscriptionRequestStatus(latestRequest.requestId, "rejected");
  }
  void cache.del(cacheKeys.billingStatus(req.user!.id));

  return res.status(200).json({
    currentProgramTier: updated?.currentProgramTier ?? targetTier,
  });
}

export async function listInvoices(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const rows = await db
    .select({
      id: subscriptionRequestTable.id,
      receiptPublicId: subscriptionRequestTable.receiptPublicId,
      status: subscriptionRequestTable.status,
      paymentStatus: subscriptionRequestTable.paymentStatus,
      planBillingCycle: subscriptionRequestTable.planBillingCycle,
      paymentAmountCents: subscriptionRequestTable.paymentAmountCents,
      paymentCurrency: subscriptionRequestTable.paymentCurrency,
      createdAt: subscriptionRequestTable.createdAt,
      planName: subscriptionPlanTable.name,
      planTier: subscriptionPlanTable.tier,
    })
    .from(subscriptionRequestTable)
    .leftJoin(subscriptionPlanTable, eq(subscriptionRequestTable.planId, subscriptionPlanTable.id))
    .where(eq(subscriptionRequestTable.userId, req.user.id))
    .orderBy(desc(subscriptionRequestTable.createdAt))
    .limit(50);

  const invoices = rows.map((row) => ({
    id: row.id,
    receiptPublicId: row.receiptPublicId,
    status: row.status,
    paymentStatus: row.paymentStatus,
    billingCycle: row.planBillingCycle,
    amount: row.paymentAmountCents
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: (row.paymentCurrency ?? "USD").toUpperCase(),
        }).format(row.paymentAmountCents / 100)
      : null,
    date: row.createdAt.toISOString(),
    plan: row.planName ?? row.planTier ?? "Plan",
  }));

  return res.status(200).json({ invoices });
}
