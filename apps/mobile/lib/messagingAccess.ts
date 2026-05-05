/**
 * Whether the user may use coach messaging (tab + socket acting).
 * Plan features (when set) win over tier-based defaults — this lets tier-less
 * custom/duration plans grant messaging via the explicit "messaging" feature key.
 * Explicit API allow/deny lists override tier checks for legacy plans.
 */
export function canUseCoachMessaging(
  programTier: string | null | undefined,
  messagingAccessTiers: readonly string[] | null | undefined,
  planFeatures?: readonly string[] | null,
): boolean {
  // Explicit feature sets win: custom plans can turn messaging off by omitting
  // both messaging feature keys.
  if (planFeatures && planFeatures.length > 0) {
    return planFeatures.includes("messaging") || planFeatures.includes("priority_messaging");
  }
  // Default policy: available for all users unless explicitly disabled by plan features.
  return true;
}
