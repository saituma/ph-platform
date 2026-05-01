import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "../../db";
import {
  athleteTable,
  athleteTrainingSessionCompletionTable,
  athleteTrainingSessionWorkoutLogTable,
  programSectionCompletionTable,
  programSectionContentTable,
  runLogTable,
  teamTable,
  trainingModuleSessionTable,
  userTable,
} from "../../db/schema";
import { listTrainingSnapshotForAdmin } from "../training-snapshot.service";
import { listProgramSectionCompletionsForAthlete } from "../program-section-completion.service";

export { listTrainingSnapshotForAdmin, listProgramSectionCompletionsForAthlete };

function optionalDateRange(input: { from?: Date | null; to?: Date | null }, col: any) {
  const filters = [];
  if (input.from) filters.push(gte(col, input.from));
  if (input.to) filters.push(lte(col, input.to));
  return filters;
}

export async function listRunTrackingForAdmin(input?: {
  userId?: number | null;
  teamId?: number | null;
  from?: Date | null;
  to?: Date | null;
  limit?: number | null;
}) {
  const filters = [eq(userTable.isDeleted, false)];
  if (input?.userId) filters.push(eq(runLogTable.userId, input.userId));
  if (input?.teamId) filters.push(eq(athleteTable.teamId, input.teamId));
  filters.push(...optionalDateRange({ from: input?.from, to: input?.to }, runLogTable.date));

  const limit =
    typeof input?.limit === "number" && Number.isFinite(input.limit)
      ? Math.max(1, Math.min(500, Math.floor(input.limit)))
      : 100;

  const rows = await db
    .select({
      id: runLogTable.id,
      clientId: runLogTable.clientId,
      userId: runLogTable.userId,
      athleteId: athleteTable.id,
      athleteName: athleteTable.name,
      athleteType: athleteTable.athleteType,
      teamId: teamTable.id,
      teamName: teamTable.name,
      date: runLogTable.date,
      distanceMeters: runLogTable.distanceMeters,
      durationSeconds: runLogTable.durationSeconds,
      avgPace: runLogTable.avgPace,
      avgSpeed: runLogTable.avgSpeed,
      calories: runLogTable.calories,
      effortLevel: runLogTable.effortLevel,
      feelTags: runLogTable.feelTags,
      notes: runLogTable.notes,
      visibility: runLogTable.visibility,
      coordinates: runLogTable.coordinates,
      updatedAt: runLogTable.updatedAt,
    })
    .from(runLogTable)
    .innerJoin(userTable, eq(userTable.id, runLogTable.userId))
    .leftJoin(athleteTable, eq(athleteTable.userId, runLogTable.userId))
    .leftJoin(teamTable, eq(teamTable.id, athleteTable.teamId))
    .where(and(...filters))
    .orderBy(desc(runLogTable.date), desc(runLogTable.id))
    .limit(limit);

  const summary = rows.reduce(
    (acc, row) => {
      acc.totalRuns += 1;
      acc.totalMeters += Number(row.distanceMeters ?? 0);
      acc.totalSeconds += Number(row.durationSeconds ?? 0);
      if (row.teamId != null) acc.teamRunCount += 1;
      else acc.adultSoloRunCount += 1;
      return acc;
    },
    { totalRuns: 0, totalMeters: 0, totalSeconds: 0, teamRunCount: 0, adultSoloRunCount: 0 },
  );

  return { summary, items: rows };
}

