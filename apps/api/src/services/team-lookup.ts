import { eq } from "drizzle-orm";

import { db } from "../db";
import { teamTable } from "../db/schema";

/** Names that mean "no team" rather than a team called that. */
const NON_TEAM_VALUES = ["individual", "none", "n/a", "solo", "unknown"];

/** Normalize a free-text team input: "" means the athlete is not on a team. */
export function normalizeTeamName(team: string | null | undefined): string {
  const trimmed = team?.trim() || "";
  return NON_TEAM_VALUES.includes(trimmed.toLowerCase()) ? "" : trimmed;
}

/**
 * Resolve a team name to its row id, or null when no team by that name exists.
 *
 * `athletes.team` is free text while every team feature (feed, leaderboard, roster) scopes by
 * `athletes.teamId`. Writing the name without the id produces an athlete who looks teamed to the
 * client but is rejected by every team endpoint, so callers must always resolve and store both.
 */
export async function findTeamIdByName(teamName: string): Promise<number | null> {
  const normalized = normalizeTeamName(teamName);
  if (!normalized) return null;

  const [row] = await db
    .select({ id: teamTable.id })
    .from(teamTable)
    .where(eq(teamTable.name, normalized))
    .limit(1);

  return row?.id ?? null;
}
