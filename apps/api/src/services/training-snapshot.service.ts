import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "../db";
import {
  athletePlanExerciseCompletionTable,
  athletePlanExerciseTable,
  athletePlanSessionTable,
  athleteTable,
  guardianTable,
  programSectionCompletionTable,
} from "../db/schema";

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

export async function listTrainingSnapshotForAdmin(): Promise<TrainingSnapshotRow[]> {
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
    .innerJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id));

  const sectionAgg = await db
    .select({
      athleteId: programSectionCompletionTable.athleteId,
      count: sql<number>`count(*)::int`,
    })
    .from(programSectionCompletionTable)
    .where(gte(programSectionCompletionTable.completedAt, thirtyDaysAgo))
    .groupBy(programSectionCompletionTable.athleteId);

  const sectionMap = new Map(sectionAgg.map((r) => [r.athleteId, r.count]));

  const planRows = await db
    .select({
      athleteId: athletePlanSessionTable.athleteId,
      planExerciseId: athletePlanExerciseTable.id,
      completedAt: athletePlanExerciseCompletionTable.completedAt,
    })
    .from(athletePlanSessionTable)
    .innerJoin(
      athletePlanExerciseTable,
      eq(athletePlanExerciseTable.planSessionId, athletePlanSessionTable.id),
    )
    .leftJoin(
      athletePlanExerciseCompletionTable,
      and(
        eq(athletePlanExerciseCompletionTable.planExerciseId, athletePlanExerciseTable.id),
        eq(athletePlanExerciseCompletionTable.athleteId, athletePlanSessionTable.athleteId),
      ),
    );

  const premiumMap = new Map<number, { total: number; done: number }>();
  for (const row of planRows) {
    const cur = premiumMap.get(row.athleteId) ?? { total: 0, done: 0 };
    cur.total += 1;
    if (row.completedAt != null) cur.done += 1;
    premiumMap.set(row.athleteId, cur);
  }

  return athletes.map((a) => {
    const prem = premiumMap.get(a.athleteId) ?? { total: 0, done: 0 };
    return {
      athleteId: a.athleteId,
      athleteUserId: a.athleteUserId ?? null,
      athleteName: a.athleteName,
      programTier: a.programTier ?? null,
      guardianUserId: a.guardianUserId,
      sectionCompletions30d: sectionMap.get(a.athleteId) ?? 0,
      premiumExercisesTotal: prem.total,
      premiumExercisesDone: prem.done,
    };
  });
}
