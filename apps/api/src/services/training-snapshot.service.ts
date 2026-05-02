import { eq, gte, sql } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, guardianTable, programSectionCompletionTable } from "../db/schema";

export type TrainingSnapshotRow = {
  athleteId: number;
  athleteUserId: number | null;
  athleteName: string;
  programTier: string | null;
  guardianUserId: number;
  sectionCompletions30d: number;
  premiumExercisesTotal: number;
  premiumExercisesDone: number;
};

export async function listTrainingSnapshotForAdmin(options?: { limit?: number }): Promise<TrainingSnapshotRow[]> {
  const effectiveLimit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(500, Math.floor(options.limit)))
      : 500;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const athletes = await db
    .select({
      athleteId: athleteTable.id,
      athleteUserId: athleteTable.userId,
      athleteName: athleteTable.name,
      programTier: athleteTable.currentProgramTier,
      guardianUserId: guardianTable.userId,
    })
    .from(athleteTable)
    .innerJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .limit(effectiveLimit);

  const sectionAgg = await db
    .select({
      athleteId: programSectionCompletionTable.athleteId,
      count: sql<number>`count(*)::int`,
    })
    .from(programSectionCompletionTable)
    .where(gte(programSectionCompletionTable.completedAt, thirtyDaysAgo))
    .groupBy(programSectionCompletionTable.athleteId);

  const sectionMap = new Map(sectionAgg.map((r) => [r.athleteId, r.count]));

  return athletes.map((a) => ({
    athleteId: a.athleteId,
    athleteUserId: a.athleteUserId ?? null,
    athleteName: a.athleteName,
    programTier: a.programTier ?? null,
    guardianUserId: a.guardianUserId,
    sectionCompletions30d: sectionMap.get(a.athleteId) ?? 0,
    premiumExercisesTotal: 0,
    premiumExercisesDone: 0,
  }));
}
