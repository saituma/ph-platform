import { hasAssignedProgramTier } from "@/lib/planAccess";

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
  if (planFeatures && planFeatures.length > 0) {
    return planFeatures.includes("messaging") || planFeatures.includes("priority_messaging");
  }
  if (messagingAccessTiers && messagingAccessTiers.length > 0) {
    return messagingAccessTiers.some((t) => {
      const s = String(t).trim().toLowerCase();
      return s.length > 0 && s !== "none" && s !== "off";
    });
  }
  return hasAssignedProgramTier(programTier);
}
