/**
 * Canonical `users.role` values (Postgres enum `role`).
 * Legacy `coach` / `athlete` remain valid enum labels for backwards compatibility;
 * new users should use the split roles after migrations `0090_expand_user_role_enum`
 * and `0091_apply_user_role_enum_data`.
 */
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

/** Staff who can use coach-style admin tooling (content, billing admin, team roster, bookings admin). */
export const ROLES_TRAINING_STAFF: UserRole[] = [
  "team_coach",
  "program_coach",
  "coach",
  "admin",
  "superAdmin",
];

export const ROLES_ATHLETE: UserRole[] = ["team_athlete", "adult_athlete", "youth_athlete", "athlete"];

export const ROLES_ADMIN: UserRole[] = ["admin", "superAdmin"];

export function isTrainingStaff(role: string | null | undefined): boolean {
  if (!role) return false;
  return ROLES_TRAINING_STAFF.includes(role as UserRole);
}

export function isPlatformAdmin(role: string | null | undefined): boolean {
  if (!role) return false;
  return ROLES_ADMIN.includes(role as UserRole);
}

export function isTeamManagerRole(role: string | null | undefined): boolean {
  return String(role ?? "") === "team_coach";
}

export function isAthleteUserRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return ROLES_ATHLETE.includes(role as UserRole);
}

/** Roster athletes book only via coach/admin — not from their own login. */
export function isTeamAthleteRole(role: string | null | undefined): boolean {
  return String(role ?? "") === "team_athlete";
}

/**
 * Express `requireRole` helper: route configs may still list `coach` / `athlete`;
 * this maps them so migrated roles (`team_coach`, `youth_athlete`, …) still pass.
 */
export function userHasAnyRole(userRole: string | null | undefined, allowed: readonly string[]): boolean {
  if (!userRole) return false;
  return allowed.some((token) => {
    if (token === "coach") {
      return userRole === "team_coach" || userRole === "program_coach" || userRole === "coach";
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
