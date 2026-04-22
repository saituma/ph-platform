import { apiRequest } from "@/lib/api";
import { hasOrgTeamMembership } from "@/lib/teamMembership";
import {
  extractAuthTeamFieldsFromMeUser,
  type AuthTeamMembership,
} from "@/lib/tracking/teamTrackingGate";

/**
 * Some deployed APIs return a thin `/auth/me` without `team` / `teamId` even when the user is an athlete.
 * `GET /onboarding` uses the same server lookup and often still includes the full athlete row.
 */
export async function enrichTeamFieldsIfOnboardingHasThem(input: {
  token: string;
  meUser: {
    role?: string | null;
    team?: unknown;
    teamId?: unknown;
    athleteType?: "youth" | "adult" | null;
  };
}): Promise<{
  fields: AuthTeamMembership;
  athleteType: "youth" | "adult" | null;
}> {
  let fields = extractAuthTeamFieldsFromMeUser(input.meUser);
  let athleteType: "youth" | "adult" | null = input.meUser.athleteType ?? null;

  const r = String(input.meUser.role ?? "").toLowerCase();
  const isApiAthleteRole =
    r === "athlete" || r === "team_athlete" || r === "adult_athlete" || r === "youth_athlete";
  if (hasOrgTeamMembership(fields) || !isApiAthleteRole) {
    return { fields, athleteType };
  }

  try {
    const ob = await apiRequest<{ athlete?: Record<string, unknown> | null }>(
      "/onboarding",
      {
        token: input.token,
        forceRefresh: true,
        suppressStatusCodes: [401, 403, 404],
      },
    );
    const a = ob?.athlete;
    if (!a || typeof a !== "object") {
      return { fields, athleteType };
    }
    const fromOnboarding = extractAuthTeamFieldsFromMeUser({
      team: a.team,
      teamId: a.teamId,
    });
    if (hasOrgTeamMembership(fromOnboarding)) {
      fields = fromOnboarding;
    }
    const at = a.athleteType;
    if (at === "youth" || at === "adult") {
      athleteType = at;
    }
  } catch {
    // keep me-derived fields
  }

  return { fields, athleteType };
}
