import type { AppRole } from "../types/auth";
import { isPlatformAdmin, isTrainingStaff } from "../lib/user-roles";
import type { ProgramTierValue } from "./messaging-policy.service";
import type { FeatureKey } from "../lib/billing-features";

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
  runTracking: boolean;
  achievements: boolean;
  referralRewards: boolean;
};

function tierRank(tier: string | null): number {
  if (!tier) return -1;
  const idx = TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number]);
  return idx >= 0 ? idx : -1;
}

/** Mirrors mobile `canUseCoachMessaging` policy toggles. */
function messagingAllowed(
  programTier: string | null,
  messagingAccessTiers: readonly string[],
  planFeatures: ReadonlySet<FeatureKey> | null | undefined,
): boolean {
  // Plan-driven gating: if the athlete is on a plan with an explicit feature set,
  // honour the "messaging" feature directly (works for tier-less custom/duration plans).
  if (planFeatures != null && planFeatures.size > 0) {
    return planFeatures.has("messaging") || planFeatures.has("priority_messaging");
  }
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
  planFeatures?: ReadonlySet<FeatureKey>;
}): AppCapabilities {
  const { role, programTier, messagingAccessTiers, athleteType, hasTeam = false, planFeatures } = input;
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
      runTracking: true,
      achievements: true,
      referralRewards: true,
    };
  }

  const has = (key: FeatureKey) => planFeatures != null && planFeatures.has(key);
  const hasPlanFeatures = planFeatures != null && planFeatures.size > 0;

  const effectiveTier = programTier ?? "PHP";
  const r = tierRank(effectiveTier);
  const isAdult = role === "adult_athlete" || (role === "athlete" && athleteType === "adult");
  const isTeamAthlete = role === "team_athlete" || hasTeam;
  const isYouth = role === "guardian" || role === "youth_athlete" || athleteType === "youth";
  const hasAssignedPlan = r >= 0;
  const canTrackProgress = isAdult || isTeamAthlete;

  return {
    training: hasPlanFeatures ? has("programs_full") || has("mobile_app") : true,
    schedule: hasPlanFeatures ? has("schedule") : hasAssignedPlan,
    coachBooking: hasPlanFeatures ? has("bookings") : (hasAssignedPlan && !isTeamAthlete),
    messaging: messagingAllowed(programTier, messagingAccessTiers, planFeatures),
    groupChat: isTeamAthlete,
    nutrition: hasPlanFeatures ? has("nutrition_logging") || has("food_diaries") : (r >= 2 || isTeamAthlete),
    nutritionReview: false,
    parentContent: hasPlanFeatures ? has("parent_platform") || isYouth : isYouth,
    progressTracking: hasPlanFeatures ? has("progress_tracking") && canTrackProgress : canTrackProgress,
    teamTracking: isTeamAthlete,
    socialTracking: hasPlanFeatures ? has("social_feed") : (isAdult && !isTeamAthlete),
    trainingQuestionnaire: isAdult || isTeamAthlete,
    teamManagement: false,
    athleteManagement: false,
    planManagement: false,
    routeManagement: false,
    eventManagement: false,
    adminMobile: false,
    billingPortal: true,
    mobilePayments: false,
    semiPrivateBooking: hasPlanFeatures ? has("semi_private") : r >= 2,
    coachVideoUpload: hasPlanFeatures ? has("video_upload") : r >= 2,
    physioReferrals: hasPlanFeatures ? has("physio_referrals") : r >= 3,
    runTracking: hasPlanFeatures ? has("run_tracking") : (isAdult || isTeamAthlete),
    achievements: hasPlanFeatures ? has("achievements") : true,
    referralRewards: hasPlanFeatures ? has("referrals") : true,
  };
}
