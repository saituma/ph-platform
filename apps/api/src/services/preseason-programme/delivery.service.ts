import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  exerciseTable,
  preseasonAthleteSessionCompletionTable,
  preseasonAthleteWeekTypeSelectionTable,
  preseasonDaySessionExerciseTable,
  preseasonDaySessionTable,
  preseasonProgrammeAssignmentTable,
  preseasonProgrammeTable,
  preseasonWeekTable,
  preseasonWeekTypeTable,
} from "../../db/schema";

export type PreseasonWeekStatus = "active" | "locked" | "completed";

const TIER_RANK: Record<string, number> = { PHP: 0, PHP_Premium: 1, PHP_Premium_Plus: 2, PHP_Pro: 3 };

function canAccessTier(athleteTier: string | null, requiredTier: string | null): boolean {
  if (!requiredTier) return true;
  if (!athleteTier) return false;
  return (TIER_RANK[athleteTier] ?? -1) >= (TIER_RANK[requiredTier] ?? 999);
}

async function deriveWeekStatuses(
  athleteId: number,
  weeks: Array<{ id: number; weekNumber: number; title: string | null }>,
): Promise<
  Array<{
    id: number;
    weekNumber: number;
    title: string | null;
    status: PreseasonWeekStatus;
    selectedWeekTypeId: number | null;
    completedSessionCount: number;
    totalSessionCount: number;
  }>
> {
  if (weeks.length === 0) return [];

  const weekIds = weeks.map((w) => w.id);

  const selections = await db
    .select()
    .from(preseasonAthleteWeekTypeSelectionTable)
    .where(
      and(
        eq(preseasonAthleteWeekTypeSelectionTable.athleteId, athleteId),
        inArray(preseasonAthleteWeekTypeSelectionTable.weekId, weekIds),
      ),
    );

  const selectionByWeekId = new Map(selections.map((s) => [s.weekId, s]));

  const weekTypeIds = selections.map((s) => s.weekTypeId);
  const allDaySessions =
    weekTypeIds.length > 0
      ? await db
          .select({ id: preseasonDaySessionTable.id, weekTypeId: preseasonDaySessionTable.weekTypeId })
          .from(preseasonDaySessionTable)
          .where(inArray(preseasonDaySessionTable.weekTypeId, weekTypeIds))
      : [];

  const daySessionIds = allDaySessions.map((ds) => ds.id);
  const completions =
    daySessionIds.length > 0
      ? await db
          .select({ daySessionId: preseasonAthleteSessionCompletionTable.daySessionId })
          .from(preseasonAthleteSessionCompletionTable)
          .where(
            and(
              eq(preseasonAthleteSessionCompletionTable.athleteId, athleteId),
              inArray(preseasonAthleteSessionCompletionTable.daySessionId, daySessionIds),
            ),
          )
      : [];

  const completionSet = new Set(completions.map((c) => c.daySessionId));

  const sessionsByWeekType = new Map<number, number[]>();
  for (const ds of allDaySessions) {
    const list = sessionsByWeekType.get(ds.weekTypeId) ?? [];
    list.push(ds.id);
    sessionsByWeekType.set(ds.weekTypeId, list);
  }

  const weekCompletionMap = new Map<number, { completed: boolean; totalCount: number; completedCount: number }>();
  for (const week of weeks) {
    const selection = selectionByWeekId.get(week.id);
    if (!selection) {
      weekCompletionMap.set(week.id, { completed: false, totalCount: 0, completedCount: 0 });
      continue;
    }
    const sessionIds = sessionsByWeekType.get(selection.weekTypeId) ?? [];
    const completedCount = sessionIds.filter((id) => completionSet.has(id)).length;
    const completed = sessionIds.length > 0 && completedCount === sessionIds.length;
    weekCompletionMap.set(week.id, { completed, totalCount: sessionIds.length, completedCount });
  }

  const sorted = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  let priorComplete = true;

  return sorted.map((week) => {
    const completionInfo = weekCompletionMap.get(week.id) ?? { completed: false, totalCount: 0, completedCount: 0 };
    const selection = selectionByWeekId.get(week.id) ?? null;

    let status: PreseasonWeekStatus;
    if (completionInfo.completed) {
      status = "completed";
      priorComplete = true;
    } else if (priorComplete) {
      status = "active";
      priorComplete = false;
    } else {
      status = "locked";
    }

    return {
      id: week.id,
      weekNumber: week.weekNumber,
      title: week.title,
      status,
      selectedWeekTypeId: selection?.weekTypeId ?? null,
      completedSessionCount: completionInfo.completedCount,
      totalSessionCount: completionInfo.totalCount,
    };
  });
}

