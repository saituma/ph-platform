import { hasAssignedTeam } from "@/lib/teamMembership";

export type AppRole =
  | "coach"
  | "adult_athlete"
  | "adult_athlete_team"
  | "youth_athlete_guardian_only"
  | "youth_athlete_team_guardian";

type ApiUserRole = "guardian" | "athlete" | "coach" | "admin" | "superAdmin" | string | null | undefined;

type OnboardingAthleteForRole = {
  athleteType?: "youth" | "adult" | string | null;
  team?: string | null;
} | null;

type ResolveAppRoleInput = {
  userRole: ApiUserRole;
  athlete?: OnboardingAthleteForRole;
};

function hasTeam(team: string | null | undefined) {
  return hasAssignedTeam(team);
}

/** Adult athletes (solo or team) see athlete-facing flows like workout logging after sessions. */
export function isAdultAthleteAppRole(role: AppRole | null | undefined): boolean {
  return role === "adult_athlete" || role === "adult_athlete_team";
}

export function resolveAppRole(input: ResolveAppRoleInput): AppRole {
  const role = (input.userRole ?? "").toLowerCase();
  const athlete = input.athlete ?? null;

  if (role === "coach" || role === "admin" || role === "superadmin") {
    return "coach";
  }

  const isAdult = athlete?.athleteType === "adult";
  const isYouth = athlete?.athleteType === "youth";
  const inTeam = hasTeam(athlete?.team);

  if (role === "athlete") {
    if (isAdult) {
      return inTeam ? "adult_athlete_team" : "adult_athlete";
    }
    // If explicitly youth, or unknown type but has a team, default to youth team behavior
    if (isYouth || inTeam) {
      return "youth_athlete_team_guardian";
    }
    // Default fallback for athlete role with no specific type and no team
    return "adult_athlete";
  }

  // Non-athlete (e.g. guardian) role
  if (inTeam) {
    return "youth_athlete_team_guardian";
  }

  return "youth_athlete_guardian_only";
}
