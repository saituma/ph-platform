import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "../db";
import { programSectionCompletionTable } from "../db/schema";

export async function createProgramSectionCompletion(input: {
  athleteId: number;
  programSectionContentId: number;
  rpe?: number | null;
  soreness?: number | null;
  fatigue?: number | null;
  notes?: string | null;
}) {
  const [row] = await db
    .insert(programSectionCompletionTable)
    .values({
      athleteId: input.athleteId,
      programSectionContentId: input.programSectionContentId,
      rpe: input.rpe ?? null,
      soreness: input.soreness ?? null,
      fatigue: input.fatigue ?? null,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      updatedAt: new Date(),
    })
    .returning();
  return row ?? null;
}

export async function listProgramSectionCompletionsForAthlete(input: {
  athleteId: number;
  from?: Date | null;
  to?: Date | null;
  limit?: number | null;
}) {
  const filters = [eq(programSectionCompletionTable.athleteId, input.athleteId)];
  if (input.from) {
    filters.push(gte(programSectionCompletionTable.completedAt, input.from));
  }
  if (input.to) {
    filters.push(lte(programSectionCompletionTable.completedAt, input.to));
  }

  const query = db
    .select()
    .from(programSectionCompletionTable)
    .where(and(...filters))
    .orderBy(desc(programSectionCompletionTable.completedAt));

  if (input.limit && Number.isFinite(input.limit)) {
    return query.limit(Math.max(1, Number(input.limit)));
  }
  return query;
}

export async function getCompletedProgramSectionContentIdsForAthlete(athleteId: number) {
  const rows = await db
    .select({ programSectionContentId: programSectionCompletionTable.programSectionContentId })
    .from(programSectionCompletionTable)
    .where(eq(programSectionCompletionTable.athleteId, athleteId));
  return new Set(rows.map((row) => row.programSectionContentId));
}

export async function isProgramSectionContentCompletedForAthlete(input: {
  athleteId: number;
  contentId: number;
}) {
  const rows = await db
    .select({ id: programSectionCompletionTable.id })
    .from(programSectionCompletionTable)
    .where(
      and(
        eq(programSectionCompletionTable.athleteId, input.athleteId),
        eq(programSectionCompletionTable.programSectionContentId, input.contentId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
