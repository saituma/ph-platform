import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  exerciseTable,
  programAssignmentTable,
  programModuleTable,
  programTable,
  sessionExerciseTable,
  sessionTable,
  ProgramType,
  enrollmentTable,
} from "../../db/schema";

export async function assignEnrollment(input: {
  athleteId: number;
  programType: (typeof ProgramType.enumValues)[number];
  programTemplateId?: number | null;
  assignedByCoach: number;
}) {
  const result = await db
    .insert(enrollmentTable)
    .values({
      athleteId: input.athleteId,
      programType: input.programType,
      status: "active",
      programTemplateId: input.programTemplateId ?? null,
      assignedByCoach: input.assignedByCoach,
    })
    .returning();

  return result[0];
}

export async function createProgramTemplate(input: {
  name: string;
  type: (typeof ProgramType.enumValues)[number];
  description?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  createdBy: number;
}) {
  const result = await db
    .insert(programTable)
    .values({
      name: input.name,
      type: input.type,
      description: input.description ?? null,
      minAge: input.minAge ?? null,
      maxAge: input.maxAge ?? null,
      isTemplate: true,
      createdBy: input.createdBy,
    })
    .returning();

  return result[0];
}

export async function listProgramTemplates(options?: { q?: string; limit?: number }) {
  const q = options?.q?.trim() ?? "";
  const requestedLimit = options?.limit;
  const limit =
    typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
      : 50;
  const conditions = [eq(programTable.isTemplate, true)];
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(programTable.name, pattern),
        sql`${programTable.type}::text ILIKE ${pattern}`,
        ilike(programTable.description, pattern),
        sql`${programTable.id}::text ILIKE ${pattern}`,
      )!,
    );
  }

  return db
    .select()
    .from(programTable)
    .where(and(...conditions))
    .orderBy(desc(programTable.createdAt))
    .limit(limit);
}

export async function updateProgramTemplate(input: {
  programId: number;
  name?: string | null;
  type?: (typeof ProgramType.enumValues)[number] | null;
  description?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
}) {
  const existing = await db.select().from(programTable).where(eq(programTable.id, input.programId)).limit(1);
  if (!existing[0]) {
    throw new Error("Program template not found");
  }
  const [updated] = await db
    .update(programTable)
    .set({
      name: input.name ?? existing[0].name,
      type: input.type ?? existing[0].type,
      description: input.description ?? existing[0].description ?? null,
      minAge: input.minAge ?? existing[0].minAge ?? null,
      maxAge: input.maxAge ?? existing[0].maxAge ?? null,
      updatedAt: new Date(),
    })
    .where(eq(programTable.id, input.programId))
    .returning();
  return updated;
}

export async function deleteProgramTemplate(programId: number) {
  const modules = await db
    .select({ id: programModuleTable.id })
    .from(programModuleTable)
    .where(eq(programModuleTable.programId, programId));

  const sessions = await db
    .select({ id: sessionTable.id })
    .from(sessionTable)
    .where(eq(sessionTable.programId, programId));

  if (sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id);
    await db.delete(sessionExerciseTable).where(inArray(sessionExerciseTable.sessionId, sessionIds));
    await db.delete(sessionTable).where(inArray(sessionTable.id, sessionIds));
  }

  if (modules.length > 0) {
    await db.delete(programModuleTable).where(eq(programModuleTable.programId, programId));
  }

  try {
    await db.delete(programAssignmentTable).where(eq(programAssignmentTable.programId, programId));
  } catch {}

  try {
    await db.delete(enrollmentTable).where(eq(enrollmentTable.programTemplateId, programId));
  } catch {}

  const result = await db.delete(programTable).where(eq(programTable.id, programId)).returning();
  return result[0] ?? null;
}

export async function createExercise(input: {
  name: string;
  category?: string | null;
  cues?: string | null;
  howTo?: string | null;
  progression?: string | null;
  regression?: string | null;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
  videoUrl?: string | null;
}) {
  const result = await db
    .insert(exerciseTable)
    .values({
      name: input.name,
      category: input.category ?? null,
      cues: input.cues ?? null,
      howTo: input.howTo ?? null,
      progression: input.progression ?? null,
      regression: input.regression ?? null,
      sets: input.sets ?? null,
      reps: input.reps ?? null,
      duration: input.duration ?? null,
      restSeconds: input.restSeconds ?? null,
      notes: input.notes ?? null,
      videoUrl: input.videoUrl ?? null,
    })
    .returning();

  return result[0];
}

export async function listExercises() {
  return db.select().from(exerciseTable).orderBy(desc(exerciseTable.createdAt));
}

export async function updateExercise(
  exerciseId: number,
  input: {
    name?: string;
    category?: string | null;
    cues?: string | null;
    howTo?: string | null;
    progression?: string | null;
    regression?: string | null;
    sets?: number | null;
    reps?: number | null;
    duration?: number | null;
    restSeconds?: number | null;
    notes?: string | null;
    videoUrl?: string | null;
  },
) {
  const updatePayload: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.category !== undefined) updatePayload.category = input.category;
  if (input.cues !== undefined) updatePayload.cues = input.cues;
  if (input.howTo !== undefined) updatePayload.howTo = input.howTo;
  if (input.progression !== undefined) updatePayload.progression = input.progression;
  if (input.regression !== undefined) updatePayload.regression = input.regression;
  if (input.sets !== undefined) updatePayload.sets = input.sets;
  if (input.reps !== undefined) updatePayload.reps = input.reps;
  if (input.duration !== undefined) updatePayload.duration = input.duration;
  if (input.restSeconds !== undefined) updatePayload.restSeconds = input.restSeconds;
  if (input.notes !== undefined) updatePayload.notes = input.notes;
  if (input.videoUrl !== undefined) updatePayload.videoUrl = input.videoUrl;

  const updated = await db.update(exerciseTable).set(updatePayload).where(eq(exerciseTable.id, exerciseId)).returning();

  return updated[0] ?? null;
}

export async function deleteExercise(exerciseId: number) {
  const deleted = await db.delete(exerciseTable).where(eq(exerciseTable.id, exerciseId)).returning();

  return deleted[0] ?? null;
}

export async function createSession(input: {
  programId: number;
  weekNumber: number;
  sessionNumber: number;
  type: string;
}) {
  const result = await db
    .insert(sessionTable)
    .values({
      programId: input.programId,
      weekNumber: input.weekNumber,
      sessionNumber: input.sessionNumber,
      type: input.type as any,
    })
    .returning();

  return result[0];
}

export async function addExerciseToSession(input: {
  sessionId: number;
  exerciseId: number;
  order: number;
  coachingNotes?: string | null;
  progressionNotes?: string | null;
  regressionNotes?: string | null;
}) {
  const result = await db
    .insert(sessionExerciseTable)
    .values({
      sessionId: input.sessionId,
      exerciseId: input.exerciseId,
      order: input.order,
      coachingNotes: input.coachingNotes ?? null,
      progressionNotes: input.progressionNotes ?? null,
      regressionNotes: input.regressionNotes ?? null,
    })
    .returning();

  return result[0];
}

export async function deleteSessionExercise(sessionExerciseId: number) {
  const result = await db
    .delete(sessionExerciseTable)
    .where(eq(sessionExerciseTable.id, sessionExerciseId))
    .returning();

  return result[0] ?? null;
}
