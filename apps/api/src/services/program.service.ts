import { asc, count, desc, eq, inArray } from "drizzle-orm";

import { db } from "../db";
import {
  enrollmentTable,
  exerciseTable,
  programAssignmentTable,
  programModuleTable,
  programTable,
  sessionExerciseTable,
  sessionTable,
} from "../db/schema";
import { calculateAge, clampYouthAge, normalizeDate } from "../lib/age";
import { getAthleteForUser } from "./user.service";

function resolveAgeFromAthlete(
  row: { birthDate?: string | null; athleteType?: string | null; age?: number | null } | null | undefined,
) {
  if (!row) return null;
  const birthDate = normalizeDate(row.birthDate as any);
  if (birthDate) {
    return clampYouthAge(calculateAge(birthDate), (row.athleteType || "youth") as any);
  }
  return clampYouthAge(row.age ?? null, (row.athleteType || "youth") as any);
}

function matchesAgeRange(item: { minAge?: number | null; maxAge?: number | null }, age: number | null) {
  const hasMin = item.minAge !== null && item.minAge !== undefined;
  const hasMax = item.maxAge !== null && item.maxAge !== undefined;
  if (!hasMin && !hasMax) return true;
  if (age === null || age === undefined) return false;
  if (hasMin && age < item.minAge!) return false;
  if (hasMax && age > item.maxAge!) return false;
  return true;
}

export async function getProgramCards(userId: number) {
  const athlete = await getAthleteForUser(userId);
  const athleteId = athlete?.id ?? null;
  const age = resolveAgeFromAthlete(athlete);
  const enrollments = athleteId
    ? await db.select().from(enrollmentTable).where(eq(enrollmentTable.athleteId, athleteId))
    : [];
  const programs = await db.select().from(programTable).orderBy(desc(programTable.updatedAt));
  const eligiblePrograms = programs.filter((program) => matchesAgeRange(program, age));

  const programByType = new Map<string, number>();
  for (const program of eligiblePrograms) {
    if (program.type && !programByType.has(program.type)) {
      programByType.set(program.type, program.id);
    }
  }

  return ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"].map((type) => {
    const enrollment = enrollments.find((e) => e.programType === type);
    return {
      type,
      status: enrollment?.status ?? "not_enrolled",
      programId: programByType.get(type) ?? null,
    };
  });
}

export async function getProgramById(programId: number) {
  const programs = await db.select().from(programTable).where(eq(programTable.id, programId)).limit(1);
  return programs[0] ?? null;
}

export async function getProgramByIdForUser(userId: number, programId: number) {
  const program = await getProgramById(programId);
  if (!program) return null;

  const athlete = await getAthleteForUser(userId);
  const age = resolveAgeFromAthlete(athlete);
  if (!matchesAgeRange(program, age)) return null;
  return program;
}

export async function getProgramSessions(programId: number) {
  const sessions = await db.select().from(sessionTable).where(eq(sessionTable.programId, programId));

  const sessionIds = sessions.map((s) => s.id);
  if (sessionIds.length === 0) {
    return [];
  }

  const sessionExercises = await db
    .select()
    .from(sessionExerciseTable)
    .where(inArray(sessionExerciseTable.sessionId, sessionIds));

  const exerciseIds = sessionExercises.map((se) => se.exerciseId);
  const exercises = exerciseIds.length
    ? await db.select().from(exerciseTable).where(inArray(exerciseTable.id, exerciseIds))
    : [];

  return sessions.map((session) => {
    const items = sessionExercises
      .filter((se) => se.sessionId === session.id)
      .map((se) => ({
        ...se,
        exercise: exercises.find((e) => e.id === se.exerciseId) ?? null,
      }))
      .sort((a, b) => a.order - b.order);

    return { ...session, exercises: items };
  });
}

export async function getExerciseLibrary() {
  return db.select().from(exerciseTable).orderBy(desc(exerciseTable.updatedAt));
}