export async function getProgrammeOverview(input: {
  athleteId: number;
  athleteType: string;
  currentProgramTier: string | null;
}) {
  const [programme] = await db
    .select()
    .from(preseasonProgrammeTable)
    .where(eq(preseasonProgrammeTable.isPublished, true))
    .limit(1);

  if (!programme) return null;

  if (programme.athleteType !== input.athleteType) return null;

  const assignment = await db
    .select({ id: preseasonProgrammeAssignmentTable.id })
    .from(preseasonProgrammeAssignmentTable)
    .where(
      and(
        eq(preseasonProgrammeAssignmentTable.programmeId, programme.id),
        eq(preseasonProgrammeAssignmentTable.athleteId, input.athleteId),
      ),
    )
    .limit(1);

  if (assignment.length === 0) {
    return { accessDenied: true as const, lockedReason: "assignment" as const };
  }

  if (!canAccessTier(input.currentProgramTier, programme.requiredTier ?? null)) {
    return { accessDenied: true as const, lockedReason: "tier" as const };
  }

  const weeks = await db
    .select()
    .from(preseasonWeekTable)
    .where(eq(preseasonWeekTable.programmeId, programme.id))
    .orderBy(asc(preseasonWeekTable.weekNumber));

  const weekStatuses = await deriveWeekStatuses(input.athleteId, weeks);

  return {
    programme: {
      id: programme.id,
      title: programme.title,
      description: programme.description,
      weekCount: programme.weekCount,
      requiredTier: programme.requiredTier,
      athleteType: programme.athleteType,
    },
    weeks: weekStatuses,
  };
}

export async function getWeekTypes(weekId: number) {
  return db
    .select()
    .from(preseasonWeekTypeTable)
    .where(eq(preseasonWeekTypeTable.weekId, weekId))
    .orderBy(asc(preseasonWeekTypeTable.order));
}

export async function getWeekSessions(input: { athleteId: number; weekId: number }) {
  const [week] = await db.select().from(preseasonWeekTable).where(eq(preseasonWeekTable.id, input.weekId)).limit(1);

  if (!week) return null;

  const allWeeks = await db
    .select()
    .from(preseasonWeekTable)
    .where(eq(preseasonWeekTable.programmeId, week.programmeId))
    .orderBy(asc(preseasonWeekTable.weekNumber));

  const weekStatuses = await deriveWeekStatuses(input.athleteId, allWeeks);
  const thisWeekStatus = weekStatuses.find((w) => w.id === input.weekId);

  if (!thisWeekStatus || thisWeekStatus.status === "locked") {
    return { locked: true as const };
  }

  const [selection] = await db
    .select()
    .from(preseasonAthleteWeekTypeSelectionTable)
    .where(
      and(
        eq(preseasonAthleteWeekTypeSelectionTable.athleteId, input.athleteId),
        eq(preseasonAthleteWeekTypeSelectionTable.weekId, input.weekId),
      ),
    )
    .limit(1);

  if (!selection) {
    const weekTypes = await getWeekTypes(input.weekId);
    return { needsSelection: true as const, weekTypes };
  }

  const [weekType] = await db
    .select()
    .from(preseasonWeekTypeTable)
    .where(eq(preseasonWeekTypeTable.id, selection.weekTypeId))
    .limit(1);

  const daySessions = await db
    .select()
    .from(preseasonDaySessionTable)
    .where(eq(preseasonDaySessionTable.weekTypeId, selection.weekTypeId))
    .orderBy(asc(preseasonDaySessionTable.dayOfWeek));

  const daySessionIds = daySessions.map((ds) => ds.id);
  const completions =
    daySessionIds.length > 0
      ? await db
          .select({ daySessionId: preseasonAthleteSessionCompletionTable.daySessionId })
          .from(preseasonAthleteSessionCompletionTable)
          .where(
            and(
              eq(preseasonAthleteSessionCompletionTable.athleteId, input.athleteId),
              inArray(preseasonAthleteSessionCompletionTable.daySessionId, daySessionIds),
            ),
          )
      : [];

  const completionSet = new Set(completions.map((c) => c.daySessionId));

  return {
    weekType: { id: weekType!.id, name: weekType!.name },
    sessions: daySessions.map((ds) => ({ ...ds, completed: completionSet.has(ds.id) })),
  };
}

