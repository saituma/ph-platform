import type { AppRole } from "../types/auth";
import type { ProgramTierValue } from "./messaging-policy.service";

const TIER_ORDER = ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"] as const;

export type AppCapabilities = {
  schedule: boolean;
  messaging: boolean;
  nutrition: boolean;
  parentContent: boolean;
  semiPrivateBooking: boolean;
  coachVideoUpload: boolean;
  physioReferrals: boolean;
};

function tierRank(tier: string | null): number {
  if (!tier) return -1;
  const idx = TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number]);
  return idx >= 0 ? idx : -1;
}

/** Mirrors mobile `canUseCoachMessaging` policy toggles. */
function messagingAllowed(programTier: string | null, messagingAccessTiers: readonly string[]): boolean {
  if (messagingAccessTiers.length > 0) {
    return messagingAccessTiers.some((t) => {
      const s = String(t).trim().toLowerCase();
      return s.length > 0 && s !== "none" && s !== "off";
    });
  }
  return tierRank(programTier) >= 0 && Boolean(programTier);
}

export function buildAppCapabilities(input: {
  role: AppRole;
  programTier: string | null;
  messagingAccessTiers: ProgramTierValue[];
}): AppCapabilities {
  const { role, programTier, messagingAccessTiers } = input;
  if (role === "coach" || role === "admin" || role === "superAdmin") {
    return {
      schedule: true,
      messaging: true,
      nutrition: true,
      parentContent: true,
      semiPrivateBooking: true,
      coachVideoUpload: true,
      physioReferrals: true,
    };
  }

  const effectiveTier = programTier ?? "PHP";
  const r = tierRank(effectiveTier);

  return {
    schedule: r >= 0,
    messaging: messagingAllowed(programTier, messagingAccessTiers),
    nutrition: r >= 1,
    parentContent: r >= 1,
    semiPrivateBooking: r >= 2,
    coachVideoUpload: r >= 2,
    physioReferrals: r >= 3,
  };
}
