export const PROGRAM_TIER_ORDER = ["PHP", "PHP_Plus", "PHP_Premium"] as const;

export type ProgramTierName = (typeof PROGRAM_TIER_ORDER)[number];

const NORMALIZED_TIER_MAP: Record<string, ProgramTierName> = {
  php: "PHP",
  "php program": "PHP",
  plus: "PHP_Plus",
  "php_plus": "PHP_Plus",
  "php plus": "PHP_Plus",
  premium: "PHP_Premium",
  "php_premium": "PHP_Premium",
  "php premium": "PHP_Premium",
};

export function normalizeProgramTier(tier?: string | null): ProgramTierName | null {
  if (!tier) return null;
  if (PROGRAM_TIER_ORDER.includes(tier as ProgramTierName)) {
    return tier as ProgramTierName;
  }
  const key = tier.trim().toLowerCase().replace(/\s+/g, " ");
  return NORMALIZED_TIER_MAP[key] ?? null;
}

export function programIdToTier(id: "php" | "plus" | "premium"): ProgramTierName {
  if (id === "plus") return "PHP_Plus";
  if (id === "premium") return "PHP_Premium";
  return "PHP";
}

export function tierRank(tier?: string | null): number {
  const normalized = normalizeProgramTier(tier);
  if (!normalized) return -1;
  return PROGRAM_TIER_ORDER.indexOf(normalized);
}

export function canAccessTier(userTier: string | null, requiredTier?: string | null): boolean {
  if (!requiredTier) return true;
  return tierRank(userTier) >= tierRank(requiredTier);
}

export function isPremium(userTier?: string | null): boolean {
  return normalizeProgramTier(userTier) === "PHP_Premium";
}

/** Any coach-approved paid plan (PHP / Plus / Premium). Until then the user is on the free path. */
export function hasPaidProgramTier(tier?: string | null): boolean {
  return normalizeProgramTier(tier ?? null) !== null;
}
