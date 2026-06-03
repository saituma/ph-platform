import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { athleteTable, socialPrivacySettingsTable, teamSocialSettingsTable } from "../db/schema";

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

export async function getTeamSocialSettings(teamId: number): Promise<TeamSocialSettings> {
  const [row] = await db
    .select({
      socialEnabled: teamSocialSettingsTable.socialEnabled,
      shareRunsPublicly: teamSocialSettingsTable.shareRunsPublicly,
      allowComments: teamSocialSettingsTable.allowComments,
      showInLeaderboard: teamSocialSettingsTable.showInLeaderboard,
      showInDirectory: teamSocialSettingsTable.showInDirectory,
    })
    .from(teamSocialSettingsTable)
    .where(eq(teamSocialSettingsTable.teamId, teamId))
    .limit(1);

  return row ?? { ...DEFAULT_TEAM_SOCIAL_SETTINGS };
}

/**
 * Persist the team's social policy and propagate it to every team athlete's per-user privacy row,
 * so the existing feed/leaderboard/directory consumers (which read social_privacy_settings) reflect it.
 */
export async function updateTeamSocialSettings(
  teamId: number,
  patch: Partial<TeamSocialSettings>,
): Promise<TeamSocialSettings> {
  const fields = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => typeof v === "boolean"),
  ) as Partial<TeamSocialSettings>;

  const existing = await db
    .select({ id: teamSocialSettingsTable.id })
    .from(teamSocialSettingsTable)
    .where(eq(teamSocialSettingsTable.teamId, teamId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(teamSocialSettingsTable)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(teamSocialSettingsTable.teamId, teamId));
  } else {
    await db.insert(teamSocialSettingsTable).values({ teamId, ...fields });
  }

  if (Object.keys(fields).length > 0) {
    const athletes = await db
      .select({ userId: athleteTable.userId })
      .from(athleteTable)
      .where(eq(athleteTable.teamId, teamId));
    const userIds = athletes.map((a) => a.userId);

    if (userIds.length > 0) {
      await db
        .update(socialPrivacySettingsTable)
        .set({ ...fields, updatedAt: new Date() })
        .where(inArray(socialPrivacySettingsTable.userId, userIds));

      const withRow = await db
        .select({ userId: socialPrivacySettingsTable.userId })
        .from(socialPrivacySettingsTable)
        .where(inArray(socialPrivacySettingsTable.userId, userIds));
      const have = new Set(withRow.map((r) => r.userId));
      const missing = userIds.filter((id) => !have.has(id));
      if (missing.length > 0) {
        await db.insert(socialPrivacySettingsTable).values(missing.map((userId) => ({ userId, ...fields })));
      }
    }
  }

  return getTeamSocialSettings(teamId);
}
