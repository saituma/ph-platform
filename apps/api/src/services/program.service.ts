import { eq, inArray } from "drizzle-orm";

import { db } from "../db";
import {
  athleteTable,
  enrollmentTable,
  exerciseTable,
  programTable,
  sessionExerciseTable,
  sessionTable,
} from "../db/schema";

export async function getProgramCards(userId: number) {
  const athlete = await db.select().from(athleteTable).where(eq(athleteTable.userId, userId)).limit(1);
  const athleteId = athlete[0]?.id;

  const enrollments = athleteId
    ? await db.select().from(enrollmentTable).where(eq(enrollmentTable.athleteId, athleteId))
    : [];

  return ["PHP", "PHP_Plus", "PHP_Premium"].map((type) => {
    const enrollment = enrollments.find((e) => e.programType === type);
    return {
      type,
      status: enrollment?.status ?? "not_enrolled",
    };
  });
}

export async function getProgramById(programId: number) {
  const programs = await db.select().from(programTable).where(eq(programTable.id, programId)).limit(1);
  return programs[0] ?? null;
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
