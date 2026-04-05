import { desc, eq, inArray } from "drizzle-orm";

import { db } from "../db";
import {
  athleteTable,
  enrollmentTable,
  exerciseTable,
  guardianTable,
  programTable,
  sessionExerciseTable,
  sessionTable,
} from "../db/schema";
import { calculateAge, normalizeDate } from "../lib/age";
import { getAthleteForUser } from "./user.service";

function resolveAgeFromAthlete(row: typeof athleteTable.$inferSelect | null | undefined) {
  if (!row) return null;
  const birthDate = normalizeDate(row.birthDate as any);
  if (birthDate) {
    return calculateAge(birthDate);
  }
  return row.age ?? null;
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
  const exercises = exerciseIds.length ? await db.select().from(exerciseTable).where(inArray(exerciseTable.id, exerciseIds)) : [];

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

export async function getProgramAiInsight(programId: number) {
  const program = await getProgramById(programId);
  if (!program) return null;

  const { generateContentSummary } = await import("./ai.service");
  const ageGroup = program.minAge || program.maxAge ? `U${program.maxAge ?? program.minAge}` : "All Ages";
  
  return generateContentSummary(program.name, program.description || "", ageGroup);
}