export async function getDaySessionDetail(input: { athleteId: number; daySessionId: number }) {
  const [daySession] = await db
    .select()
    .from(preseasonDaySessionTable)
    .where(eq(preseasonDaySessionTable.id, input.daySessionId))
    .limit(1);

  if (!daySession) return null;

  const [weekType] = await db
    .select()
    .from(preseasonWeekTypeTable)
    .where(eq(preseasonWeekTypeTable.id, daySession.weekTypeId))
    .limit(1);

  if (!weekType) return null;

  const allWeeks = await db
    .select()
    .from(preseasonWeekTable)
    .where(
      eq(
        preseasonWeekTable.programmeId,
        (
          await db
            .select({ programmeId: preseasonWeekTable.programmeId })
            .from(preseasonWeekTable)
            .where(eq(preseasonWeekTable.id, weekType.weekId))
            .limit(1)
            .then(([r]) => r ?? { programmeId: 0 })
        ).programmeId,
      ),
    )
    .orderBy(asc(preseasonWeekTable.weekNumber));

  const weekStatuses = await deriveWeekStatuses(input.athleteId, allWeeks);
  const thisWeekStatus = weekStatuses.find((w) => w.id === weekType.weekId);

  if (!thisWeekStatus || thisWeekStatus.status === "locked") {
    return { locked: true as const };
  }

  const exercises = await db
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
      exerciseName: exerciseTable.name,
      exerciseCategory: exerciseTable.category,
      exerciseSets: exerciseTable.sets,
      exerciseReps: exerciseTable.reps,
      exerciseDuration: exerciseTable.duration,
      exerciseVideoUrl: exerciseTable.videoUrl,
      exercisePosterUrl: exerciseTable.posterUrl,
      exerciseCues: exerciseTable.cues,
      exerciseHowTo: exerciseTable.howTo,
      exerciseProgression: exerciseTable.progression,
      exerciseRegression: exerciseTable.regression,
      exerciseVideoMuted: exerciseTable.videoMuted,
      exerciseDurationSec: exerciseTable.durationSec,
      exerciseWidth: exerciseTable.width,
      exerciseHeight: exerciseTable.height,
    })
    .from(preseasonDaySessionExerciseTable)
    .innerJoin(exerciseTable, eq(preseasonDaySessionExerciseTable.exerciseId, exerciseTable.id))
    .where(eq(preseasonDaySessionExerciseTable.daySessionId, input.daySessionId))
    .orderBy(asc(preseasonDaySessionExerciseTable.order));

  const [completion] = await db
    .select()
    .from(preseasonAthleteSessionCompletionTable)
    .where(
      and(
        eq(preseasonAthleteSessionCompletionTable.athleteId, input.athleteId),
        eq(preseasonAthleteSessionCompletionTable.daySessionId, input.daySessionId),
      ),
    )
    .limit(1);

  return {
    ...daySession,
    exercises,
    completed: !!completion,
    completedAt: completion?.completedAt ?? null,
  };
}
