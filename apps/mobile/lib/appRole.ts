import { hasOrgTeamMembership } from "@/lib/teamMembership";

export type AppRole =
  | "coach"
  | "adult_athlete"
  | "adult_athlete_team"
  | "youth_athlete"
  | "youth_athlete_guardian_only"
  | "youth_athlete_team_guardian"
  | "team";

type ApiUserRole =
  | "guardian"
  | "athlete"
  | "coach"
  | "admin"
  | "superAdmin"
  | "team_coach"
  | "program_coach"
  | "team_athlete"
  | "adult_athlete"
  | "youth_athlete"
  | string
  | null
  | undefined;

type ResolveAppRoleInput = {
  userRole: ApiUserRole;
  athlete?: {
    team?: string | null;
    teamId?: number | null;
    /** From `/auth/me` — required to distinguish youth vs adult when API `role` is `"athlete"`. */
    athleteType?: "youth" | "adult" | null;
  } | null;
};

/** Adult athletes see athlete-facing flows like workout logging after sessions. */
export function isAdultAthleteAppRole(role: AppRole | null | undefined): boolean {
  return role === "adult_athlete" || role === "adult_athlete_team" || role === "team";
}

export function resolveAppRole(input: ResolveAppRoleInput): AppRole {
  const role = (input.userRole ?? "").toLowerCase();
  const inTeam = hasOrgTeamMembership(input.athlete ?? undefined);

  if (
    role === "coach" ||
    role === "team_coach" ||
    role === "program_coach" ||
    role === "admin" ||
    role === "superadmin"
  ) {
    return "coach";
  }

  if (role === "team_athlete" || inTeam) {
    return "team";
  }

  if (role === "adult_athlete") {
    return "adult_athlete";
  }
  if (role === "youth_athlete") {
    return "youth_athlete";
  }

  if (role === "athlete") {
    const at = input.athlete?.athleteType;
    if (at === "youth") return "youth_athlete";
    if (at === "adult") return "adult_athlete";
    return "adult_athlete";
  }

  return "youth_athlete";
}
