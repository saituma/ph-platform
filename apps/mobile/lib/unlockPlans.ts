import { PROGRAM_TIERS } from "@/constants/Programs";
import {
  canAccessTier,
  normalizeProgramTier,
  programIdToTier,
} from "@/lib/planAccess";

const KNOWN_PROGRAM_IDS = ["php", "plus", "premium", "pro"] as const;

type KnownProgramId = (typeof KNOWN_PROGRAM_IDS)[number];

function isKnownProgramId(id: string): id is KnownProgramId {
  return (KNOWN_PROGRAM_IDS as readonly string[]).includes(id);
}

export function getUnlockingPlanNames(requiredTier?: string | null): string[] {
  const normalizedRequiredTier = normalizeProgramTier(requiredTier);
  if (!normalizedRequiredTier) return [];

  return PROGRAM_TIERS.filter((tier) => isKnownProgramId(tier.id))
    .filter((tier) => canAccessTier(programIdToTier(tier.id), normalizedRequiredTier))
    .map((tier) => tier.name);
}

export function formatPlanList(planNames: string[]): string {
  const names = planNames.filter(Boolean);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, or ${names[names.length - 1]}`;
}
