import { and, desc, eq } from "drizzle-orm";

import { db } from "../../db";
import { athleteTable, guardianTable, subscriptionPlanTable } from "../../db/schema";
import {
  FeatureKey,
  TIER_DEFAULT_FEATURES,
  getEffectivePlanFeatures,
} from "../../lib/billing-features";

/**
 * Resolve the effective feature set for an athlete:
 *   1. Find the athlete's current tier (or guardian's tier if the athlete is a managed child).
 *   2. Pick the most-recently-updated active plan that matches that tier — that's the plan they paid for.
 *   3. If a plan is found, use `plan.features`; otherwise fall back to `TIER_DEFAULT_FEATURES[tier]`.
 *
 * Returns a `Set<FeatureKey>` so callers can do `set.has("video_upload")` cheaply.
 */
export async function getFeaturesForAthlete(athleteId: number): Promise<Set<FeatureKey>> {
  const athleteRows = await db
    .select({
      currentProgramTier: athleteTable.currentProgramTier,
      currentPlanId: athleteTable.currentPlanId,
      guardianId: athleteTable.guardianId,
    })
    .from(athleteTable)
    .where(eq(athleteTable.id, athleteId))
    .limit(1);

  let tier = athleteRows[0]?.currentProgramTier ?? null;
  let planId = athleteRows[0]?.currentPlanId ?? null;
  const guardianId = athleteRows[0]?.guardianId ?? null;

  if (!planId && !tier && guardianId) {
    const g = await db
      .select({
        currentProgramTier: guardianTable.currentProgramTier,
        currentPlanId: guardianTable.currentPlanId,
      })
      .from(guardianTable)
      .where(eq(guardianTable.id, guardianId))
      .limit(1);
    tier = g[0]?.currentProgramTier ?? null;
    planId = g[0]?.currentPlanId ?? null;
  }

  // Prefer the explicit plan the athlete paid for. This is the only path that
  // works for tier-less plans (e.g. duration-based one-time programmes).
  if (planId) {
    const planRows = await db
      .select()
      .from(subscriptionPlanTable)
      .where(eq(subscriptionPlanTable.id, planId))
      .limit(1);
    const plan = planRows[0] ?? null;
    if (plan && plan.isActive) {
      return getEffectivePlanFeatures({ features: plan.features, tier: plan.tier });
    }
  }

  if (!tier) return new Set<FeatureKey>();

  const planRows = await db
    .select()
    .from(subscriptionPlanTable)
    .where(and(eq(subscriptionPlanTable.tier, tier), eq(subscriptionPlanTable.isActive, true)))
    .orderBy(desc(subscriptionPlanTable.updatedAt))
    .limit(1);
  const plan = planRows[0] ?? null;

  if (plan) {
    return getEffectivePlanFeatures({ features: plan.features, tier: plan.tier });
  }
  return new Set(TIER_DEFAULT_FEATURES[tier] ?? []);
}

/** Convenience: true when the athlete has the given feature on their current plan. */
export async function athleteHasFeature(athleteId: number, key: FeatureKey): Promise<boolean> {
  const set = await getFeaturesForAthlete(athleteId);
  return set.has(key);
}

/** Resolve features by program tier (no DB lookup). Useful when you already have a tier in hand. */
export function featuresForTier(tier: string | null | undefined): Set<FeatureKey> {
  if (!tier) return new Set<FeatureKey>();
  return new Set(TIER_DEFAULT_FEATURES[tier] ?? []);
}
