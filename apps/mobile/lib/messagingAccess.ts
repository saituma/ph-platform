import { normalizeProgramTier, type ProgramTierName } from "@/lib/planAccess";

const ALL: ProgramTierName[] = ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"];

export function canUseCoachMessaging(
  programTier: string | null | undefined,
  messagingAccessTiers: string[] | undefined,
): boolean {
  const tier = normalizeProgramTier(programTier ?? null);
  if (!tier) return false;
  const enabled = messagingAccessTiers?.length ? messagingAccessTiers : ALL;
  if (enabled.length === 0) return false;
  return (enabled as ProgramTierName[]).includes(tier);
}
