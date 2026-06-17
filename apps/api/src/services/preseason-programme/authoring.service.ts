import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  athleteTable,
  exerciseTable,
  preseasonDaySessionExerciseTable,
  preseasonDaySessionTable,
  preseasonProgrammeAssignmentTable,
  preseasonProgrammeTable,
  preseasonWeekTable,
  preseasonWeekTypeTable,
  preseasonSessionCategory,
  preseasonExerciseMetric,
} from "../../db/schema";

export async function listProgrammes() {
  return db.select().from(preseasonProgrammeTable).orderBy(desc(preseasonProgrammeTable.createdAt));
}

export async function getProgrammeFull(id: number) {
  const [programme] = await db
    .select()
    .from(preseasonProgrammeTable)
    .where(eq(preseasonProgrammeTable.id, id))
    .limit(1);

  if (!programme) return null;

  const weeks = await db
    .select()
    .from(preseasonWeekTable)
    .where(eq(preseasonWeekTable.programmeId, id))
    .orderBy(asc(preseasonWeekTable.weekNumber));

  const weekIds = weeks.map((w) => w.id);

  const weekTypes =
    weekIds.length > 0
      ? await db
          .select()
          .from(preseasonWeekTypeTable)
          .where(inArray(preseasonWeekTypeTable.weekId, weekIds))
          .orderBy(asc(preseasonWeekTypeTable.order))
      : [];

  const weekTypeIds = weekTypes.map((wt) => wt.id);

  const daySessions =
    weekTypeIds.length > 0
      ? await db
          .select()
          .from(preseasonDaySessionTable)
          .where(inArray(preseasonDaySessionTable.weekTypeId, weekTypeIds))
          .orderBy(asc(preseasonDaySessionTable.dayOfWeek))
      : [];

  const daySessionIds = daySessions.map((ds) => ds.id);

  const exerciseRows =
    daySessionIds.length > 0
      ? await db
          .select({
            id: preseasonDaySessionExerciseTable.id,
            daySessionId: preseasonDaySessionExerciseTable.daySessionId,
            exerciseId: preseasonDaySessionExerciseTable.exerciseId,
            order: preseasonDaySessionExerciseTable.order,
            metric: preseasonDaySessionExerciseTable.metric,
            setsOverride: preseasonDaySessionExerciseTable.setsOverride,
            repsOverride: preseasonDaySessionExerciseTable.repsOverride,
            durationOverride: preseasonDaySessionExerciseTable.durationOverride,
            restSecondsOverride: preseasonDaySessionExerciseTable.restSecondsOverride,
            notes: preseasonDaySessionExerciseTable.notes,
            createdAt: preseasonDaySessionExerciseTable.createdAt,
            updatedAt: preseasonDaySessionExerciseTable.updatedAt,
            exerciseName: exerciseTable.name,
            exerciseCategory: exerciseTable.category,
            exerciseSets: exerciseTable.sets,
            exerciseReps: exerciseTable.reps,
            exerciseDuration: exerciseTable.duration,
            exerciseVideoUrl: exerciseTable.videoUrl,
          })
          .from(preseasonDaySessionExerciseTable)
          .innerJoin(exerciseTable, eq(preseasonDaySessionExerciseTable.exerciseId, exerciseTable.id))
          .where(inArray(preseasonDaySessionExerciseTable.daySessionId, daySessionIds))
          .orderBy(asc(preseasonDaySessionExerciseTable.order))
      : [];

  const exercisesByDaySession = new Map<number, typeof exerciseRows>();
  for (const row of exerciseRows) {
    const list = exercisesByDaySession.get(row.daySessionId) ?? [];
    list.push(row);
    exercisesByDaySession.set(row.daySessionId, list);
  }

  const sessionsByWeekType = new Map<number, typeof daySessions>();
  for (const ds of daySessions) {
    const list = sessionsByWeekType.get(ds.weekTypeId) ?? [];
    list.push(ds);
    sessionsByWeekType.set(ds.weekTypeId, list);
  }

  const weekTypesByWeek = new Map<number, typeof weekTypes>();
  for (const wt of weekTypes) {
    const list = weekTypesByWeek.get(wt.weekId) ?? [];
    list.push(wt);
    weekTypesByWeek.set(wt.weekId, list);
  }

  return {
    ...programme,
    weeks: weeks.map((week) => ({
      ...week,
      weekTypes: (weekTypesByWeek.get(week.id) ?? []).map((wt) => ({
        ...wt,
        daySessions: (sessionsByWeekType.get(wt.id) ?? []).map((ds) => ({
          ...ds,
          exercises: exercisesByDaySession.get(ds.id) ?? [],
        })),
      })),
    })),
  };
}

