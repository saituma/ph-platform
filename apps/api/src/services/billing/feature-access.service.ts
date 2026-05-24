import { eq } from "drizzle-orm";
import { getEffectivePlanFeatureSet, type FeatureKey, TIER_DEFAULT_FEATURES } from "@ph/billing";
import { db } from "../../db";
import { athleteTable, guardianTable, subscriptionPlanTable } from "../../db/schema";

export async function getCurrentPlanFeaturesForUser(userId: number): Promise<Set<FeatureKey>> {
  // Try athlete first
  const [athlete] = await db
    .select({ currentPlanId: athleteTable.currentPlanId })
    .from(athleteTable)
    .where(eq(athleteTable.userId, userId))
    .limit(1);

  let planId = athlete?.currentPlanId ?? null;

  // Fall back to guardian
  if (!planId) {
    const [guardian] = await db
      .select({ currentPlanId: guardianTable.currentPlanId })
      .from(guardianTable)
      .where(eq(guardianTable.userId, userId))
      .limit(1);
    planId = guardian?.currentPlanId ?? null;
  }

  if (!planId) return new Set<FeatureKey>();

  const [plan] = await db
    .select({ features: subscriptionPlanTable.features, tier: subscriptionPlanTable.tier })
    .from(subscriptionPlanTable)
    .where(eq(subscriptionPlanTable.id, planId))
    .limit(1);

  if (!plan) return new Set<FeatureKey>();
  return getEffectivePlanFeatureSet(plan);
}

export async function getFeaturesForAthlete(athleteId: number): Promise<Set<FeatureKey>> {
  const [athlete] = await db
    .select({ userId: athleteTable.userId, currentPlanId: athleteTable.currentPlanId })
    .from(athleteTable)
    .where(eq(athleteTable.id, athleteId))
    .limit(1);

  if (!athlete) return new Set<FeatureKey>();

  let planId = athlete.currentPlanId;
  if (!planId) {
    const [guardian] = await db
      .select({ currentPlanId: guardianTable.currentPlanId })
      .from(guardianTable)
      .where(eq(guardianTable.userId, athlete.userId))
      .limit(1);
    planId = guardian?.currentPlanId ?? null;
  }

  if (!planId) return new Set<FeatureKey>();

  const [plan] = await db
    .select({ features: subscriptionPlanTable.features, tier: subscriptionPlanTable.tier })
    .from(subscriptionPlanTable)
    .where(eq(subscriptionPlanTable.id, planId))
    .limit(1);

  if (!plan) return new Set<FeatureKey>();
  return getEffectivePlanFeatureSet(plan);
}

export async function athleteHasFeature(athleteId: number, key: FeatureKey): Promise<boolean> {
  return (await getFeaturesForAthlete(athleteId)).has(key);
}

/** Resolve features by program tier (no DB lookup). Useful when you already have a tier in hand. */
export function featuresForTier(tier: string | null | undefined): Set<FeatureKey> {
  if (!tier) return new Set<FeatureKey>();
  return new Set(TIER_DEFAULT_FEATURES[tier] ?? []);
}
