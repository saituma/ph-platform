import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  athleteTable,
  athleteTrainingSessionCompletionTable,
  exerciseTable,
  programAssignmentTable,
  programModuleTable,
  programTable,
  sessionExerciseTable,
  sessionTable,
  userTable,
  videoUploadTable,
} from "../../db/schema";

export async function listModules(programId: number) {
  const modules = await db
    .select({
      id: programModuleTable.id,
      programId: programModuleTable.programId,
      title: programModuleTable.title,
      description: programModuleTable.description,
      order: programModuleTable.order,
      createdAt: programModuleTable.createdAt,
      sessionCount: count(sessionTable.id),
    })
    .from(programModuleTable)
    .leftJoin(sessionTable, eq(sessionTable.moduleId, programModuleTable.id))
    .where(eq(programModuleTable.programId, programId))
    .groupBy(programModuleTable.id)
    .orderBy(asc(programModuleTable.order));

  return modules;
}

export async function createModule(input: {
  programId: number;
  title: string;
  description?: string | null;
  order?: number;
}) {
  const maxOrder = await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${programModuleTable.order}), 0)` })
    .from(programModuleTable)
    .where(eq(programModuleTable.programId, input.programId));

  const order = input.order ?? (maxOrder[0]?.maxOrder ?? 0) + 1;

  const result = await db
    .insert(programModuleTable)
    .values({
      programId: input.programId,
      title: input.title,
      description: input.description ?? null,
      order,
    })
    .returning();

  return result[0];
}

export async function updateModule(
  moduleId: number,
  input: { title?: string; description?: string | null; order?: number },
) {
  const updatePayload: Record<string, any> = { updatedAt: new Date() };
  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.order !== undefined) updatePayload.order = input.order;

  const result = await db
    .update(programModuleTable)
    .set(updatePayload)
    .where(eq(programModuleTable.id, moduleId))
    .returning();

  return result[0] ?? null;
}

export async function deleteModule(moduleId: number) {
  const sessions = await db
    .select({ id: sessionTable.id })
    .from(sessionTable)
    .where(eq(sessionTable.moduleId, moduleId));

  if (sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id);
    await db.delete(sessionExerciseTable).where(inArray(sessionExerciseTable.sessionId, sessionIds));
    await db.delete(sessionTable).where(inArray(sessionTable.id, sessionIds));
  }

  const result = await db
    .delete(programModuleTable)
    .where(eq(programModuleTable.id, moduleId))
    .returning();

  return result[0] ?? null;
}

export async function reorderModules(programId: number, moduleIds: number[]) {
  for (let i = 0; i < moduleIds.length; i++) {
    await db
      .update(programModuleTable)
      .set({ order: i + 1, updatedAt: new Date() })
      .where(and(eq(programModuleTable.id, moduleIds[i]), eq(programModuleTable.programId, programId)));
  }
}

export async function listSessions(moduleId: number) {
  const sessions = await db
    .select({
      id: sessionTable.id,
      programId: sessionTable.programId,
      moduleId: sessionTable.moduleId,
      weekNumber: sessionTable.weekNumber,
      sessionNumber: sessionTable.sessionNumber,
      title: sessionTable.title,
      description: sessionTable.description,
      type: sessionTable.type,
      createdAt: sessionTable.createdAt,
      exerciseCount: count(sessionExerciseTable.id),
    })
    .from(sessionTable)
    .leftJoin(sessionExerciseTable, eq(sessionExerciseTable.sessionId, sessionTable.id))
    .where(eq(sessionTable.moduleId, moduleId))
    .groupBy(sessionTable.id)
    .orderBy(asc(sessionTable.weekNumber), asc(sessionTable.sessionNumber));

  return sessions;
}

export async function createModuleSession(input: {
  programId: number;
  moduleId: number;
  title?: string | null;
  description?: string | null;
  weekNumber: number;
  sessionNumber: number;
  type?: string;
}) {
  const result = await db
    .insert(sessionTable)
    .values({
      programId: input.programId,
      moduleId: input.moduleId,
      weekNumber: input.weekNumber,
      sessionNumber: input.sessionNumber,
      title: input.title ?? null,
      description: input.description ?? null,
      type: (input.type as any) ?? "program",
    })
    .returning();

  return result[0];
}

export async function updateSession(
  sessionId: number,
  input: {
    title?: string | null;
    description?: string | null;
    weekNumber?: number;
    sessionNumber?: number;
    type?: string;
  },
) {
  const updatePayload: Record<string, any> = { updatedAt: new Date() };
  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.weekNumber !== undefined) updatePayload.weekNumber = input.weekNumber;
  if (input.sessionNumber !== undefined) updatePayload.sessionNumber = input.sessionNumber;
  if (input.type !== undefined) updatePayload.type = input.type;

  const result = await db
    .update(sessionTable)
    .set(updatePayload)
    .where(eq(sessionTable.id, sessionId))
    .returning();

  return result[0] ?? null;
}

export async function deleteSession(sessionId: number) {
  await db.delete(sessionExerciseTable).where(eq(sessionExerciseTable.sessionId, sessionId));
  const result = await db.delete(sessionTable).where(eq(sessionTable.id, sessionId)).returning();
  return result[0] ?? null;
}

export async function listSessionExercises(sessionId: number) {
  return db
    .select({
      id: sessionExerciseTable.id,
      sessionId: sessionExerciseTable.sessionId,
      exerciseId: sessionExerciseTable.exerciseId,
      order: sessionExerciseTable.order,
      coachingNotes: sessionExerciseTable.coachingNotes,
      progressionNotes: sessionExerciseTable.progressionNotes,
      regressionNotes: sessionExerciseTable.regressionNotes,
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
        progression: exerciseTable.progression,
        regression: exerciseTable.regression,
        notes: exerciseTable.notes,
      },
    })
    .from(sessionExerciseTable)
    .innerJoin(exerciseTable, eq(exerciseTable.id, sessionExerciseTable.exerciseId))
    .where(eq(sessionExerciseTable.sessionId, sessionId))
    .orderBy(asc(sessionExerciseTable.order));
}

export async function updateSessionExercise(
  id: number,
  input: {
    order?: number;
    coachingNotes?: string | null;
    progressionNotes?: string | null;
    regressionNotes?: string | null;
  },
) {
  const updatePayload: Record<string, any> = { updatedAt: new Date() };
  if (input.order !== undefined) updatePayload.order = input.order;
  if (input.coachingNotes !== undefined) updatePayload.coachingNotes = input.coachingNotes;
  if (input.progressionNotes !== undefined) updatePayload.progressionNotes = input.progressionNotes;
  if (input.regressionNotes !== undefined) updatePayload.regressionNotes = input.regressionNotes;

  const result = await db
    .update(sessionExerciseTable)
    .set(updatePayload)
    .where(eq(sessionExerciseTable.id, id))
    .returning();

  return result[0] ?? null;
}

export async function reorderSessionExercises(sessionId: number, ids: number[]) {
  for (let i = 0; i < ids.length; i++) {
    await db
      .update(sessionExerciseTable)
      .set({ order: i + 1, updatedAt: new Date() })
      .where(and(eq(sessionExerciseTable.id, ids[i]), eq(sessionExerciseTable.sessionId, sessionId)));
  }
}

export async function getFullProgram(programId: number) {
  const program = await db.select().from(programTable).where(eq(programTable.id, programId)).limit(1);
  if (!program[0]) return null;

  const modules = await listModules(programId);

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

export async function listAdultAthletes() {
  const athletes = await db
    .select({
      id: athleteTable.id,
      userId: athleteTable.userId,
      name: athleteTable.name,
      age: athleteTable.age,
      athleteType: athleteTable.athleteType,
      currentProgramTier: athleteTable.currentProgramTier,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(userTable.id, athleteTable.userId))
    .where(and(eq(athleteTable.athleteType, "adult"), eq(userTable.isDeleted, false)))
    .orderBy(asc(athleteTable.name));

  const athleteIds = athletes.map((a) => a.id);
  let assignments: any[] = [];
  if (athleteIds.length > 0) {
    try {
      assignments = await db
        .select({
          id: programAssignmentTable.id,
          athleteId: programAssignmentTable.athleteId,
          programId: programAssignmentTable.programId,
          status: programAssignmentTable.status,
          programName: programTable.name,
          programType: programTable.type,
        })
        .from(programAssignmentTable)
        .innerJoin(programTable, eq(programTable.id, programAssignmentTable.programId))
        .where(inArray(programAssignmentTable.athleteId, athleteIds));
    } catch {
      // table may not exist yet if migration hasn't run
    }
  }

  const assignmentsByAthlete = new Map<number, any[]>();
  for (const a of assignments) {
    const list = assignmentsByAthlete.get(a.athleteId) ?? [];
    list.push(a);
    assignmentsByAthlete.set(a.athleteId, list);
  }

  return athletes.map((a) => ({
    ...a,
    assignments: assignmentsByAthlete.get(a.id) ?? [],
  }));
}

export async function assignProgram(input: {
  athleteId: number;
  programId: number;
  assignedBy: number;
}) {
  const result = await db
    .insert(programAssignmentTable)
    .values({
      athleteId: input.athleteId,
      programId: input.programId,
      assignedBy: input.assignedBy,
      status: "active",
    })
    .returning();

  return result[0];
}

export async function unassignProgram(assignmentId: number) {
  const result = await db
    .delete(programAssignmentTable)
    .where(eq(programAssignmentTable.id, assignmentId))
    .returning();

  return result[0] ?? null;
}

export async function getAthleteDetail(athleteId: number) {
  const [athlete] = await db
    .select({
      id: athleteTable.id,
      userId: athleteTable.userId,
      name: athleteTable.name,
      age: athleteTable.age,
      athleteType: athleteTable.athleteType,
      currentProgramTier: athleteTable.currentProgramTier,
    })
    .from(athleteTable)
    .where(eq(athleteTable.id, athleteId))
    .limit(1);

  if (!athlete) return null;

  const assignments = await db
    .select({
      id: programAssignmentTable.id,
      programId: programAssignmentTable.programId,
      programName: programTable.name,
      programType: programTable.type,
      status: programAssignmentTable.status,
      createdAt: programAssignmentTable.createdAt,
    })
    .from(programAssignmentTable)
    .innerJoin(programTable, eq(programTable.id, programAssignmentTable.programId))
    .where(eq(programAssignmentTable.athleteId, athleteId))
    .orderBy(desc(programAssignmentTable.createdAt));

  const [{ completionCount }] = await db
    .select({ completionCount: count() })
    .from(athleteTrainingSessionCompletionTable)
    .where(eq(athleteTrainingSessionCompletionTable.athleteId, athleteId));

  const videoUploads = await db
    .select({
      id: videoUploadTable.id,
      videoUrl: videoUploadTable.videoUrl,
      notes: videoUploadTable.notes,
      feedback: videoUploadTable.feedback,
      reviewedAt: videoUploadTable.reviewedAt,
      createdAt: videoUploadTable.createdAt,
    })
    .from(videoUploadTable)
    .where(eq(videoUploadTable.athleteId, athleteId))
    .orderBy(desc(videoUploadTable.createdAt))
    .limit(20);

  return {
    ...athlete,
    assignments,
    sessionCompletionCount: Number(completionCount),
    videoUploads,
  };
}