async function getPreseasonExerciseRow(id: number) {
  const [row] = await db
    .select({
      id: preseasonDaySessionExerciseTable.id,
      daySessionId: preseasonDaySessionExerciseTable.daySessionId,
      exerciseId: preseasonDaySessionExerciseTable.exerciseId,
      order: preseasonDaySessionExerciseTable.order,
      metric: preseasonDaySessionExerciseTable.metric,
      setsOverride: preseasonDaySessionExerciseTable.setsOverride,
      repsOverride: preseasonDaySessionExerciseTable.repsOverride,
      durationOverride: preseasonDaySessionExerciseTable.durationOverride,
      restSecondsOverride: preseasonDaySessionExerciseTable.restSecondsOverride,
      notes: preseasonDaySessionExerciseTable.notes,
      createdAt: preseasonDaySessionExerciseTable.createdAt,
      updatedAt: preseasonDaySessionExerciseTable.updatedAt,
      exerciseName: exerciseTable.name,
      exerciseCategory: exerciseTable.category,
      exerciseSets: exerciseTable.sets,
      exerciseReps: exerciseTable.reps,
      exerciseDuration: exerciseTable.duration,
      exerciseVideoUrl: exerciseTable.videoUrl,
    })
    .from(preseasonDaySessionExerciseTable)
    .innerJoin(exerciseTable, eq(preseasonDaySessionExerciseTable.exerciseId, exerciseTable.id))
    .where(eq(preseasonDaySessionExerciseTable.id, id))
    .limit(1);

  return row ?? null;
}

export async function createProgramme(data: {
  title: string;
  description?: string | null;
  weekCount?: number | null;
  requiredTier?: (typeof preseasonProgrammeTable.$inferInsert)["requiredTier"];
  athleteType?: (typeof preseasonProgrammeTable.$inferInsert)["athleteType"];
  createdBy: number;
}) {
  const weekCount = data.weekCount ?? 6;

  const [programme] = await db
    .insert(preseasonProgrammeTable)
    .values({
      title: data.title,
      description: data.description ?? null,
      weekCount,
      requiredTier: data.requiredTier ?? null,
      athleteType: data.athleteType ?? "adult",
      createdBy: data.createdBy,
    })
    .returning();

  // Auto-create weeks with default week-types and 7 day slots each
  const DEFAULT_WEEK_TYPES = ["Tuesday Game Week", "Saturday Game Week", "No Game Week"];
  const DAY_DEFAULTS: {
    day: number;
    category: "PRIMER" | "GAME" | "RECOVERY" | "STRENGTH" | "SPEED" | "CONDITIONING";
    title: string;
  }[] = [
    { day: 1, category: "PRIMER", title: "Monday Primer" },
    { day: 2, category: "GAME", title: "Tuesday Session" },
    { day: 3, category: "RECOVERY", title: "Wednesday Recovery" },
    { day: 4, category: "STRENGTH", title: "Thursday Strength" },
    { day: 5, category: "SPEED", title: "Friday Speed" },
    { day: 6, category: "CONDITIONING", title: "Saturday Session" },
    { day: 7, category: "RECOVERY", title: "Sunday Recovery" },
  ];

  for (let i = 1; i <= weekCount; i++) {
    const [week] = await db
      .insert(preseasonWeekTable)
      .values({ programmeId: programme.id, weekNumber: i, title: `Week ${i}` })
      .returning();

    for (let j = 0; j < DEFAULT_WEEK_TYPES.length; j++) {
      const [weekType] = await db
        .insert(preseasonWeekTypeTable)
        .values({ weekId: week.id, name: DEFAULT_WEEK_TYPES[j], order: j + 1 })
        .returning();

      // Auto-create 7 day sessions for each week-type
      for (const dayDef of DAY_DEFAULTS) {
        await db.insert(preseasonDaySessionTable).values({
          weekTypeId: weekType.id,
          dayOfWeek: dayDef.day,
          category: dayDef.category,
          title: dayDef.title,
        });
      }
    }
  }

  return programme;
}

