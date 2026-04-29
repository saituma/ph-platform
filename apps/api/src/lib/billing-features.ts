/**
 * Canonical feature catalog for plan gating.
 *
 * Plans store an array of stable keys (the literals in `FEATURE_KEY` below). The admin UI
 * shows the friendly label from `FEATURE_LABELS`. App gates check for keys, never labels.
 *
 * If a plan's `features` array is empty (legacy data), gates fall back to the tier-default
 * set in `TIER_DEFAULT_FEATURES` so behavior matches what the app did before plans had
 * per-feature toggles.
 *
 * To add a new gated capability:
 *   1. Add a key + label here
 *   2. Wire `userHasFeature(athleteId, "<key>")` into the gating endpoint/UI
 *   3. Add the key to `TIER_DEFAULT_FEATURES` for tiers that should grant it by default
 *   4. Append the key to the admin catalog (also kept in apps/web/lib/billing-features.ts)
 */

export const FEATURE_KEYS = [
  // Core
  "coach_module",
  "messaging",
  "schedule",
  "mobile_app",
  "progress_tracking",

  // Training
  "programs_full",
  "warmup_cooldown",
  "mobility_recovery",
  "in_season",
  "off_season",
  "movement_screening",
  "stretching_foam",
  "periodization",
  "competition_windows",
  "one_on_one_review",
  "bespoke_progression",

  // Coaching
  "video_upload",
  "priority_messaging",
  "faster_turnaround",
  "semi_private",
  "bookings",
  "physio_referrals",

  // Family & education
  "parent_platform",
  "parent_education",
  "nutrition_logging",
  "food_diaries",
  "submit_diary",

  // Community
  "social_feed",
  "run_tracking",
  "achievements",
  "referrals",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  coach_module: "Coach module access",
  messaging: "Messaging features",
  schedule: "Schedule & calendar",
  mobile_app: "Mobile app access",
  progress_tracking: "Progress tracking",
  programs_full: "Full programs library",
  warmup_cooldown: "Warm-up & cool-down library",
  mobility_recovery: "Mobility & recovery sessions",
  in_season: "In-season program",
  off_season: "Off-season program",
  movement_screening: "Movement screening",
  stretching_foam: "Stretching & foam rolling",
  periodization: "Advanced periodization",
  competition_windows: "Competition windows",
  one_on_one_review: "1:1 review blocks",
  bespoke_progression: "Bespoke progression",
  video_upload: "Video upload for coach response",
  priority_messaging: "Priority messaging",
  faster_turnaround: "Faster coach turnaround",
  semi_private: "Semi-private sessions (small group coaching)",
  bookings: "Bookings (1:1 calls)",
  physio_referrals: "Physio referrals",
  parent_platform: "Parent platform",
  parent_education: "Parent education",
  nutrition_logging: "Nutrition logging",
  food_diaries: "Nutrition & food diaries",
  submit_diary: "Submit food diary",
  social_feed: "Social feed",
  run_tracking: "Run tracking & sharing",
  achievements: "Achievements & streaks",
  referrals: "Referral rewards",
};

/**
 * Default feature set per program tier. Used when a plan row's `features` column is null/empty
 * so legacy plans behave like they always have. Each higher tier inherits the lower tier's set.
 */
const PHP_DEFAULTS: FeatureKey[] = ["coach_module", "messaging", "schedule", "mobile_app", "progress_tracking"];
const PHP_PREMIUM_DEFAULTS: FeatureKey[] = [
  ...PHP_DEFAULTS,
  "parent_platform",
  "nutrition_logging",
  "food_diaries",
  "parent_education",
  "submit_diary",
];
const PHP_PREMIUM_PLUS_DEFAULTS: FeatureKey[] = [
  ...PHP_PREMIUM_DEFAULTS,
  "video_upload",
  "semi_private",
  "bookings",
  "warmup_cooldown",
  "mobility_recovery",
];
const PHP_PRO_DEFAULTS: FeatureKey[] = [
  ...PHP_PREMIUM_PLUS_DEFAULTS,
  "physio_referrals",
  "programs_full",
  "priority_messaging",
  "faster_turnaround",
  "periodization",
  "competition_windows",
  "one_on_one_review",
  "bespoke_progression",
  "in_season",
  "off_season",
  "movement_screening",
  "stretching_foam",
  "social_feed",
  "run_tracking",
  "achievements",
  "referrals",
];

export const TIER_DEFAULT_FEATURES: Record<string, FeatureKey[]> = {
  PHP: PHP_DEFAULTS,
  PHP_Premium: PHP_PREMIUM_DEFAULTS,
  PHP_Premium_Plus: PHP_PREMIUM_PLUS_DEFAULTS,
  PHP_Pro: PHP_PRO_DEFAULTS,
};

/** True when `key` is a recognized stable feature id. */
export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === "string" && (FEATURE_KEYS as readonly string[]).includes(value);
}

/** Map free-text labels (legacy data, "Coach module access" etc.) onto stable keys. */
const LABEL_TO_KEY: Record<string, FeatureKey> = (() => {
  const map: Record<string, FeatureKey> = {};
  for (const key of FEATURE_KEYS) {
    map[FEATURE_LABELS[key].toLowerCase()] = key;
    map[key.toLowerCase()] = key;
  }
  return map;
})();

/**
 * Coerce an array of mixed key/label strings into a deduped set of canonical FeatureKeys.
 * Tolerant of legacy data where features were stored as labels rather than keys.
 */
export function normalizeFeatureKeys(items: ReadonlyArray<unknown> | null | undefined): Set<FeatureKey> {
  const out = new Set<FeatureKey>();
  if (!Array.isArray(items)) return out;
  for (const item of items) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim().toLowerCase();
    if (!trimmed) continue;
    const key = isFeatureKey(item)
      ? (item as FeatureKey)
      : (LABEL_TO_KEY[trimmed] ?? null);
    if (key) out.add(key);
  }
  return out;
}

/**
 * Resolve the effective set of feature keys for a plan.
 *
 * - If the plan has explicit features stored, those are authoritative.
 * - Otherwise fall back to `TIER_DEFAULT_FEATURES[tier]`.
 * - If neither is available, returns the lowest-tier default so the user gets baseline access.
 */
export function getEffectivePlanFeatures(plan: {
  features?: unknown;
  tier?: string | null;
}): Set<FeatureKey> {
  const explicit = normalizeFeatureKeys(plan.features as unknown[] | null | undefined);
  if (explicit.size > 0) return explicit;
  const tier = plan.tier ?? "PHP";
  return new Set(TIER_DEFAULT_FEATURES[tier] ?? TIER_DEFAULT_FEATURES.PHP);
}
