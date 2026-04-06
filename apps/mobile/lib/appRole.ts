export type AppRole =
  | "coach"
  | "adult_athlete"
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
  return Boolean(team && team.trim().length > 0);
}

export function resolveAppRole(input: ResolveAppRoleInput): AppRole {
  const role = (input.userRole ?? "").toLowerCase();
  const athlete = input.athlete ?? null;

  if (role === "coach" || role === "admin" || role === "superadmin") {
    return "coach";
  }

  if (role === "athlete") {
    if (athlete?.athleteType === "adult") {
      return "adult_athlete";
    }
    if (athlete?.athleteType === "youth" || hasTeam(athlete?.team)) {
      return "youth_athlete_team_guardian";
    }
    return "adult_athlete";
  }

  if (hasTeam(athlete?.team)) {
    return "youth_athlete_team_guardian";
  }

  return "youth_athlete_guardian_only";
}