export async function updateProgramme(
  id: number,
  data: {
    title?: string;
    description?: string | null;
    weekCount?: number | null;
    requiredTier?: (typeof preseasonProgrammeTable.$inferInsert)["requiredTier"];
    athleteType?: (typeof preseasonProgrammeTable.$inferInsert)["athleteType"];
  },
) {
  const [row] = await db
    .update(preseasonProgrammeTable)
    .set({ ...(data as any), updatedAt: new Date() })
    .where(eq(preseasonProgrammeTable.id, id))
    .returning();
  return row ?? null;
}

export async function deleteProgramme(id: number) {
  const [row] = await db.delete(preseasonProgrammeTable).where(eq(preseasonProgrammeTable.id, id)).returning();
  return row ?? null;
}

export async function publishProgramme(id: number, isPublished: boolean) {
  const [row] = await db
    .update(preseasonProgrammeTable)
    .set({ isPublished, updatedAt: new Date() })
    .where(eq(preseasonProgrammeTable.id, id))
    .returning();
  return row ?? null;
}

export async function createWeek(data: { programmeId: number; weekNumber: number; title?: string | null }) {
  const [row] = await db
    .insert(preseasonWeekTable)
    .values({
      programmeId: data.programmeId,
      weekNumber: data.weekNumber,
      title: data.title ?? null,
    })
    .returning();
  return row;
}

export async function updateWeek(id: number, data: { weekNumber?: number; title?: string | null }) {
  const [row] = await db
    .update(preseasonWeekTable)
    .set({ ...(data as any), updatedAt: new Date() })
    .where(eq(preseasonWeekTable.id, id))
    .returning();
  return row ?? null;
}

export async function deleteWeek(id: number) {
  const [row] = await db.delete(preseasonWeekTable).where(eq(preseasonWeekTable.id, id)).returning();
  return row ?? null;
}

export async function createWeekType(data: {
  weekId: number;
  name: string;
  description?: string | null;
  order?: number | null;
}) {
  const [row] = await db
    .insert(preseasonWeekTypeTable)
    .values({
      weekId: data.weekId,
      name: data.name,
      description: data.description ?? null,
      order: data.order ?? 1,
    })
    .returning();
  return row;
}

export async function updateWeekType(id: number, data: { name?: string; description?: string | null; order?: number }) {
  const [row] = await db
    .update(preseasonWeekTypeTable)
    .set({ ...(data as any), updatedAt: new Date() })
    .where(eq(preseasonWeekTypeTable.id, id))
    .returning();
  return row ?? null;
}

export async function deleteWeekType(id: number) {
  const [row] = await db.delete(preseasonWeekTypeTable).where(eq(preseasonWeekTypeTable.id, id)).returning();
  return row ?? null;
}

export async function createDaySession(data: {
  weekTypeId: number;
  dayOfWeek: number;
  category: (typeof preseasonSessionCategory.enumValues)[number];
  title: string;
  description?: string | null;
  durationLabel?: string | null;
  intensityLabel?: string | null;
  focusLabel?: string | null;
}) {
  const [row] = await db
    .insert(preseasonDaySessionTable)
    .values({
      weekTypeId: data.weekTypeId,
      dayOfWeek: data.dayOfWeek,
      category: data.category,
      title: data.title,
      description: data.description ?? null,
      durationLabel: data.durationLabel ?? null,
      intensityLabel: data.intensityLabel ?? null,
      focusLabel: data.focusLabel ?? null,
    })
    .returning();
  return row;
}

export async function updateDaySession(
  id: number,
  data: {
    dayOfWeek?: number;
    category?: (typeof preseasonSessionCategory.enumValues)[number];
    title?: string;
    description?: string | null;
    durationLabel?: string | null;
    intensityLabel?: string | null;
    focusLabel?: string | null;
  },
) {
  const [row] = await db
    .update(preseasonDaySessionTable)
    .set({ ...(data as any), updatedAt: new Date() })
    .where(eq(preseasonDaySessionTable.id, id))
    .returning();
  return row ?? null;
}

