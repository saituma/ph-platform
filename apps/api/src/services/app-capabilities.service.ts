import type { AppRole } from "../types/auth";
import { isPlatformAdmin, isTrainingStaff } from "../lib/user-roles";
import type { ProgramTierValue } from "./messaging-policy.service";

const TIER_ORDER = ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"] as const;

export type AppCapabilities = {
  training: boolean;
  schedule: boolean;
  coachBooking: boolean;
  messaging: boolean;
  groupChat: boolean;
  nutrition: boolean;
  nutritionReview: boolean;
  parentContent: boolean;
  progressTracking: boolean;
  teamTracking: boolean;
  socialTracking: boolean;
  trainingQuestionnaire: boolean;
  teamManagement: boolean;
  athleteManagement: boolean;
  planManagement: boolean;
  routeManagement: boolean;
  eventManagement: boolean;
  adminMobile: boolean;
  billingPortal: boolean;
  mobilePayments: boolean;
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
  athleteType?: "youth" | "adult" | null;
  hasTeam?: boolean;
}): AppCapabilities {
  const { role, programTier, messagingAccessTiers, athleteType, hasTeam = false } = input;
  const isAdmin = isPlatformAdmin(role);
  const isStaff = isTrainingStaff(role);

  if (isStaff) {
    const canManageAllAthletes = isAdmin || role === "coach" || role === "program_coach";
    return {
      training: false,
      schedule: true,
      coachBooking: true,
      messaging: true,
      groupChat: true,
      nutrition: true,
      nutritionReview: true,
      parentContent: true,
      progressTracking: true,
      teamTracking: true,
      socialTracking: true,
      trainingQuestionnaire: true,
      teamManagement: true,
      athleteManagement: true,
      planManagement: canManageAllAthletes,
      routeManagement: true,
      eventManagement: true,
      adminMobile: true,
      billingPortal: false,
      mobilePayments: false,
      semiPrivateBooking: true,
      coachVideoUpload: true,
      physioReferrals: true,
    };
  }

  const effectiveTier = programTier ?? "PHP";
  const r = tierRank(effectiveTier);
  const isAdult = role === "adult_athlete" || (role === "athlete" && athleteType === "adult");
  const isTeamAthlete = role === "team_athlete" || hasTeam;
  const isYouth = role === "guardian" || role === "youth_athlete" || athleteType === "youth";
  const hasAssignedPlan = r >= 0;
  const canUseNutrition = r >= 1 || isTeamAthlete;
  const canTrackProgress = isAdult || isTeamAthlete;

  return {
    training: true,
    schedule: hasAssignedPlan,
    coachBooking: hasAssignedPlan && !isTeamAthlete,
    messaging: messagingAllowed(programTier, messagingAccessTiers),
    groupChat: isTeamAthlete,
    nutrition: canUseNutrition,
    nutritionReview: false,
    parentContent: isYouth && r >= 1,
    progressTracking: canTrackProgress,
    teamTracking: isTeamAthlete,
    socialTracking: isAdult && !isTeamAthlete,
    trainingQuestionnaire: isAdult || isTeamAthlete,
    teamManagement: false,
    athleteManagement: false,
    planManagement: false,
    routeManagement: false,
    eventManagement: false,
    adminMobile: false,
    billingPortal: true,
    mobilePayments: false,
    semiPrivateBooking: r >= 2,
    coachVideoUpload: r >= 2,
    physioReferrals: r >= 3,
  };
}
