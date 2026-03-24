import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "../db";
import {
  athletePlanExerciseCompletionTable,
  athletePlanExerciseTable,
  athletePlanSessionCompletionTable,
  athletePlanSessionTable,
  enrollmentTable,
  exerciseTable,
  sessionExerciseTable,
  sessionTable,
} from "../db/schema";

export async function getAthletePremiumPlan(input: { athleteId: number; weekNumber?: number | null }) {
  const sessions = await db
    .select()
    .from(athletePlanSessionTable)
    .where(eq(athletePlanSessionTable.athleteId, input.athleteId))
    .orderBy(asc(athletePlanSessionTable.weekNumber), asc(athletePlanSessionTable.sessionNumber), desc(athletePlanSessionTable.updatedAt));

  const filteredSessions =
    input.weekNumber != null
      ? sessions.filter((s) => s.weekNumber === input.weekNumber)
      : sessions;

  const sessionIds = filteredSessions.map((s) => s.id);
  const exercises = sessionIds.length
    ? await db
        .select()
        .from(athletePlanExerciseTable)
        .where(inArray(athletePlanExerciseTable.planSessionId, sessionIds))
        .orderBy(asc(athletePlanExerciseTable.order), desc(athletePlanExerciseTable.updatedAt))
    : [];

  const exerciseIds = exercises.map((e) => e.exerciseId);
  const masterExercises = exerciseIds.length
    ? await db.select().from(exerciseTable).where(inArray(exerciseTable.id, exerciseIds))
    : [];

  const completionRows = exercises.length
    ? await db
        .select()
        .from(athletePlanExerciseCompletionTable)
        .where(
          and(
            eq(athletePlanExerciseCompletionTable.athleteId, input.athleteId),
            inArray(
              athletePlanExerciseCompletionTable.planExerciseId,
              exercises.map((e) => e.id),
            ),
          ),
        )
    : [];

  const completedSet = new Set(completionRows.map((row) => row.planExerciseId));

  return filteredSessions.map((session) => {
    const sessionExercises = exercises
      .filter((e) => e.planSessionId === session.id)
      .map((e) => {
        const base = masterExercises.find((x) => x.id === e.exerciseId) ?? null;
        return {
          ...e,
          exercise: base,
          completed: completedSet.has(e.id),
        };
      })
      .sort((a, b) => a.order - b.order);

    return { ...session, exercises: sessionExercises };
  });
}

export async function clonePremiumPlanFromAssignedTemplate(input: {
  athleteId: number;
  coachId: number;
  replaceExisting?: boolean;
}) {
  const enrollments = await db.select().from(enrollmentTable).where(eq(enrollmentTable.athleteId, input.athleteId));
  const enrollment = enrollments.find((e) => e.programType === "PHP_Premium");
  const templateProgramId = enrollment?.programTemplateId ?? null;
  if (!templateProgramId) {
    throw new Error("No Premium program template assigned.");
  }

  const templateSessions = await db.select().from(sessionTable).where(eq(sessionTable.programId, templateProgramId));
  const templateSessionIds = templateSessions.map((s) => s.id);
  const templateExercises = templateSessionIds.length
    ? await db
        .select()
        .from(sessionExerciseTable)
        .where(inArray(sessionExerciseTable.sessionId, templateSessionIds))
    : [];

  return db.transaction(async (tx) => {
    if (input.replaceExisting) {
      const existingSessions = await tx
        .select({ id: athletePlanSessionTable.id })
        .from(athletePlanSessionTable)
        .where(eq(athletePlanSessionTable.athleteId, input.athleteId));
      const existingSessionIds = existingSessions.map((s) => s.id);
      if (existingSessionIds.length) {
        await tx.delete(athletePlanExerciseTable).where(inArray(athletePlanExerciseTable.planSessionId, existingSessionIds));
        await tx.delete(athletePlanSessionTable).where(eq(athletePlanSessionTable.athleteId, input.athleteId));
      }
    }

    const insertedSessions: Array<{ id: number; templateSessionId: number }> = [];
    for (const template of templateSessions) {
      const [row] = await tx
        .insert(athletePlanSessionTable)
        .values({
          athleteId: input.athleteId,
          weekNumber: template.weekNumber,
          sessionNumber: template.sessionNumber,
          title: null,
          notes: null,
          createdBy: input.coachId,
          updatedAt: new Date(),
        })
        .returning({ id: athletePlanSessionTable.id });
      insertedSessions.push({ id: row.id, templateSessionId: template.id });
    }

    for (const templateSession of insertedSessions) {
      const ex = templateExercises
        .filter((e) => e.sessionId === templateSession.templateSessionId)
        .sort((a, b) => a.order - b.order);
      for (const e of ex) {
        await tx.insert(athletePlanExerciseTable).values({
          planSessionId: templateSession.id,
          exerciseId: e.exerciseId,
          order: e.order,
          coachingNotes: e.coachingNotes ?? null,
          progressionNotes: e.progressionNotes ?? null,
          regressionNotes: e.regressionNotes ?? null,
          updatedAt: new Date(),
        });
      }
    }

    return { ok: true, templateProgramId };
  });
}

export async function createPlanSession(input: {
  athleteId: number;
  coachId: number;
  weekNumber: number;
  sessionNumber: number;
  title?: string | null;
  notes?: string | null;
}) {
  const [row] = await db
    .insert(athletePlanSessionTable)
    .values({
      athleteId: input.athleteId,
      weekNumber: input.weekNumber,
      sessionNumber: input.sessionNumber,
      title: input.title?.trim() ? input.title.trim() : null,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      createdBy: input.coachId,
      updatedAt: new Date(),
    })
    .returning();
  return row ?? null;
}