export async function deleteDaySession(id: number) {
  const [row] = await db.delete(preseasonDaySessionTable).where(eq(preseasonDaySessionTable.id, id)).returning();
  return row ?? null;
}

export async function addExercise(data: {
  daySessionId: number;
  exerciseId: number;
  order: number;
  metric?: (typeof preseasonExerciseMetric.enumValues)[number] | null;
  setsOverride?: number | null;
  repsOverride?: number | null;
  durationOverride?: number | null;
  restSecondsOverride?: number | null;
  notes?: string | null;
}) {
  const [row] = await db
    .insert(preseasonDaySessionExerciseTable)
    .values({
      daySessionId: data.daySessionId,
      exerciseId: data.exerciseId,
      order: data.order,
      metric: data.metric ?? "reps",
      setsOverride: data.setsOverride ?? null,
      repsOverride: data.repsOverride ?? null,
      durationOverride: data.durationOverride ?? null,
      restSecondsOverride: data.restSecondsOverride ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  return getPreseasonExerciseRow(row.id);
}

export async function updateExercise(
  id: number,
  data: {
    exerciseId?: number;
    order?: number;
    metric?: (typeof preseasonExerciseMetric.enumValues)[number];
    setsOverride?: number | null;
    repsOverride?: number | null;
    durationOverride?: number | null;
    restSecondsOverride?: number | null;
    notes?: string | null;
  },
) {
  const [row] = await db
    .update(preseasonDaySessionExerciseTable)
    .set({ ...(data as any), updatedAt: new Date() })
    .where(eq(preseasonDaySessionExerciseTable.id, id))
    .returning();
  return row ? getPreseasonExerciseRow(row.id) : null;
}

export async function deleteExercise(id: number) {
  const [row] = await db
    .delete(preseasonDaySessionExerciseTable)
    .where(eq(preseasonDaySessionExerciseTable.id, id))
    .returning();
  return row ?? null;
}

export async function reorderExercises(daySessionId: number, orderedIds: number[]) {
  return db.transaction(async (tx) => {
    await Promise.all(
      orderedIds.map((id, index) =>
        tx
          .update(preseasonDaySessionExerciseTable)
          .set({ order: index + 1, updatedAt: new Date() })
          .where(eq(preseasonDaySessionExerciseTable.id, id)),
      ),
    );

    return tx
      .select()
      .from(preseasonDaySessionExerciseTable)
      .where(eq(preseasonDaySessionExerciseTable.daySessionId, daySessionId))
      .orderBy(asc(preseasonDaySessionExerciseTable.order));
  });
}

// ─── Assignment management ────────────────────────────────────────────────────

export async function listProgrammeAssignments(programmeId: number) {
  return db
    .select({
      athleteId: preseasonProgrammeAssignmentTable.athleteId,
      athleteName: athleteTable.name,
      athleteType: athleteTable.athleteType,
      assignedAt: preseasonProgrammeAssignmentTable.assignedAt,
    })
    .from(preseasonProgrammeAssignmentTable)
    .innerJoin(athleteTable, eq(athleteTable.id, preseasonProgrammeAssignmentTable.athleteId))
    .where(eq(preseasonProgrammeAssignmentTable.programmeId, programmeId))
    .orderBy(asc(athleteTable.name));
}

export async function assignAthletes(programmeId: number, athleteIds: number[], assignedBy: number) {
  if (!athleteIds.length) return [];
  const rows = athleteIds.map((athleteId) => ({ programmeId, athleteId, assignedBy }));
  return db
    .insert(preseasonProgrammeAssignmentTable)
    .values(rows)
    .onConflictDoNothing()
    .returning({ athleteId: preseasonProgrammeAssignmentTable.athleteId });
}

export async function unassignAthlete(programmeId: number, athleteId: number) {
  const [deleted] = await db
    .delete(preseasonProgrammeAssignmentTable)
    .where(
      and(
        eq(preseasonProgrammeAssignmentTable.programmeId, programmeId),
        eq(preseasonProgrammeAssignmentTable.athleteId, athleteId),
      ),
    )
    .returning({ athleteId: preseasonProgrammeAssignmentTable.athleteId });
  return deleted ?? null;
}
