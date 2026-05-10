export const USER_ROLE_VALUES = [
  "guardian",
  "athlete",
  "coach",
  "admin",
  "superAdmin",
  "team_coach",
  "program_coach",
  "team_athlete",
  "adult_athlete",
  "youth_athlete",
] as const;

export type UserRole = (typeof USER_ROLE_VALUES)[number];

export const GUARDIAN_ROLES = ["guardian"] as const satisfies readonly UserRole[];

export const TRAINING_STAFF_ROLES = [
  "team_coach",
  "program_coach",
  "coach",
  "admin",
  "superAdmin",
] as const satisfies readonly UserRole[];

export const TEAM_FACING_COACH_ROLES = [
  "coach",
  "team_coach",
] as const satisfies readonly UserRole[];

export const ATHLETE_ROLES = [
  "team_athlete",
  "adult_athlete",
  "youth_athlete",
  "athlete",
] as const satisfies readonly UserRole[];

export const ADMIN_ROLES = ["admin", "superAdmin"] as const satisfies readonly UserRole[];

export const ADMIN_PORTAL_ROLES = [
  "admin",
  "coach",
  "superAdmin",
  "super_admin",
  "team_coach",
  "program_coach",
] as const;

export function isUserRole(role: string | null | undefined): role is UserRole {
  return USER_ROLE_VALUES.includes(role as UserRole);
}

export function isGuardianRole(role: string | null | undefined): boolean {
  return role === "guardian";
}

export function isTrainingStaffRole(role: string | null | undefined): boolean {
  return isUserRole(role) && (TRAINING_STAFF_ROLES as readonly string[]).includes(role);
}

export function isPlatformAdminRole(role: string | null | undefined): boolean {
  return isUserRole(role) && (ADMIN_ROLES as readonly string[]).includes(role);
}

export function isAdminPortalRole(role: string | null | undefined): boolean {
  return typeof role === "string" && (ADMIN_PORTAL_ROLES as readonly string[]).includes(role);
}

export function isTeamManagerRole(role: string | null | undefined): boolean {
  return role === "team_coach";
}

export function isAthleteUserRole(role: string | null | undefined): boolean {
  return isUserRole(role) && (ATHLETE_ROLES as readonly string[]).includes(role);
}

export function isTeamAthleteRole(role: string | null | undefined): boolean {
  return role === "team_athlete";
}

export function isNormalUserRole(role: string | null | undefined): boolean {
  return isGuardianRole(role) || isAthleteUserRole(role);
}

export function isCoachLikeRole(role: string | null | undefined): boolean {
  return role === "coach" || role === "team_coach" || role === "program_coach";
}

export function isTeamFacingCoachRole(role: string | null | undefined): boolean {
  return role === "coach" || role === "team_coach";
}

export function userHasAnyRole(userRole: string | null | undefined, allowed: readonly string[]): boolean {
  if (!userRole) return false;
  return allowed.some((token) => {
    if (token === "coach") {
      return isCoachLikeRole(userRole);
    }
    if (token === "athlete") {
      return isAthleteUserRole(userRole);
    }
    return userRole === token;
  });
}

export function resolveAthleteUserRoleFromAthleteRow(input: {
  teamId: number | null;
  athleteType: "youth" | "adult";
}): UserRole {
  if (input.teamId != null) return "team_athlete";
  return input.athleteType === "adult" ? "adult_athlete" : "youth_athlete";
}
