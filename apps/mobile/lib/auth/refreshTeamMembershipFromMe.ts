import { apiRequest } from "@/lib/api";
import { enrichTeamFieldsIfOnboardingHasThem } from "@/lib/auth/enrichTeamFromOnboarding";
import { resolveAppRole } from "@/lib/appRole";
import type { AppDispatch } from "@/store";
import {
  setApiUserRole,
  setAppRole,
  setAuthTeamMembership,
} from "@/store/slices/userSlice";

/**
 * Fetches `/auth/me` and applies team fields + app role (recovery when AuthPersist
 * sync failed, wrong API host vs curl, or cold-start ordering).
 */
export async function refreshTeamMembershipFromMe(
  token: string,
  dispatch: AppDispatch,
): Promise<void> {
  const me = await apiRequest<{
    user?: {
      role?: string | null;
      team?: unknown;
      teamId?: unknown;
      athleteType?: "youth" | "adult" | null;
    };
  }>("/auth/me", {
    token,
    forceRefresh: true,
    suppressStatusCodes: [401, 403],
  });
  if (!me.user) return;

  const { fields, athleteType } = await enrichTeamFieldsIfOnboardingHasThem({
    token,
    meUser: me.user,
  });
  const apiRole = me.user.role ?? null;

  dispatch(setAuthTeamMembership({ team: fields.team, teamId: fields.teamId }));
  dispatch(setApiUserRole(apiRole));
  dispatch(
    setAppRole(
      resolveAppRole({
        userRole: apiRole ?? "guardian",
        athlete: {
          team: fields.team,
          teamId: fields.teamId,
          athleteType,
        },
      }),
    ),
  );
}