export async function updatePlanSession(input: {
  id: number;
  weekNumber?: number | null;
  sessionNumber?: number | null;
  title?: string | null;
  notes?: string | null;
}) {
  const [updated] = await db
    .update(athletePlanSessionTable)
    .set({
      weekNumber: input.weekNumber ?? undefined,
      sessionNumber: input.sessionNumber ?? undefined,
      title: input.title?.trim ? (input.title.trim() || null) : undefined,
      notes: input.notes?.trim ? (input.notes.trim() || null) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(athletePlanSessionTable.id, input.id))
    .returning();
  return updated ?? null;
}

export async function deletePlanSession(sessionId: number) {
  return db.transaction(async (tx) => {
    await tx.delete(athletePlanExerciseTable).where(eq(athletePlanExerciseTable.planSessionId, sessionId));
    const [deleted] = await tx.delete(athletePlanSessionTable).where(eq(athletePlanSessionTable.id, sessionId)).returning();
    return deleted ?? null;
  });
}

export async function addExerciseToPlanSession(input: {
  planSessionId: number;
  exerciseId: number;
  order: number;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  coachingNotes?: string | null;
  progressionNotes?: string | null;
  regressionNotes?: string | null;
}) {
  const [row] = await db
    .insert(athletePlanExerciseTable)
    .values({
      planSessionId: input.planSessionId,
      exerciseId: input.exerciseId,
      order: input.order,
      sets: input.sets ?? null,
      reps: input.reps ?? null,
      duration: input.duration ?? null,
      restSeconds: input.restSeconds ?? null,
      coachingNotes: input.coachingNotes?.trim() ? input.coachingNotes.trim() : null,
      progressionNotes: input.progressionNotes?.trim() ? input.progressionNotes.trim() : null,
      regressionNotes: input.regressionNotes?.trim() ? input.regressionNotes.trim() : null,
      updatedAt: new Date(),
    })
    .returning();
  return row ?? null;
}

export async function updatePlanExercise(input: {
  id: number;
  order?: number | null;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  coachingNotes?: string | null;
  progressionNotes?: string | null;
  regressionNotes?: string | null;
}) {
  const [row] = await db
    .update(athletePlanExerciseTable)
    .set({
      order: input.order ?? undefined,
      sets: input.sets ?? undefined,
      reps: input.reps ?? undefined,
      duration: input.duration ?? undefined,
      restSeconds: input.restSeconds ?? undefined,
      coachingNotes: input.coachingNotes?.trim ? (input.coachingNotes.trim() || null) : undefined,
      progressionNotes: input.progressionNotes?.trim ? (input.progressionNotes.trim() || null) : undefined,
      regressionNotes: input.regressionNotes?.trim ? (input.regressionNotes.trim() || null) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(athletePlanExerciseTable.id, input.id))
    .returning();
  return row ?? null;
}

export async function deletePlanExercise(planExerciseId: number) {
  return db.transaction(async (tx) => {
    await tx
      .delete(athletePlanExerciseCompletionTable)
      .where(eq(athletePlanExerciseCompletionTable.planExerciseId, planExerciseId));
    const [deleted] = await tx.delete(athletePlanExerciseTable).where(eq(athletePlanExerciseTable.id, planExerciseId)).returning();
    return deleted ?? null;
  });
}

export async function markPlanExerciseComplete(input: { athleteId: number; planExerciseId: number }) {
  const [row] = await db
    .insert(athletePlanExerciseCompletionTable)
    .values({
      athleteId: input.athleteId,
      planExerciseId: input.planExerciseId,
    })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}

export async function unmarkPlanExerciseComplete(input: { athleteId: number; planExerciseId: number }) {
  const [deleted] = await db
    .delete(athletePlanExerciseCompletionTable)
    .where(
      and(
        eq(athletePlanExerciseCompletionTable.athleteId, input.athleteId),
        eq(athletePlanExerciseCompletionTable.planExerciseId, input.planExerciseId),
      ),
    )
    .returning();
  return deleted ?? null;
}

export async function completePlanSession(input: {
  athleteId: number;
  planSessionId: number;
  rpe?: number | null;
  soreness?: number | null;
  fatigue?: number | null;
  notes?: string | null;
}) {
  const [row] = await db
    .insert(athletePlanSessionCompletionTable)
    .values({
      athleteId: input.athleteId,
      planSessionId: input.planSessionId,
      rpe: input.rpe ?? null,
      soreness: input.soreness ?? null,
      fatigue: input.fatigue ?? null,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    })
    .returning();
  return row ?? null;
}

export async function listPlanSessionCompletions(input: {
  athleteId: number;
  limit?: number;
}) {
  const rows = await db
    .select({
      id: athletePlanSessionCompletionTable.id,
      planSessionId: athletePlanSessionCompletionTable.planSessionId,
      rpe: athletePlanSessionCompletionTable.rpe,
      soreness: athletePlanSessionCompletionTable.soreness,
      fatigue: athletePlanSessionCompletionTable.fatigue,
      notes: athletePlanSessionCompletionTable.notes,
      completedAt: athletePlanSessionCompletionTable.completedAt,
      weekNumber: athletePlanSessionTable.weekNumber,
      sessionNumber: athletePlanSessionTable.sessionNumber,
      sessionTitle: athletePlanSessionTable.title,
    })
    .from(athletePlanSessionCompletionTable)
    .innerJoin(
      athletePlanSessionTable,
      eq(athletePlanSessionCompletionTable.planSessionId, athletePlanSessionTable.id),
    )
    .where(eq(athletePlanSessionCompletionTable.athleteId, input.athleteId))
    .orderBy(desc(athletePlanSessionCompletionTable.completedAt))
    .limit(input.limit ?? 50);
  return rows;
}
