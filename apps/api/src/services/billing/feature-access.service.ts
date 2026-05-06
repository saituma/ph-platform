import { FEATURE_KEYS, FeatureKey, TIER_DEFAULT_FEATURES } from "../../lib/billing-features";

/**
 * Product policy:
 * - Plan-level feature lists no longer gate athlete access.
 * - Age/type/role capability logic is handled separately.
 */
export async function getFeaturesForAthlete(_athleteId: number): Promise<Set<FeatureKey>> {
  return new Set(FEATURE_KEYS);
}

/** Convenience: true when the athlete has the given feature. */
export async function athleteHasFeature(athleteId: number, key: FeatureKey): Promise<boolean> {
  const set = await getFeaturesForAthlete(athleteId);
  return set.has(key);
}

/** Resolve features by program tier (no DB lookup). Useful when you already have a tier in hand. */
export function featuresForTier(tier: string | null | undefined): Set<FeatureKey> {
  if (!tier) return new Set<FeatureKey>();
  return new Set(TIER_DEFAULT_FEATURES[tier] ?? []);
}
