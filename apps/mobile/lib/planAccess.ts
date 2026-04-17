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
  if (tier == null) return null;
  const trimmed = tier.trim();
  if (!trimmed) return null;
  if (PROGRAM_TIER_ORDER.includes(trimmed as ProgramTierName)) {
    return trimmed as ProgramTierName;
  }
  const key = trimmed.toLowerCase().replace(/\s+/g, " ");
  return NORMALIZED_TIER_MAP[key] ?? null;
}

export function programIdToTier(id: "php" | "plus" | "premium" | "pro"): ProgramTierName {
  if (id === "plus") return "PHP_Premium_Plus";
  if (id === "premium") return "PHP_Premium";
  if (id === "pro") return "PHP_Pro";
  return "PHP";
}

export function tierRank(tier?: string | null): number {
  if (tier == null || tier === "") return -1;
  const n = normalizeProgramTier(tier);
  if (!n) return -1;
  const idx = PROGRAM_TIER_ORDER.indexOf(n);
  return idx >= 0 ? idx : -1;
}

export function canAccessTier(userTier: string | null, requiredTier?: string | null): boolean {
  if (requiredTier == null || requiredTier === "") return true;
  const required = normalizeProgramTier(requiredTier);
  if (!required) return true;
  const user = normalizeProgramTier(userTier);
  if (!user) return false;
  return tierRank(user) >= tierRank(required);
}

/** Product “Premium” tier only (not Plus / Pro). */
export function isPremium(userTier?: string | null): boolean {
  return normalizeProgramTier(userTier ?? null) === "PHP_Premium";
}

/** Coach-approved paid plan: Premium tier or higher (Plus / Pro). */
export function hasPaidProgramTier(tier?: string | null): boolean {
  const n = normalizeProgramTier(tier ?? null);
  if (!n) return false;
  return tierRank(n) >= tierRank("PHP_Premium");
}

/** Any assigned ladder tier (PHP Program through PHP Pro). */
export function hasAssignedProgramTier(tier?: string | null): boolean {
  return normalizeProgramTier(tier ?? null) != null;
}

/** PHP Premium+ — nutrition, parent platform, expanded coach messaging treatment. */
export function hasPremiumPlanFeatures(tier?: string | null): boolean {
  return canAccessTier(tier ?? null, "PHP_Premium");
}

/** PHP Plus / Pro — semi-private booking type & session video upload for coach review. */
export function hasPhpPlusPlanFeatures(tier?: string | null): boolean {
  return canAccessTier(tier ?? null, "PHP_Premium_Plus");
}

/** PHP Pro — full tier (e.g. physio referrals in-app). */
export function hasPhpProPlanFeatures(tier?: string | null): boolean {
  return canAccessTier(tier ?? null, "PHP_Pro");
}

export type ProgramDetailRouteId = "php" | "plus" | "premium" | "pro";

/** Route segment for `/programs/[id]` from the user’s assigned program tier. */
export function programDetailRouteIdFromTier(tier?: string | null): ProgramDetailRouteId {
  const n = normalizeProgramTier(tier ?? null);
  if (n === "PHP_Premium") return "premium";
  if (n === "PHP_Premium_Plus") return "plus";
  if (n === "PHP_Pro") return "pro";
  return "php";
}
