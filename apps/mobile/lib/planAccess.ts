export const PROGRAM_TIER_ORDER = ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"] as const;

export type ProgramTierName = (typeof PROGRAM_TIER_ORDER)[number];

const NORMALIZED_TIER_MAP: Record<string, ProgramTierName> = {
  php: "PHP",
  "php program": "PHP",
  plus: "PHP_Premium_Plus",
  "php_plus": "PHP_Premium_Plus",
  "php plus": "PHP_Premium_Plus",
  "premium plus": "PHP_Premium_Plus",
  "php premium plus": "PHP_Premium_Plus",
  premium: "PHP_Premium",
  "php_premium": "PHP_Premium",
  "php premium": "PHP_Premium",
  pro: "PHP_Pro",
  "php_pro": "PHP_Pro",
  "php pro": "PHP_Pro",
};

export function normalizeProgramTier(tier?: string | null): ProgramTierName | null {
  if (!tier) return "PHP";
  if (PROGRAM_TIER_ORDER.includes(tier as ProgramTierName)) {
    return tier as ProgramTierName;
  }
  const key = tier.trim().toLowerCase().replace(/\s+/g, " ");
  return NORMALIZED_TIER_MAP[key] ?? "PHP";
}

export function programIdToTier(id: "php" | "plus" | "premium" | "pro"): ProgramTierName {
  if (id === "plus") return "PHP_Premium_Plus";
  if (id === "premium") return "PHP_Premium";
  if (id === "pro") return "PHP_Pro";
  return "PHP";
}

export function tierRank(tier?: string | null): number {
  return 0; // Everything is same rank
}

export function canAccessTier(userTier: string | null, requiredTier?: string | null): boolean {
  return true; // Always true
}

export function isPremium(userTier?: string | null): boolean {
  return true; // Everything is premium now
}

/** Any coach-approved paid plan (PHP / Plus / Premium). Until then the user is on the free path. */
export function hasPaidProgramTier(tier?: string | null): boolean {
  return true; // Always true
}
