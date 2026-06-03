import { and, asc, eq } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, teamManagersTable, teamTable } from "../db/schema";

/**
 * Team membership for managers. A user "manages" a team if they are its primary
 * owner (`teams.adminId`) OR have a `team_managers` row (operational co-manager).
 * These helpers are the low-level building blocks used by the auth checks across
 * roster, social, chat, and training-content. They deliberately depend only on
 * `db` + schema to stay free of import cycles.
 */

/** All team IDs a user manages (primary + co-managed), de-duplicated. */
export async function getManagedTeamIds(userId: number): Promise<number[]> {
  const [primary, co] = await Promise.all([
    db.select({ id: teamTable.id }).from(teamTable).where(eq(teamTable.adminId, userId)),
    db.select({ id: teamManagersTable.teamId }).from(teamManagersTable).where(eq(teamManagersTable.userId, userId)),
  ]);
  const ids = new Set<number>();
  for (const r of primary) ids.add(r.id);
  for (const r of co) ids.add(r.id);
  return [...ids];
}

/** Whether a team manager (`managerUserId`) may view athlete `athleteUserId` — i.e. that
 * athlete belongs to a team the manager owns or co-manages. Used to team-scope a team_coach's
 * access to athlete health data (nutrition / sleep / wellbeing). */
export async function canManageAthleteUser(managerUserId: number, athleteUserId: number): Promise<boolean> {
  const teamIds = await getManagedTeamIds(managerUserId);
  if (teamIds.length === 0) return false;
  const [athlete] = await db
    .select({ teamId: athleteTable.teamId })
    .from(athleteTable)
    .where(eq(athleteTable.userId, athleteUserId))
    .limit(1);
  return athlete?.teamId != null && teamIds.includes(athlete.teamId);
}

/** First team a user manages, primary preferred — for single-team contexts. */
export async function findManagedTeamIdForUser(userId: number): Promise<number | null> {
  const [primary] = await db.select({ id: teamTable.id }).from(teamTable).where(eq(teamTable.adminId, userId)).limit(1);
  if (primary) return primary.id;
  const [co] = await db
    .select({ id: teamManagersTable.teamId })
    .from(teamManagersTable)
    .where(eq(teamManagersTable.userId, userId))
    .orderBy(asc(teamManagersTable.teamId))
    .limit(1);
  return co?.id ?? null;
}

/** Whether the user manages a specific team (primary or co-manager). */
export async function isTeamManager(userId: number, teamId: number): Promise<boolean> {
  const [primary] = await db
    .select({ id: teamTable.id })
    .from(teamTable)
    .where(and(eq(teamTable.id, teamId), eq(teamTable.adminId, userId)))
    .limit(1);
  if (primary) return true;
  const [co] = await db
    .select({ id: teamManagersTable.id })
    .from(teamManagersTable)
    .where(and(eq(teamManagersTable.teamId, teamId), eq(teamManagersTable.userId, userId)))
    .limit(1);
  return Boolean(co);
}