export async function listTrainingQuestionnaireAnswersForAdmin(input?: {
  userId?: number | null;
  teamId?: number | null;
  from?: Date | null;
  to?: Date | null;
  limit?: number | null;
}) {
  const limit =
    typeof input?.limit === "number" && Number.isFinite(input.limit)
      ? Math.max(1, Math.min(500, Math.floor(input.limit)))
      : 100;

  const athleteFilters = [eq(userTable.isDeleted, false)];
  if (input?.userId) athleteFilters.push(eq(athleteTable.userId, input.userId));
  if (input?.teamId) athleteFilters.push(eq(athleteTable.teamId, input.teamId));

  const athletes = await db
    .select({
      athleteId: athleteTable.id,
      userId: athleteTable.userId,
      athleteName: athleteTable.name,
      athleteType: athleteTable.athleteType,
      teamName: teamTable.name,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(userTable.id, athleteTable.userId))
    .leftJoin(teamTable, eq(teamTable.id, athleteTable.teamId))
    .where(and(...athleteFilters));

  const athleteIds = athletes.map((athlete) => athlete.athleteId);
  if (!athleteIds.length) {
    return { items: [] };
  }

  const athleteById = new Map(athletes.map((athlete) => [athlete.athleteId, athlete]));

  const sectionFilters = [
    inArray(programSectionCompletionTable.athleteId, athleteIds),
    ...optionalDateRange({ from: input?.from, to: input?.to }, programSectionCompletionTable.completedAt),
  ];
  const sectionAnswers = await db
    .select({
      source: sql<string>`'program_section'`,
      id: programSectionCompletionTable.id,
      athleteId: programSectionCompletionTable.athleteId,
      title: programSectionContentTable.title,
      rpe: programSectionCompletionTable.rpe,
      soreness: programSectionCompletionTable.soreness,
      fatigue: programSectionCompletionTable.fatigue,
      notes: programSectionCompletionTable.notes,
      completedAt: programSectionCompletionTable.completedAt,
    })
    .from(programSectionCompletionTable)
    .leftJoin(
      programSectionContentTable,
      eq(programSectionContentTable.id, programSectionCompletionTable.programSectionContentId),
    )
    .where(and(...sectionFilters))
    .orderBy(desc(programSectionCompletionTable.completedAt))
    .limit(limit);

  const workoutFilters = [
    inArray(athleteTrainingSessionWorkoutLogTable.athleteId, athleteIds),
    ...optionalDateRange({ from: input?.from, to: input?.to }, athleteTrainingSessionWorkoutLogTable.updatedAt),
  ];
  const workoutAnswers = await db
    .select({
      source: sql<string>`'workout_log'`,
      id: athleteTrainingSessionWorkoutLogTable.id,
      athleteId: athleteTrainingSessionWorkoutLogTable.athleteId,
      title: trainingModuleSessionTable.title,
      weightsUsed: athleteTrainingSessionWorkoutLogTable.weightsUsed,
      repsCompleted: athleteTrainingSessionWorkoutLogTable.repsCompleted,
      rpe: athleteTrainingSessionWorkoutLogTable.rpe,
      completedAt: athleteTrainingSessionCompletionTable.completedAt,
      updatedAt: athleteTrainingSessionWorkoutLogTable.updatedAt,
    })
    .from(athleteTrainingSessionWorkoutLogTable)
    .leftJoin(
      trainingModuleSessionTable,
      eq(trainingModuleSessionTable.id, athleteTrainingSessionWorkoutLogTable.sessionId),
    )
    .leftJoin(
      athleteTrainingSessionCompletionTable,
      and(
        eq(athleteTrainingSessionCompletionTable.athleteId, athleteTrainingSessionWorkoutLogTable.athleteId),
        eq(athleteTrainingSessionCompletionTable.sessionId, athleteTrainingSessionWorkoutLogTable.sessionId),
      ),
    )
    .where(and(...workoutFilters))
    .orderBy(desc(athleteTrainingSessionWorkoutLogTable.updatedAt))
    .limit(limit);

  const items = [...sectionAnswers, ...workoutAnswers]
    .map((item: any) => {
      const athlete = athleteById.get(item.athleteId);
      return {
        ...item,
        userId: athlete?.userId ?? null,
        athleteName: athlete?.athleteName ?? null,
        athleteType: athlete?.athleteType ?? null,
        teamName: athlete?.teamName ?? null,
        completedAt: item.completedAt ?? item.updatedAt ?? null,
      };
    })
    .sort((a, b) => {
      const at = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bt = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bt - at;
    })
    .slice(0, limit);

  return { items };
}
