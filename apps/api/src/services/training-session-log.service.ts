import { db } from "../db";
import {
  athleteTrainingSessionLogTable,
  programSectionCompletionTable,
} from "../db/schema";
import { syncAchievementsForAthlete } from "./achievement.service";

export type CompleteTrainingSessionInput = {
  athleteId: number;
  contentIds: number[];
  weekNumber?: number | null;
  sessionLabel?: string | null;
  programKey?: string | null;
};

/**
 * Inserts one completion per content id, one session log row, then evaluates achievements.
 */
export async function completeTrainingSession(input: CompleteTrainingSessionInput): Promise<{
  completionsLogged: number;
  newAchievements: string[];
}> {
  const ids = [...new Set(input.contentIds.filter((n) => Number.isFinite(n) && n > 0))];
  if (!ids.length) {
    return { completionsLogged: 0, newAchievements: [] };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    for (const programSectionContentId of ids) {
      await tx.insert(programSectionCompletionTable).values({
        athleteId: input.athleteId,
        programSectionContentId,
        completedAt: now,
        updatedAt: now,
      });
    }

    await tx.insert(athleteTrainingSessionLogTable).values({
      athleteId: input.athleteId,
      weekNumber: input.weekNumber ?? null,
      sessionLabel: input.sessionLabel?.trim() ? input.sessionLabel.trim().slice(0, 500) : null,
      programKey: input.programKey?.trim() ? input.programKey.trim().slice(0, 32) : null,
      contentIds: ids,
      exerciseCount: ids.length,
      updatedAt: now,
    });
  });

  const newAchievements = await syncAchievementsForAthlete(input.athleteId);

  return { completionsLogged: ids.length, newAchievements };
}
