import { eq } from "drizzle-orm";
import {
  getEffectivePlanFeatureSet,
  normalizeFeatureKeySet,
  type FeatureKey,
  TIER_DEFAULT_FEATURES,
} from "@ph/billing";
import { db } from "../../db";
import { athleteTable, guardianTable, subscriptionPlanTable } from "../../db/schema";

type AccessPlan = {
  features?: unknown;
  tier?: string | null;
} | null;

function mergeFeatureSets(...sets: ReadonlyArray<ReadonlySet<FeatureKey>>): Set<FeatureKey> {
  const merged = new Set<FeatureKey>();
  for (const set of sets) {
    for (const feature of set) merged.add(feature);
  }
  return merged;
}

async function getPlanForId(planId: number | null | undefined): Promise<AccessPlan> {
  if (!planId) return null;

  const [plan] = await db
    .select({ features: subscriptionPlanTable.features, tier: subscriptionPlanTable.tier })
    .from(subscriptionPlanTable)
    .where(eq(subscriptionPlanTable.id, planId))
    .limit(1);

  return plan ?? null;
}

function explicitFeaturesForPlan(plan: AccessPlan): Set<FeatureKey> {
  return normalizeFeatureKeySet(plan?.features as unknown[] | null | undefined);
}

export function resolveEffectiveAccessFeatures(input: {
  paidPlan?: AccessPlan;
  overrideTier?: string | null;
}): Set<FeatureKey> {
  if (input.overrideTier) {
    return mergeFeatureSets(featuresForTier(input.overrideTier), explicitFeaturesForPlan(input.paidPlan ?? null));
  }
  if (input.paidPlan) {
    return getEffectivePlanFeatureSet(input.paidPlan);
  }
  return new Set<FeatureKey>();
}

export async function getCurrentPlanFeaturesForUser(userId: number): Promise<Set<FeatureKey>> {
  // Try athlete first
  const [athlete] = await db
    .select({
      currentPlanId: athleteTable.currentPlanId,
      currentProgramTier: athleteTable.currentProgramTier,
    })
    .from(athleteTable)
    .where(eq(athleteTable.userId, userId))
    .limit(1);

  let planId = athlete?.currentPlanId ?? null;
  let overrideTier = athlete?.currentProgramTier ?? null;

  // Fall back to guardian
  if (!planId) {
    const [guardian] = await db
      .select({
        currentPlanId: guardianTable.currentPlanId,
        currentProgramTier: guardianTable.currentProgramTier,
      })
      .from(guardianTable)
      .where(eq(guardianTable.userId, userId))
      .limit(1);
    planId = guardian?.currentPlanId ?? null;
    overrideTier = overrideTier ?? guardian?.currentProgramTier ?? null;
  }

  return resolveEffectiveAccessFeatures({
    paidPlan: await getPlanForId(planId),
    overrideTier,
  });
}

export async function getFeaturesForAthlete(athleteId: number): Promise<Set<FeatureKey>> {
  const [athlete] = await db
    .select({
      userId: athleteTable.userId,
      guardianId: athleteTable.guardianId,
      currentPlanId: athleteTable.currentPlanId,
      currentProgramTier: athleteTable.currentProgramTier,
    })
    .from(athleteTable)
    .where(eq(athleteTable.id, athleteId))
    .limit(1);

  if (!athlete) return new Set<FeatureKey>();

  let planId = athlete.currentPlanId;
  let overrideTier = athlete.currentProgramTier;

  if (!planId && !overrideTier) {
    const [guardian] = await db
      .select({
        currentPlanId: guardianTable.currentPlanId,
        currentProgramTier: guardianTable.currentProgramTier,
      })
      .from(guardianTable)
      .where(
        athlete.guardianId ? eq(guardianTable.id, athlete.guardianId) : eq(guardianTable.userId, athlete.userId),
      )
      .limit(1);
    planId = guardian?.currentPlanId ?? null;
    overrideTier = guardian?.currentProgramTier ?? null;
  }

  return resolveEffectiveAccessFeatures({
    paidPlan: await getPlanForId(planId),
    overrideTier,
  });
}

export async function athleteHasFeature(athleteId: number, key: FeatureKey): Promise<boolean> {
  return (await getFeaturesForAthlete(athleteId)).has(key);
}

/** Resolve features by program tier (no DB lookup). Useful when you already have a tier in hand. */
export function featuresForTier(tier: string | null | undefined): Set<FeatureKey> {
  if (!tier) return new Set<FeatureKey>();
  return new Set(TIER_DEFAULT_FEATURES[tier] ?? []);
}
