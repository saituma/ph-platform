import { and, desc, eq } from "drizzle-orm";
import {
  getEffectivePlanFeatureSet,
  normalizeFeatureKeySet,
  type FeatureKey,
  TIER_DEFAULT_FEATURES,
} from "@ph/billing";
import { db } from "../../db";
import {
  athleteTable,
  guardianTable,
  subscriptionPlanTable,
  teamSubscriptionRequestTable,
  teamTable,
} from "../../db/schema";
import { findManagedTeamIdForUser } from "../team-membership";

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

/** The team's effective tier when every athlete shares one — mirrors resolveTeamPlanTier in
 * auth.controller so API feature-gating agrees with the manager's UI capabilities. */
async function uniformAthleteTierForTeam(teamId: number): Promise<string | null> {
  const rows = await db
    .select({ tier: athleteTable.currentProgramTier })
    .from(athleteTable)
    .where(eq(athleteTable.teamId, teamId));
  const tiers = Array.from(new Set(rows.map((row) => row.tier).filter(Boolean)));
  return tiers.length === 1 ? (tiers[0] as string) : null;
}

export async function getFeaturesForTeam(teamId: number): Promise<Set<FeatureKey>> {
  const [team] = await db
    .select({ id: teamTable.id, planId: teamTable.planId, accessTierOverride: teamTable.accessTierOverride })
    .from(teamTable)
    .where(eq(teamTable.id, teamId))
    .limit(1);

  if (!team) return new Set<FeatureKey>();

  const [approvedRequest] = await db
    .select({
      planId: teamSubscriptionRequestTable.planId,
      accessTierOverride: teamSubscriptionRequestTable.accessTierOverride,
    })
    .from(teamSubscriptionRequestTable)
    .where(and(eq(teamSubscriptionRequestTable.teamId, team.id), eq(teamSubscriptionRequestTable.status, "approved")))
    .orderBy(desc(teamSubscriptionRequestTable.updatedAt), desc(teamSubscriptionRequestTable.id))
    .limit(1);

  // Override precedence (must match resolveTeamPlanTier): durable team override →
  // approved-request override → uniform athlete tier. Then fall back to the team plan.
  const overrideTier =
    team.accessTierOverride ?? approvedRequest?.accessTierOverride ?? (await uniformAthleteTierForTeam(team.id));
  if (overrideTier) {
    return resolveEffectiveAccessFeatures({
      paidPlan: await getPlanForId(team.planId ?? approvedRequest?.planId),
      overrideTier,
    });
  }

  if (team.planId) {
    return resolveEffectiveAccessFeatures({
      paidPlan: await getPlanForId(team.planId),
    });
  }

  if (!approvedRequest) return new Set<FeatureKey>();

  return resolveEffectiveAccessFeatures({
    paidPlan: await getPlanForId(approvedRequest.planId),
  });
}

export async function getCurrentPlanFeaturesForManagedTeam(userId: number): Promise<Set<FeatureKey>> {
  const teamId = await findManagedTeamIdForUser(userId);
  if (teamId == null) return new Set<FeatureKey>();
  return getFeaturesForTeam(teamId);
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
