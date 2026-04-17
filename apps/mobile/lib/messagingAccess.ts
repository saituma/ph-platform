import { hasAssignedProgramTier } from "@/lib/planAccess";

/**
 * Whether the user may use coach messaging (tab + socket acting).
 * Explicit API allow/deny lists override tier checks. Otherwise PHP Program (any assigned tier) includes messaging.
 */
export function canUseCoachMessaging(
  programTier: string | null | undefined,
  messagingAccessTiers: readonly string[] | null | undefined,
): boolean {
  if (messagingAccessTiers && messagingAccessTiers.length > 0) {
    return messagingAccessTiers.some((t) => {
      const s = String(t).trim().toLowerCase();
      return s.length > 0 && s !== "none" && s !== "off";
    });
  }
  return hasAssignedProgramTier(programTier);
}
