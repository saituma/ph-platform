import { normalizeProgramTier, type ProgramTierName } from "@/lib/planAccess";

const ALL: ProgramTierName[] = ["PHP", "PHP_Plus", "PHP_Premium"];

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
