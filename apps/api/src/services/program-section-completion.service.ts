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

