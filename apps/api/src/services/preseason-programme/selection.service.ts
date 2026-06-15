import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  preseasonAthleteSessionCompletionTable,
  preseasonAthleteWeekTypeSelectionTable,
  preseasonDaySessionTable,
  preseasonWeekTable,
  preseasonWeekTypeTable,
} from "../../db/schema";

async function isWeekUnlocked(athleteId: number, weekId: number): Promise<boolean> {
  const [week] = await db
    .select()
    .from(preseasonWeekTable)
    .where(eq(preseasonWeekTable.id, weekId))
    .limit(1);

  if (!week) return false;

  if (week.weekNumber === 1) return true;

  const priorWeeks = await db
    .select()
    .from(preseasonWeekTable)
    .where(eq(preseasonWeekTable.programmeId, week.programmeId))
    .orderBy(asc(preseasonWeekTable.weekNumber));

  const priorWeeksSorted = priorWeeks.filter((w) => w.weekNumber < week.weekNumber);

  if (priorWeeksSorted.length === 0) return true;

  const priorWeekIds = priorWeeksSorted.map((w) => w.id);
  const selections = await db
    .select()
    .from(preseasonAthleteWeekTypeSelectionTable)
    .where(
      and(
        eq(preseasonAthleteWeekTypeSelectionTable.athleteId, athleteId),
        inArray(preseasonAthleteWeekTypeSelectionTable.weekId, priorWeekIds),
      ),
    );

  const selectionByWeekId = new Map(selections.map((s) => [s.weekId, s]));

  for (const priorWeek of priorWeeksSorted) {
    const selection = selectionByWeekId.get(priorWeek.id);
    if (!selection) return false;

    const sessions = await db
      .select({ id: preseasonDaySessionTable.id })
      .from(preseasonDaySessionTable)
      .where(eq(preseasonDaySessionTable.weekTypeId, selection.weekTypeId));

    if (sessions.length === 0) return false;

    const sessionIds = sessions.map((s) => s.id);
    const completions = await db
      .select()
      .from(preseasonAthleteSessionCompletionTable)
      .where(
        and(
          eq(preseasonAthleteSessionCompletionTable.athleteId, athleteId),
          inArray(preseasonAthleteSessionCompletionTable.daySessionId, sessionIds),
        ),
      );

    if (completions.length < sessions.length) return false;
  }

  return true;
}

export async function selectWeekType(input: { athleteId: number; weekId: number; weekTypeId: number }) {
  const [weekType] = await db
    .select()
    .from(preseasonWeekTypeTable)
    .where(
      and(eq(preseasonWeekTypeTable.id, input.weekTypeId), eq(preseasonWeekTypeTable.weekId, input.weekId)),
    )
    .limit(1);

  if (!weekType) {
    throw new Error("Week type does not belong to this week");
  }

  const unlocked = await isWeekUnlocked(input.athleteId, input.weekId);
  if (!unlocked) {
    throw new Error("Week is locked");
  }

  const now = new Date();
  const [row] = await db
    .insert(preseasonAthleteWeekTypeSelectionTable)
    .values({
      athleteId: input.athleteId,
      weekId: input.weekId,
      weekTypeId: input.weekTypeId,
      selectedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        preseasonAthleteWeekTypeSelectionTable.athleteId,
        preseasonAthleteWeekTypeSelectionTable.weekId,
      ],
      set: {
        weekTypeId: input.weekTypeId,
        selectedAt: now,
        updatedAt: now,
      },
    })
    .returning();

  return row;
}
