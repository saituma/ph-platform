import type { AppRole } from "@/lib/appRole";
import { hasPhpPlusPlanFeatures } from "@/lib/planAccess";
import { hasOrgTeamMembership } from "@/lib/teamMembership";
import type { ManagedAthlete } from "@/store/slices/userSlice";

export type AuthTeamMembership = { team: string | null; teamId: number | null };

/** Accept number or numeric string from `/auth/me` JSON. */
export function parseTeamIdFromApi(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.trunc(raw);
  }
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = Number(raw.trim());
    if (n > 0) return n;
  }
  return null;
}

/** Normalize `team` + `teamId` from `/auth/me` `user` (string, coach object, or roster id only). */
export function extractAuthTeamFieldsFromMeUser(user: {
  team?: unknown;
  teamId?: unknown;
}): AuthTeamMembership {
  const teamFromMe = user.team;
  const team =
    typeof teamFromMe === "string"
      ? teamFromMe.trim() || null
      : teamFromMe &&
          typeof teamFromMe === "object" &&
          "name" in teamFromMe &&
          typeof (teamFromMe as { name?: unknown }).name === "string"
        ? (teamFromMe as { name: string }).name.trim() || null
        : null;
  return { team, teamId: parseTeamIdFromApi(user.teamId) };
}

/** Team feed + Team tab — use API team/teamId when appRole has not synced to `"team"` yet. */
export function shouldUseTeamTrackingFeatures(input: {
  appRole: AppRole | null;
  authTeamMembership: AuthTeamMembership | null;
  firstManagedAthlete?: ManagedAthlete | null;
}): boolean {
  if (input.appRole === "team" || input.appRole === "adult_athlete_team") return true;
  if (hasOrgTeamMembership(input.authTeamMembership ?? undefined)) return true;
  if (hasOrgTeamMembership(input.firstManagedAthlete ?? undefined)) return true;
  return false;
}

export function canAccessTrackingTab(input: {
  appRole: AppRole | null;
  programTier?: string | null;
  authTeamMembership: AuthTeamMembership | null;
  firstManagedAthlete?: ManagedAthlete | null;
}): boolean {
  if (input.appRole === "adult_athlete" || input.appRole === "adult_athlete_team") {
    return true;
  }

  if (shouldUseTeamTrackingFeatures(input)) {
    return hasPhpPlusPlanFeatures(input.programTier ?? null);
  }

  return false;
}
