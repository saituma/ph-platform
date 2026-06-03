import { apiRequest } from "@/lib/api";

export type TeamSocialSettings = {
  socialEnabled: boolean;
  shareRunsPublicly: boolean;
  allowComments: boolean;
  showInLeaderboard: boolean;
  showInDirectory: boolean;
};

export const DEFAULT_TEAM_SOCIAL_SETTINGS: TeamSocialSettings = {
  socialEnabled: false,
  shareRunsPublicly: false,
  allowComments: true,
  showInLeaderboard: true,
  showInDirectory: true,
};

export async function fetchTeamSocialSettings(token: string) {
  try {
    return await apiRequest<{ settings: TeamSocialSettings }>("/teams/social/settings", {
      token,
      suppressLog: true,
      skipCache: true,
      forceRefresh: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/^404\s/.test(msg)) return { settings: { ...DEFAULT_TEAM_SOCIAL_SETTINGS } };
    throw e;
  }
}

export async function updateTeamSocialSettings(token: string, updates: Partial<TeamSocialSettings>) {
  return apiRequest<{ settings: TeamSocialSettings }>("/teams/social/settings", {
    token,
    method: "PATCH",
    body: updates,
    suppressLog: true,
  });
}