export async function getMyAssignedPrograms(userId: number) {
  const athlete = await getAthleteForUser(userId);
  if (!athlete) return [];

  let assignments: { programId: number; status: string }[] = [];
  try {
    assignments = await db
      .select({
        programId: programAssignmentTable.programId,
        status: programAssignmentTable.status,
      })
      .from(programAssignmentTable)
      .where(eq(programAssignmentTable.athleteId, athlete.id));
  } catch {
    return [];
  }

  if (assignments.length === 0) return [];

  const programIds = assignments.map((a) => a.programId);
  const programs = await db
    .select({
      id: programTable.id,
      name: programTable.name,
      description: programTable.description,
      moduleCount: count(programModuleTable.id),
    })
    .from(programTable)
    .leftJoin(programModuleTable, eq(programModuleTable.programId, programTable.id))
    .where(inArray(programTable.id, programIds))
    .groupBy(programTable.id);

  return programs.map((p) => ({
    ...p,
    status: assignments.find((a) => a.programId === p.id)?.status ?? "active",
  }));
}

export async function getMyProgramFull(userId: number, programId: number) {
  const athlete = await getAthleteForUser(userId);
  if (!athlete) return null;

  const program = await db.select().from(programTable).where(eq(programTable.id, programId)).limit(1);
  if (!program[0]) return null;

  const modules = await db
    .select({
      id: programModuleTable.id,
      title: programModuleTable.title,
      description: programModuleTable.description,
      order: programModuleTable.order,
      sessionCount: count(sessionTable.id),
    })
    .from(programModuleTable)
    .leftJoin(sessionTable, eq(sessionTable.moduleId, programModuleTable.id))
    .where(eq(programModuleTable.programId, programId))
    .groupBy(programModuleTable.id)
    .orderBy(asc(programModuleTable.order));

  const moduleIds = modules.map((m) => m.id);
  let sessions: any[] = [];
  if (moduleIds.length > 0) {
    sessions = await db
      .select({
        id: sessionTable.id,
        moduleId: sessionTable.moduleId,
        weekNumber: sessionTable.weekNumber,
        sessionNumber: sessionTable.sessionNumber,
        title: sessionTable.title,
        description: sessionTable.description,
        type: sessionTable.type,
        exerciseCount: count(sessionExerciseTable.id),
      })
      .from(sessionTable)
      .leftJoin(sessionExerciseTable, eq(sessionExerciseTable.sessionId, sessionTable.id))
      .where(inArray(sessionTable.moduleId, moduleIds))
      .groupBy(sessionTable.id)
      .orderBy(asc(sessionTable.weekNumber), asc(sessionTable.sessionNumber));
  }

  const sessionsByModule = new Map<number, any[]>();
  for (const s of sessions) {
    const list = sessionsByModule.get(s.moduleId!) ?? [];
    list.push(s);
    sessionsByModule.set(s.moduleId!, list);
  }

  return {
    ...program[0],
    modules: modules.map((m) => ({
      ...m,
      sessions: sessionsByModule.get(m.id) ?? [],
    })),
  };
}

export async function getMySessionExercises(userId: number, sessionId: number) {
  const athlete = await getAthleteForUser(userId);
  if (!athlete) return null;

  const session = await db.select().from(sessionTable).where(eq(sessionTable.id, sessionId)).limit(1);
  if (!session[0]) return null;

  return db
    .select({
      id: sessionExerciseTable.id,
      sessionId: sessionExerciseTable.sessionId,
      exerciseId: sessionExerciseTable.exerciseId,
      order: sessionExerciseTable.order,
      coachingNotes: sessionExerciseTable.coachingNotes,
      exercise: {
        id: exerciseTable.id,
        name: exerciseTable.name,
        category: exerciseTable.category,
        sets: exerciseTable.sets,
        reps: exerciseTable.reps,
        duration: exerciseTable.duration,
        restSeconds: exerciseTable.restSeconds,
        videoUrl: exerciseTable.videoUrl,
        cues: exerciseTable.cues,
        howTo: exerciseTable.howTo,
        notes: exerciseTable.notes,
      },
    })
    .from(sessionExerciseTable)
    .innerJoin(exerciseTable, eq(exerciseTable.id, sessionExerciseTable.exerciseId))
    .where(eq(sessionExerciseTable.sessionId, sessionId))
    .orderBy(asc(sessionExerciseTable.order));
}

export async function getProgramAiInsight(programId: number) {
  const program = await getProgramById(programId);
  if (!program) return null;

  const { generateContentSummary } = await import("./ai.service");
  const ageGroup = program.minAge || program.maxAge ? `U${program.maxAge ?? program.minAge}` : "All Ages";

  return generateContentSummary(program.name, program.description || "", ageGroup);
}
