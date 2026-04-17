import { hasAssignedTeam } from "@/lib/teamMembership";

export type AppRole =
  | "coach"
  | "adult_athlete"
  | "adult_athlete_team"
  | "youth_athlete"
  | "youth_athlete_guardian_only"
  | "youth_athlete_team_guardian"
  | "team";

type ApiUserRole = "guardian" | "athlete" | "coach" | "admin" | "superAdmin" | string | null | undefined;

type ResolveAppRoleInput = {
  userRole: ApiUserRole;
  athlete?: { team?: string | null } | null;
};

/** Adult athletes see athlete-facing flows like workout logging after sessions. */
export function isAdultAthleteAppRole(role: AppRole | null | undefined): boolean {
  return role === "adult_athlete" || role === "adult_athlete_team" || role === "team";
}

export function resolveAppRole(input: ResolveAppRoleInput): AppRole {
  const role = (input.userRole ?? "").toLowerCase();
  const inTeam = hasAssignedTeam(input.athlete?.team);

  if (role === "coach" || role === "admin" || role === "superadmin") {
    return "coach";
  }

  if (inTeam) {
    return "team";
  }

  if (role === "athlete") {
    return "adult_athlete";
  }

  return "youth_athlete";
}
