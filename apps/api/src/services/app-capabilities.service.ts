import type { AppRole } from "../types/auth";
import { isPlatformAdmin, isTrainingStaff } from "../lib/user-roles";
import type { ProgramTierValue } from "./messaging-policy.service";
import type { FeatureKey } from "../lib/billing-features";

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
  wellbeing: boolean;
  sleep: boolean;
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

/** Mirrors mobile `canUseCoachMessaging` policy toggles. */
function messagingAllowed(
  programTier: string | null,
  _messagingAccessTiers: readonly string[],
  planFeatures: ReadonlySet<FeatureKey> | null | undefined,
  hasActivePlan: boolean,
): boolean {
  // Plan-driven toggle: if a plan has explicit features, messaging is controlled
  // only by feature keys. This allows custom plans to turn messaging off.
  if (planFeatures != null && planFeatures.size > 0) {
    return planFeatures.has("messaging") || planFeatures.has("priority_messaging");
  }
  // Default policy: messaging is available for everyone unless a custom plan
  // explicitly disables it via feature keys.
  return hasActivePlan || Boolean(programTier);
}

export function buildAppCapabilities(input: {
  role: AppRole;
  programTier: string | null;
  messagingAccessTiers: ProgramTierValue[];
  athleteType?: "youth" | "adult" | null;
  hasTeam?: boolean;
  planFeatures?: ReadonlySet<FeatureKey>;
  hasActivePlan?: boolean;
  youthTrackingEnabled?: boolean;
}): AppCapabilities {
  const {
    role,
    programTier,
    messagingAccessTiers,
    athleteType,
    hasTeam = false,
    planFeatures,
    hasActivePlan = false,
    youthTrackingEnabled = false,
  } = input;
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
      wellbeing: true,
      sleep: true,
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
  const hasAssignedAccess = hasPlanFeatures || hasActivePlan || Boolean(programTier);
  const hasNutrition = has("nutrition_logging") || has("food_diaries") || has("submit_diary");
  const hasParentContent = has("parent_platform") || has("parent_education");

  const isAdult = role === "adult_athlete" || (role === "athlete" && athleteType === "adult");
  const isTeamAthlete = role === "team_athlete" || hasTeam;
  const isYouth = role === "guardian" || role === "youth_athlete" || athleteType === "youth";
  const canTrackProgress = isAdult || isTeamAthlete || (isYouth && youthTrackingEnabled);
  // PHP Program is the entry-level tier — wellbeing, sleep, progress and nutrition are Premium+ only.
  const isPhpBasic = programTier === "PHP" && !has("programs_full");

  return {
    training: hasAssignedAccess,
    schedule: has("schedule"),
    coachBooking: !isTeamAthlete && has("bookings"),
    messaging: messagingAllowed(programTier, messagingAccessTiers, planFeatures, hasActivePlan),
    groupChat: isTeamAthlete,
    nutrition: !isPhpBasic && hasNutrition,
    nutritionReview: false,
    parentContent: isYouth && hasParentContent,
    progressTracking: !isPhpBasic && canTrackProgress && has("progress_tracking"),
    wellbeing: !isPhpBasic && hasAssignedAccess,
    sleep: !isPhpBasic && hasAssignedAccess,
    teamTracking: isTeamAthlete && (has("run_tracking") || has("social_feed") || has("progress_tracking")),
    socialTracking: isAdult && !isTeamAthlete && has("social_feed"),
    trainingQuestionnaire: (isAdult || isTeamAthlete) && has("progress_tracking"),
    teamManagement: false,
    athleteManagement: false,
    planManagement: false,
    routeManagement: false,
    eventManagement: false,
    adminMobile: false,
    billingPortal: true,
    mobilePayments: false,
    semiPrivateBooking: has("semi_private"),
    coachVideoUpload: has("video_upload"),
    physioReferrals: has("physio_referrals"),
    runTracking: (isAdult || isTeamAthlete || (isYouth && youthTrackingEnabled)) && has("run_tracking"),
    achievements: has("achievements"),
    referralRewards: has("referrals"),
  };
}
