/**
 * Whether the user may use coach messaging (tab + socket acting).
 * When the API does not send access metadata, default to allowing messaging for signed-in users.
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
  if (programTier != null && String(programTier).trim() !== "") {
    return true;
  }
  return true;
}
