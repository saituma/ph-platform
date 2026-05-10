export const FEATURE_KEYS = [
  "coach_module",
  "messaging",
  "schedule",
  "mobile_app",
  "progress_tracking",
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
  "video_upload",
  "priority_messaging",
  "faster_turnaround",
  "semi_private",
  "bookings",
  "physio_referrals",
  "parent_platform",
  "parent_education",
  "nutrition_logging",
  "food_diaries",
  "submit_diary",
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

export const FEATURE_GROUPS: Array<{ group: string; keys: FeatureKey[] }> = [
  { group: "Core", keys: ["coach_module", "messaging", "schedule", "mobile_app", "progress_tracking"] },
  {
    group: "Training",
    keys: [
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
    ],
  },
  {
    group: "Coaching",
    keys: [
      "video_upload",
      "priority_messaging",
      "faster_turnaround",
      "semi_private",
      "bookings",
      "physio_referrals",
    ],
  },
  {
    group: "Family & education",
    keys: ["parent_platform", "parent_education", "nutrition_logging", "food_diaries", "submit_diary"],
  },
  {
    group: "Community",
    keys: ["social_feed", "run_tracking", "achievements", "referrals"],
  },
];

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

export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === "string" && (FEATURE_KEYS as readonly string[]).includes(value);
}

const LABEL_TO_KEY: Record<string, FeatureKey> = (() => {
  const map: Record<string, FeatureKey> = {};
  for (const key of FEATURE_KEYS) {
    map[FEATURE_LABELS[key].toLowerCase()] = key;
    map[key.toLowerCase()] = key;
  }
  return map;
})();

export function normalizeFeatureKeyArray(items: ReadonlyArray<unknown> | null | undefined): FeatureKey[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<FeatureKey>();
  for (const item of items) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim().toLowerCase();
    if (!trimmed) continue;
    const key = isFeatureKey(item) ? item : LABEL_TO_KEY[trimmed];
    if (key) seen.add(key);
  }
  return Array.from(seen);
}

export function normalizeFeatureKeySet(items: ReadonlyArray<unknown> | null | undefined): Set<FeatureKey> {
  return new Set(normalizeFeatureKeyArray(items));
}

export function getEffectivePlanFeatureSet(plan: {
  features?: unknown;
  tier?: string | null;
}): Set<FeatureKey> {
  const explicit = normalizeFeatureKeySet(plan.features as unknown[] | null | undefined);
  if (explicit.size > 0) {
    const tier = plan.tier ?? "PHP";
    const base = TIER_DEFAULT_FEATURES[tier] ?? TIER_DEFAULT_FEATURES.PHP;
    for (const feature of base) explicit.add(feature);
    return explicit;
  }
  const tier = plan.tier ?? "PHP";
  return new Set(TIER_DEFAULT_FEATURES[tier] ?? TIER_DEFAULT_FEATURES.PHP);
}

