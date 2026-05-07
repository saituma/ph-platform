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
  _programTier: string | null,
  _messagingAccessTiers: readonly string[],
  planFeatures: ReadonlySet<FeatureKey> | null | undefined,
  _hasActivePlan: boolean,
): boolean {
  // Plan-driven toggle: if a plan has explicit features, messaging is controlled
  // only by feature keys. This allows custom plans to turn messaging off.
  if (planFeatures != null && planFeatures.size > 0) {
    return planFeatures.has("messaging") || planFeatures.has("priority_messaging");
  }
  // Default policy: messaging is available for everyone unless a custom plan
  // explicitly disables it via feature keys.
  return true;
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
  const hasPlanFeatures = false;

  const isAdult = role === "adult_athlete" || (role === "athlete" && athleteType === "adult");
  const isTeamAthlete = role === "team_athlete" || hasTeam;
  const isYouth = role === "guardian" || role === "youth_athlete" || athleteType === "youth";
  const canTrackProgress = isAdult || isTeamAthlete || (isYouth && youthTrackingEnabled);

  return {
    training: true,
    schedule: true,
    coachBooking: !isTeamAthlete,
    messaging: messagingAllowed(programTier, messagingAccessTiers, planFeatures, hasActivePlan),
    groupChat: isTeamAthlete,
    nutrition: true,
    nutritionReview: false,
    parentContent: isYouth,
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
    semiPrivateBooking: true,
    coachVideoUpload: true,
    physioReferrals: true,
    runTracking: isAdult || isTeamAthlete || (isYouth && youthTrackingEnabled),
    achievements: true,
    referralRewards: true,
  };
}
