import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  preseasonAthleteSessionCompletionTable,
  preseasonAthleteWeekTypeSelectionTable,
  preseasonDaySessionTable,
  preseasonWeekTable,
  preseasonWeekTypeTable,
} from "../../db/schema";

export async function completeDaySession(input: { athleteId: number; daySessionId: number }) {
  const now = new Date();

  await db
    .insert(preseasonAthleteSessionCompletionTable)
    .values({
      athleteId: input.athleteId,
      daySessionId: input.daySessionId,
      completedAt: now,
    })
    .onConflictDoNothing({
      target: [
        preseasonAthleteSessionCompletionTable.athleteId,
        preseasonAthleteSessionCompletionTable.daySessionId,
      ],
    });

  const [existing] = await db
    .select()
    .from(preseasonAthleteSessionCompletionTable)
    .where(
      and(
        eq(preseasonAthleteSessionCompletionTable.athleteId, input.athleteId),
        eq(preseasonAthleteSessionCompletionTable.daySessionId, input.daySessionId),
      ),
    )
    .limit(1);

  const [daySession] = await db
    .select()
    .from(preseasonDaySessionTable)
    .where(eq(preseasonDaySessionTable.id, input.daySessionId))
    .limit(1);

  if (!daySession) {
    return { completedAt: existing?.completedAt ?? now, weekComplete: false, nextWeekId: null };
  }

  const [weekType] = await db
    .select()
    .from(preseasonWeekTypeTable)
    .where(eq(preseasonWeekTypeTable.id, daySession.weekTypeId))
    .limit(1);

  if (!weekType) {
    return { completedAt: existing?.completedAt ?? now, weekComplete: false, nextWeekId: null };
  }

  const [selection] = await db
    .select()
    .from(preseasonAthleteWeekTypeSelectionTable)
    .where(
      and(
        eq(preseasonAthleteWeekTypeSelectionTable.athleteId, input.athleteId),
        eq(preseasonAthleteWeekTypeSelectionTable.weekId, weekType.weekId),
      ),
    )
    .limit(1);

  if (!selection) {
    return { completedAt: existing?.completedAt ?? now, weekComplete: false, nextWeekId: null };
  }

  const allSessionsForWeekType = await db
    .select({ id: preseasonDaySessionTable.id })
    .from(preseasonDaySessionTable)
    .where(eq(preseasonDaySessionTable.weekTypeId, selection.weekTypeId));

  const allSessionIds = allSessionsForWeekType.map((s) => s.id);
  const completions =
    allSessionIds.length > 0
      ? await db
          .select()
          .from(preseasonAthleteSessionCompletionTable)
          .where(
            and(
              eq(preseasonAthleteSessionCompletionTable.athleteId, input.athleteId),
              inArray(preseasonAthleteSessionCompletionTable.daySessionId, allSessionIds),
            ),
          )
      : [];

  const weekComplete = allSessionIds.length > 0 && completions.length >= allSessionIds.length;

  let nextWeekId: number | null = null;
  if (weekComplete) {
    const [currentWeek] = await db
      .select()
      .from(preseasonWeekTable)
      .where(eq(preseasonWeekTable.id, weekType.weekId))
      .limit(1);

    if (currentWeek) {
      const [nextWeek] = await db
        .select()
        .from(preseasonWeekTable)
        .where(
          and(
            eq(preseasonWeekTable.programmeId, currentWeek.programmeId),
            eq(preseasonWeekTable.weekNumber, currentWeek.weekNumber + 1),
          ),
        )
        .limit(1);

      nextWeekId = nextWeek?.id ?? null;
    }
  }

  return {
    completedAt: existing?.completedAt ?? now,
    weekComplete,
    nextWeekId,
  };
}
