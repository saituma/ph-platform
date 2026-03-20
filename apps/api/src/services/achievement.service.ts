import { desc, eq, sql } from "drizzle-orm";

import { db } from "../db";
import {
  athleteAchievementUnlockTable,
  athleteTrainingSessionLogTable,
  programSectionCompletionTable,
} from "../db/schema";

export type AchievementDefinition = {
  key: string;
  title: string;
  description: string;
};

/** Ordered list — first eligible wins in UI; keys must stay stable for stored unlocks. */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    key: "first_rep",
    title: "First rep",
    description: "Logged your first completed exercise.",
  },
  {
    key: "full_session",
    title: "Full session",
    description: "Finished every exercise in a session with the runner.",
  },
  {
    key: "reps_10",
    title: "10 check-ins",
    description: "Logged 10 exercise completions.",
  },
  {
    key: "reps_50",
    title: "50 check-ins",
    description: "Logged 50 exercise completions.",
  },
  {
    key: "days_5",
    title: "5-day habit",
    description: "Trained on 5 different days.",
  },
  {
    key: "days_12",
    title: "12-day commitment",
    description: "Trained on 12 different days.",
  },
  {
    key: "sessions_10",
    title: "10 sessions",
    description: "Completed 10 full training sessions.",
  },
];

export type AthleteTrainingStats = {
  exerciseCompletions: number;
  sessionRuns: number;
  trainingDays: number;
};

export async function getAthleteTrainingStats(athleteId: number): Promise<AthleteTrainingStats> {
  const [ec] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(programSectionCompletionTable)
    .where(eq(programSectionCompletionTable.athleteId, athleteId));

  const [sr] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(athleteTrainingSessionLogTable)
    .where(eq(athleteTrainingSessionLogTable.athleteId, athleteId));

  const [td] = await db
    .select({
      c: sql<number>`count(distinct date(${programSectionCompletionTable.completedAt}))::int`,
    })
    .from(programSectionCompletionTable)
    .where(eq(programSectionCompletionTable.athleteId, athleteId));

  return {
    exerciseCompletions: ec?.c ?? 0,
    sessionRuns: sr?.c ?? 0,
    trainingDays: td?.c ?? 0,
  };
}

function eligibleKeys(stats: AthleteTrainingStats): Set<string> {
  const s = new Set<string>();
  if (stats.exerciseCompletions >= 1) s.add("first_rep");
  if (stats.sessionRuns >= 1) s.add("full_session");
  if (stats.exerciseCompletions >= 10) s.add("reps_10");
  if (stats.exerciseCompletions >= 50) s.add("reps_50");
  if (stats.trainingDays >= 5) s.add("days_5");
  if (stats.trainingDays >= 12) s.add("days_12");
  if (stats.sessionRuns >= 10) s.add("sessions_10");
  return s;
}

/** Inserts any missing unlock rows; returns keys newly granted this call. */
export async function syncAchievementsForAthlete(athleteId: number): Promise<string[]> {
  const stats = await getAthleteTrainingStats(athleteId);
  const want = eligibleKeys(stats);

  const existing = await db
    .select({ key: athleteAchievementUnlockTable.achievementKey })
    .from(athleteAchievementUnlockTable)
    .where(eq(athleteAchievementUnlockTable.athleteId, athleteId));

  const have = new Set(existing.map((r) => r.key));
  const newly: string[] = [];
  const now = new Date();

  for (const key of want) {
    if (have.has(key)) continue;
    const inserted = await db
      .insert(athleteAchievementUnlockTable)
      .values({
        athleteId,
        achievementKey: key,
        unlockedAt: now,
        metadata: { statsSnapshot: stats },
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [athleteAchievementUnlockTable.athleteId, athleteAchievementUnlockTable.achievementKey],
      })
      .returning({ k: athleteAchievementUnlockTable.achievementKey });
    if (inserted.length > 0) newly.push(key);
    have.add(key);
  }

  return newly;
}

export async function getTrainingProgressPayload(athleteId: number) {
  const stats = await getAthleteTrainingStats(athleteId);
  const rows = await db
    .select()
    .from(athleteAchievementUnlockTable)
    .where(eq(athleteAchievementUnlockTable.athleteId, athleteId))
    .orderBy(desc(athleteAchievementUnlockTable.unlockedAt));

  const unlockedMap = new Map(rows.map((r) => [r.achievementKey, r.unlockedAt]));

  const achievements = ACHIEVEMENT_DEFINITIONS.map((def) => ({
    ...def,
    unlocked: unlockedMap.has(def.key),
    unlockedAt: unlockedMap.get(def.key)?.toISOString() ?? null,
  }));

  return { stats, achievements };
}
