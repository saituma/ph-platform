import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "../db";
import {
  athleteAchievementUnlockTable,
  athleteInjuryLogsTable,
  athleteTrainingSessionCompletionTable,
  athleteTrainingSessionWorkoutLogTable,
  athleteTable,
  programAssignmentTable,
  programSessionCompletionTable,
  programTable,
  progressEntryTable,
  runLogTable,
  scheduledSessionTable,
  sessionAttendanceTable,
  sessionTable,
  trainingModuleSessionTable,
} from "../db/schema";
import { ACHIEVEMENT_DEFINITIONS, getAthleteTrainingStats } from "./achievement.service";
import { getManagedTeamForUser } from "./team-roster.service";

type AuthUser = { id: number; role: string };

export type AthleteDataWindow = {
  teamId?: number | null;
  /** Inclusive lower bound (already resolved by the caller). Null = no lower bound. */
  from?: Date | null;
  to?: Date | null;
  limit: number;
};

/**
 * Resolve an athlete only if they belong to a team the requesting user manages.
 * This is the single security gate for every manager-scoped athlete read — it
 * mirrors getTeamRosterAthleteDetail so a manager can never reach another team.
 */
async function resolveManagedAthlete(user: AuthUser, athleteId: number, teamIdQuery?: number | null) {
  const team = await getManagedTeamForUser(user, teamIdQuery ?? null);
  if (!team) return null;
  const [row] = await db
    .select({ id: athleteTable.id, userId: athleteTable.userId })
    .from(athleteTable)
    .where(and(eq(athleteTable.id, athleteId), eq(athleteTable.teamId, team.id)))
    .limit(1);
  return row ?? null;
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getManagedAthleteRuns(user: AuthUser, athleteId: number, win: AthleteDataWindow) {
  const athlete = await resolveManagedAthlete(user, athleteId, win.teamId);
  if (!athlete) return null;

  const conds = [eq(runLogTable.userId, athlete.userId)];
  if (win.from) conds.push(gte(runLogTable.date, win.from));
  if (win.to) conds.push(lte(runLogTable.date, win.to));

  return db
    .select({
      id: runLogTable.id,
      date: runLogTable.date,
      distanceMeters: runLogTable.distanceMeters,
      durationSeconds: runLogTable.durationSeconds,
      avgPace: runLogTable.avgPace,
      avgSpeed: runLogTable.avgSpeed,
      calories: runLogTable.calories,
      sport: runLogTable.sport,
      notes: runLogTable.notes,
    })
    .from(runLogTable)
    .where(and(...conds))
    .orderBy(desc(runLogTable.date))
    .limit(win.limit);
}

export async function getManagedAthleteProgress(user: AuthUser, athleteId: number, win: AthleteDataWindow) {
  const athlete = await resolveManagedAthlete(user, athleteId, win.teamId);
  if (!athlete) return null;

  const conds = [eq(progressEntryTable.userId, athlete.userId)];
  if (win.from) conds.push(gte(progressEntryTable.entryDate, ymd(win.from)));
  if (win.to) conds.push(lte(progressEntryTable.entryDate, ymd(win.to)));

  return db
    .select({
      id: progressEntryTable.id,
      type: progressEntryTable.type,
      entryDate: progressEntryTable.entryDate,
      exerciseName: progressEntryTable.exerciseName,
      weightKg: progressEntryTable.weightKg,
      reps: progressEntryTable.reps,
      sets: progressEntryTable.sets,
      measureKind: progressEntryTable.measureKind,
      label: progressEntryTable.label,
      valueCm: progressEntryTable.valueCm,
      notes: progressEntryTable.notes,
    })
    .from(progressEntryTable)
    .where(and(...conds))
    .orderBy(desc(progressEntryTable.entryDate), desc(progressEntryTable.createdAt))
    .limit(win.limit);
}

export async function getManagedAthleteAttendance(user: AuthUser, athleteId: number, win: AthleteDataWindow) {
  const athlete = await resolveManagedAthlete(user, athleteId, win.teamId);
  if (!athlete) return null;

  const conds = [eq(sessionAttendanceTable.userId, athlete.userId)];
  if (win.from) conds.push(gte(scheduledSessionTable.startsAt, win.from));
  if (win.to) conds.push(lte(scheduledSessionTable.startsAt, win.to));

  return db
    .select({
      id: sessionAttendanceTable.id,
      status: sessionAttendanceTable.status,
      checkInAt: sessionAttendanceTable.checkInAt,
      sessionId: scheduledSessionTable.id,
      sessionName: scheduledSessionTable.name,
      startsAt: scheduledSessionTable.startsAt,
      endsAt: scheduledSessionTable.endsAt,
      sessionStatus: scheduledSessionTable.status,
      location: scheduledSessionTable.location,
    })
    .from(sessionAttendanceTable)
    .innerJoin(scheduledSessionTable, eq(scheduledSessionTable.id, sessionAttendanceTable.scheduledSessionId))
    .where(and(...conds))
    .orderBy(desc(scheduledSessionTable.startsAt))
    .limit(win.limit);
}

export async function getManagedAthleteTraining(user: AuthUser, athleteId: number, win: AthleteDataWindow) {
  const athlete = await resolveManagedAthlete(user, athleteId, win.teamId);
  if (!athlete) return null;

  const programs = await db
    .select({
      programId: programAssignmentTable.programId,
      name: programTable.name,
      status: programAssignmentTable.status,
      scheduledDate: programAssignmentTable.scheduledDate,
      startedAt: programAssignmentTable.startedAt,
      completedAt: programAssignmentTable.completedAt,
    })
    .from(programAssignmentTable)
    .innerJoin(programTable, eq(programTable.id, programAssignmentTable.programId))
    .where(eq(programAssignmentTable.athleteId, athlete.id))
    .orderBy(desc(programAssignmentTable.createdAt));

  const moduleSessionConds = [eq(athleteTrainingSessionCompletionTable.athleteId, athlete.id)];
  if (win.from) moduleSessionConds.push(gte(athleteTrainingSessionCompletionTable.completedAt, win.from));
  if (win.to) moduleSessionConds.push(lte(athleteTrainingSessionCompletionTable.completedAt, win.to));
  const moduleSessionCompletions = await db
    .select({
      sessionId: athleteTrainingSessionCompletionTable.sessionId,
      title: trainingModuleSessionTable.title,
      completedAt: athleteTrainingSessionCompletionTable.completedAt,
    })
    .from(athleteTrainingSessionCompletionTable)
    .innerJoin(
      trainingModuleSessionTable,
      eq(trainingModuleSessionTable.id, athleteTrainingSessionCompletionTable.sessionId),
    )
    .where(and(...moduleSessionConds))
    .orderBy(desc(athleteTrainingSessionCompletionTable.completedAt))
    .limit(win.limit);

  const programSessionConds = [eq(programSessionCompletionTable.athleteId, athlete.id)];
  if (win.from) programSessionConds.push(gte(programSessionCompletionTable.completedAt, win.from));
  if (win.to) programSessionConds.push(lte(programSessionCompletionTable.completedAt, win.to));
  const programSessionCompletions = await db
    .select({
      sessionId: programSessionCompletionTable.sessionId,
      title: sessionTable.title,
      weekNumber: sessionTable.weekNumber,
      sessionNumber: sessionTable.sessionNumber,
      completedAt: programSessionCompletionTable.completedAt,
      rpe: programSessionCompletionTable.rpe,
      weightsUsed: programSessionCompletionTable.weightsUsed,
      repsCompleted: programSessionCompletionTable.repsCompleted,
    })
    .from(programSessionCompletionTable)
    .innerJoin(sessionTable, eq(sessionTable.id, programSessionCompletionTable.sessionId))
    .where(and(...programSessionConds))
    .orderBy(desc(programSessionCompletionTable.completedAt))
    .limit(win.limit);

  const workoutLogs = await db
    .select({
      sessionId: athleteTrainingSessionWorkoutLogTable.sessionId,
      title: trainingModuleSessionTable.title,
      weightsUsed: athleteTrainingSessionWorkoutLogTable.weightsUsed,
      repsCompleted: athleteTrainingSessionWorkoutLogTable.repsCompleted,
      rpe: athleteTrainingSessionWorkoutLogTable.rpe,
      updatedAt: athleteTrainingSessionWorkoutLogTable.updatedAt,
    })
    .from(athleteTrainingSessionWorkoutLogTable)
    .innerJoin(
      trainingModuleSessionTable,
      eq(trainingModuleSessionTable.id, athleteTrainingSessionWorkoutLogTable.sessionId),
    )
    .where(eq(athleteTrainingSessionWorkoutLogTable.athleteId, athlete.id))
    .orderBy(desc(athleteTrainingSessionWorkoutLogTable.updatedAt))
    .limit(win.limit);

  return {
    programs,
    sessionCompletions: [...moduleSessionCompletions, ...programSessionCompletions],
    moduleSessionCompletions,
    programSessionCompletions,
    workoutLogs,
    totals: {
      programsAssigned: programs.length,
      programsCompleted: programs.filter((p) => p.status === "completed" || p.completedAt != null).length,
      sessionsCompleted: moduleSessionCompletions.length + programSessionCompletions.length,
      workoutsLogged: workoutLogs.length,
    },
  };
}

export async function getManagedAthleteAchievements(user: AuthUser, athleteId: number, teamIdQuery?: number | null) {
  const athlete = await resolveManagedAthlete(user, athleteId, teamIdQuery);
  if (!athlete) return null;

  const unlocks = await db
    .select({
      achievementKey: athleteAchievementUnlockTable.achievementKey,
      unlockedAt: athleteAchievementUnlockTable.unlockedAt,
    })
    .from(athleteAchievementUnlockTable)
    .where(eq(athleteAchievementUnlockTable.athleteId, athlete.id));

  const unlockedAt = new Map(unlocks.map((u) => [u.achievementKey, u.unlockedAt]));
  const stats = await getAthleteTrainingStats(athlete.id);

  return {
    stats,
    achievements: ACHIEVEMENT_DEFINITIONS.map((def) => ({
      key: def.key,
      title: def.title,
      description: def.description,
      unlocked: unlockedAt.has(def.key),
      unlockedAt: unlockedAt.get(def.key) ?? null,
    })),
  };
}

export async function getManagedAthleteInjuries(user: AuthUser, athleteId: number, win: AthleteDataWindow) {
  const athlete = await resolveManagedAthlete(user, athleteId, win.teamId);
  if (!athlete) return null;

  const conds = [eq(athleteInjuryLogsTable.athleteId, athlete.id)];
  if (win.from) conds.push(gte(athleteInjuryLogsTable.occurredAt, ymd(win.from)));
  if (win.to) conds.push(lte(athleteInjuryLogsTable.occurredAt, ymd(win.to)));

  return db
    .select({
      id: athleteInjuryLogsTable.id,
      description: athleteInjuryLogsTable.description,
      bodyPart: athleteInjuryLogsTable.bodyPart,
      severity: athleteInjuryLogsTable.severity,
      occurredAt: athleteInjuryLogsTable.occurredAt,
      resolvedAt: athleteInjuryLogsTable.resolvedAt,
      notes: athleteInjuryLogsTable.notes,
      createdAt: athleteInjuryLogsTable.createdAt,
    })
    .from(athleteInjuryLogsTable)
    .where(and(...conds))
    .orderBy(desc(athleteInjuryLogsTable.occurredAt))
    .limit(win.limit);
}
