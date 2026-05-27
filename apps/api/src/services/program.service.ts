import { and, asc, count, desc, eq, inArray, or } from "drizzle-orm";

import { db } from "../db";
import {
  athleteTable,
  enrollmentTable,
  exerciseTable,
  programAssignmentTable,
  programModuleTable,
  programSessionCompletionTable,
  programTable,
  sessionExerciseTable,
  sessionTable,
  teamTable,
  videoUploadTable,
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
  const programs = await db.select().from(programTable).orderBy(desc(programTable.updatedAt)).limit(200);
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
      .map((se) => {
        const baseExercise = exercises.find((e) => e.id === se.exerciseId) ?? null;
        const rc = se.runConfig as { runType?: string; surface?: string } | null;
        const runMeta = rc ? [rc.runType, rc.surface].filter(Boolean).join(" · ") : null;
        const isRun = baseExercise?.category === "cardio_run" || !!se.runConfig;
        return {
          ...se,
          allowVideoUpload: isRun,
          exercise: baseExercise
            ? {
                ...baseExercise,
                sets: se.setsOverride ?? baseExercise.sets,
                reps: se.repsOverride ?? baseExercise.reps,
                duration: se.durationOverride ?? baseExercise.duration,
                restSeconds: se.restSecondsOverride ?? baseExercise.restSeconds,
                category: runMeta ? `${baseExercise.category ?? "cardio_run"} · ${runMeta}` : baseExercise.category,
              }
            : null,
        };
      })
      .sort((a, b) => a.order - b.order);

    return { ...session, exercises: items };
  });
}

export async function getExerciseLibrary() {
  return db.select().from(exerciseTable).orderBy(desc(exerciseTable.updatedAt)).limit(500);
}

export async function getMyAssignedPrograms(userId: number) {
  const athlete = await getAthleteForUser(userId);
  if (!athlete) return [];

  const assignments = await db
    .select({
      programId: programAssignmentTable.programId,
      status: programAssignmentTable.status,
      scheduledDate: programAssignmentTable.scheduledDate,
    })
    .from(programAssignmentTable)
    .where(eq(programAssignmentTable.athleteId, athlete.id));

  const programIds = assignments.map((a) => a.programId);
  const programs =
    programIds.length > 0
      ? await db
          .select({
            id: programTable.id,
            name: programTable.name,
            description: programTable.description,
            moduleCount: count(programModuleTable.id),
          })
          .from(programTable)
          .leftJoin(programModuleTable, eq(programModuleTable.programId, programTable.id))
          .where(inArray(programTable.id, programIds))
          .groupBy(programTable.id)
      : [];

  const result: Array<{
    id: number;
    name: string;
    description: string | null;
    moduleCount: number;
    status: string;
    scheduledDate: Date | string | null;
    kind: "program" | "team";
    teamId?: number;
  }> = programs.map((p) => {
    const assignment = assignments.find((a) => a.programId === p.id);
    return {
      ...p,
      status: assignment?.status ?? "active",
      scheduledDate: assignment?.scheduledDate ?? null,
      kind: "program" as const,
    };
  });

  // Append synthetic "Team Sessions" entry if the athlete is on a team with sessions
  if (athlete.teamId) {
    const [teamRow] = await db
      .select({ id: teamTable.id, name: teamTable.name })
      .from(teamTable)
      .where(eq(teamTable.id, athlete.teamId))
      .limit(1);

    if (teamRow) {
      const [teamSessionCount] = await db
        .select({ c: count(sessionTable.id) })
        .from(sessionTable)
        .where(eq(sessionTable.teamId, athlete.teamId));

      if ((teamSessionCount?.c ?? 0) > 0) {
        result.push({
          id: -athlete.teamId,
          name: `${teamRow.name} Sessions`,
          description: "Training sessions from your team coach.",
          moduleCount: 1,
          status: "active",
          scheduledDate: null,
          kind: "team",
          teamId: athlete.teamId,
        });
      }
    }
  }

  return result;
}

export async function getMyProgramFull(userId: number, programId: number) {
  const athlete = await getAthleteForUser(userId);
  if (!athlete) return null;

  const [assignment] = await db
    .select({ id: programAssignmentTable.id })
    .from(programAssignmentTable)
    .where(and(eq(programAssignmentTable.athleteId, athlete.id), eq(programAssignmentTable.programId, programId)))
    .limit(1);
  if (!assignment) return null;

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
    const rawSessions = await db
      .select({
        id: sessionTable.id,
        moduleId: sessionTable.moduleId,
        weekNumber: sessionTable.weekNumber,
        sessionNumber: sessionTable.sessionNumber,
        title: sessionTable.title,
        description: sessionTable.description,
        type: sessionTable.type,
        sourceLibrarySessionId: sessionTable.sourceLibrarySessionId,
        exerciseCount: count(sessionExerciseTable.id),
      })
      .from(sessionTable)
      .leftJoin(sessionExerciseTable, eq(sessionExerciseTable.sessionId, sessionTable.id))
      .where(inArray(sessionTable.moduleId, moduleIds))
      .groupBy(sessionTable.id)
      .orderBy(asc(sessionTable.weekNumber), asc(sessionTable.sessionNumber));

    // For linked sessions resolve title and exerciseCount from the library source
    const linkedIds = rawSessions.map((s) => s.sourceLibrarySessionId).filter(Boolean) as number[];
    if (linkedIds.length > 0) {
      const libSessions = await db
        .select({
          id: sessionTable.id,
          title: sessionTable.title,
          exerciseCount: count(sessionExerciseTable.id),
        })
        .from(sessionTable)
        .leftJoin(sessionExerciseTable, eq(sessionExerciseTable.sessionId, sessionTable.id))
        .where(inArray(sessionTable.id, linkedIds))
        .groupBy(sessionTable.id);
      const libMap = new Map(libSessions.map((s) => [s.id, s]));
      sessions = rawSessions.map((s) => {
        if (!s.sourceLibrarySessionId) return s;
        const src = libMap.get(s.sourceLibrarySessionId);
        if (!src) return s;
        return { ...s, title: src.title ?? s.title, exerciseCount: src.exerciseCount };
      });
    } else {
      sessions = rawSessions;
    }
  }

  const sessionsByModule = new Map<number, any[]>();
  for (const s of sessions) {
    const list = sessionsByModule.get(s.moduleId!) ?? [];
    list.push(s);
    sessionsByModule.set(s.moduleId!, list);
  }

  const completionRows = await db
    .select({ sessionId: programSessionCompletionTable.sessionId })
    .from(programSessionCompletionTable)
    .where(eq(programSessionCompletionTable.athleteId, athlete.id));
  const completedSet = new Set(completionRows.map((r) => r.sessionId));

  let priorModuleComplete = true;
  const lockedModules = modules.map((m) => {
    const moduleLocked = !priorModuleComplete;
    let priorSessionComplete = true;
    const moduleSessions = (sessionsByModule.get(m.id) ?? []).map((s) => {
      const completed = completedSet.has(s.id);
      const locked = moduleLocked || !priorSessionComplete;
      if (!completed) priorSessionComplete = false;
      return { ...s, completed, locked };
    });
    const moduleCompleted = moduleSessions.length > 0 && moduleSessions.every((s) => s.completed);
    if (!moduleCompleted) priorModuleComplete = false;
    return { ...m, completed: moduleCompleted, locked: moduleLocked, sessions: moduleSessions };
  });

  return {
    ...program[0],
    modules: lockedModules,
  };
}

export async function getMyTeamSessionsAsProgram(userId: number, teamId: number) {
  const athlete = await getAthleteForUser(userId);
  if (!athlete || athlete.teamId !== teamId) return null;

  const [teamRow] = await db
    .select({ id: teamTable.id, name: teamTable.name })
    .from(teamTable)
    .where(eq(teamTable.id, teamId))
    .limit(1);
  if (!teamRow) return null;

  const rawTeamSessions = await db
    .select({
      id: sessionTable.id,
      moduleId: sessionTable.moduleId,
      weekNumber: sessionTable.weekNumber,
      sessionNumber: sessionTable.sessionNumber,
      title: sessionTable.title,
      description: sessionTable.description,
      type: sessionTable.type,
      sourceLibrarySessionId: sessionTable.sourceLibrarySessionId,
      exerciseCount: count(sessionExerciseTable.id),
    })
    .from(sessionTable)
    .leftJoin(sessionExerciseTable, eq(sessionExerciseTable.sessionId, sessionTable.id))
    .where(eq(sessionTable.teamId, teamId))
    .groupBy(sessionTable.id)
    .orderBy(asc(sessionTable.weekNumber), asc(sessionTable.sessionNumber));

  const linkedTeamIds = rawTeamSessions.map((s) => s.sourceLibrarySessionId).filter(Boolean) as number[];
  let sessions: any[] = rawTeamSessions;
  if (linkedTeamIds.length > 0) {
    const libSessions = await db
      .select({ id: sessionTable.id, title: sessionTable.title, exerciseCount: count(sessionExerciseTable.id) })
      .from(sessionTable)
      .leftJoin(sessionExerciseTable, eq(sessionExerciseTable.sessionId, sessionTable.id))
      .where(inArray(sessionTable.id, linkedTeamIds))
      .groupBy(sessionTable.id);
    const libMap = new Map(libSessions.map((s) => [s.id, s]));
    sessions = rawTeamSessions.map((s) => {
      if (!s.sourceLibrarySessionId) return s;
      const src = libMap.get(s.sourceLibrarySessionId);
      if (!src) return s;
      return { ...s, title: src.title ?? s.title, exerciseCount: src.exerciseCount };
    });
  }

  return {
    id: -teamId,
    name: `${teamRow.name} Sessions`,
    description: "Training sessions from your team coach.",
    kind: "team",
    modules: [
      {
        id: -teamId,
        title: "Sessions",
        description: null as string | null,
        order: 1,
        sessionCount: sessions.length,
        sessions,
      },
    ],
  };
}

export async function getMySessionExercises(userId: number, sessionId: number) {
  const athlete = await getAthleteForUser(userId);
  if (!athlete) return null;

  const session = await db.select().from(sessionTable).where(eq(sessionTable.id, sessionId)).limit(1);
  if (!session[0]) return null;

  if (session[0].teamId != null) {
    // Team session — allow if the athlete is on this team
    if (athlete.teamId !== session[0].teamId) return null;
  } else if (session[0].moduleId) {
    const [mod] = await db
      .select({ programId: programModuleTable.programId })
      .from(programModuleTable)
      .where(eq(programModuleTable.id, session[0].moduleId))
      .limit(1);
    if (mod?.programId) {
      const [assignment] = await db
        .select({ id: programAssignmentTable.id })
        .from(programAssignmentTable)
        .where(
          and(eq(programAssignmentTable.athleteId, athlete.id), eq(programAssignmentTable.programId, mod.programId)),
        )
        .limit(1);
      if (!assignment) return null;
    }
  }

  // Resolve exercises from library source if this session is linked
  const effectiveSessionId = session[0].sourceLibrarySessionId ?? sessionId;

  const rows = await db
    .select({
      id: sessionExerciseTable.id,
      sessionId: sessionExerciseTable.sessionId,
      exerciseId: sessionExerciseTable.exerciseId,
      order: sessionExerciseTable.order,
      coachingNotes: sessionExerciseTable.coachingNotes,
      progressionNotes: sessionExerciseTable.progressionNotes,
      regressionNotes: sessionExerciseTable.regressionNotes,
      runConfig: sessionExerciseTable.runConfig,
      setsOverride: sessionExerciseTable.setsOverride,
      repsOverride: sessionExerciseTable.repsOverride,
      durationOverride: sessionExerciseTable.durationOverride,
      restSecondsOverride: sessionExerciseTable.restSecondsOverride,
      exercise: {
        id: exerciseTable.id,
        name: exerciseTable.name,
        category: exerciseTable.category,
        sets: exerciseTable.sets,
        reps: exerciseTable.reps,
        duration: exerciseTable.duration,
        restSeconds: exerciseTable.restSeconds,
        videoUrl: exerciseTable.videoUrl,
        posterUrl: exerciseTable.posterUrl,
        durationSec: exerciseTable.durationSec,
        videoMuted: exerciseTable.videoMuted,
        cues: exerciseTable.cues,
        howTo: exerciseTable.howTo,
        notes: exerciseTable.notes,
      },
    })
    .from(sessionExerciseTable)
    .innerJoin(exerciseTable, eq(exerciseTable.id, sessionExerciseTable.exerciseId))
    .where(eq(sessionExerciseTable.sessionId, effectiveSessionId))
    .orderBy(asc(sessionExerciseTable.order));

  if (!rows.length) return rows;

  const exerciseIds = rows.map((r) => r.id);
  const uploads = await db
    .select({
      id: videoUploadTable.id,
      sessionExerciseId: videoUploadTable.sessionExerciseId,
      videoUrl: videoUploadTable.videoUrl,
      posterUrl: videoUploadTable.posterUrl,
      durationSec: videoUploadTable.durationSec,
      feedback: videoUploadTable.feedback,
      coachVideoUrl: videoUploadTable.coachVideoUrl,
      coachVideoPosterUrl: videoUploadTable.coachVideoPosterUrl,
      reviewedAt: videoUploadTable.reviewedAt,
      createdAt: videoUploadTable.createdAt,
    })
    .from(videoUploadTable)
    .where(and(eq(videoUploadTable.athleteId, athlete.id), inArray(videoUploadTable.sessionExerciseId, exerciseIds)))
    .orderBy(desc(videoUploadTable.createdAt));

  const uploadByExercise = new Map<number, (typeof uploads)[number]>();
  for (const u of uploads) {
    if (u.sessionExerciseId != null && !uploadByExercise.has(u.sessionExerciseId)) {
      uploadByExercise.set(u.sessionExerciseId, u);
    }
  }

  return rows.map((row) => {
    const upload = uploadByExercise.get(row.id);
    const rc = row.runConfig as { runType?: string; surface?: string } | null;
    const runMeta = rc ? [rc.runType, rc.surface].filter(Boolean).join(" · ") : null;
    const isRun = row.exercise.category === "cardio_run" || !!row.runConfig;
    return {
      ...row,
      allowVideoUpload: isRun,
      exercise: {
        ...row.exercise,
        sets: row.setsOverride ?? row.exercise.sets,
        reps: row.repsOverride ?? row.exercise.reps,
        duration: row.durationOverride ?? row.exercise.duration,
        restSeconds: row.restSecondsOverride ?? row.exercise.restSeconds,
        category: runMeta ? `${row.exercise.category ?? "cardio_run"} · ${runMeta}` : row.exercise.category,
      },
      videoUpload: upload
        ? {
            id: upload.id,
            videoUrl: upload.videoUrl,
            posterUrl: upload.posterUrl,
            durationSec: upload.durationSec,
            feedback: upload.feedback,
            coachVideoUrl: upload.coachVideoUrl,
            coachVideoPosterUrl: upload.coachVideoPosterUrl,
            reviewedAt: upload.reviewedAt ? upload.reviewedAt.toISOString() : null,
          }
        : null,
    };
  });
}

export async function completeMySession(
  userId: number,
  sessionId: number,
  feedback?: {
    videoUrl?: string | null;
    weightsUsed?: string | null;
    repsCompleted?: string | null;
    rpe?: number | null;
  },
) {
  const athlete = await getAthleteForUser(userId);
  if (!athlete) return null;

  const [session] = await db.select().from(sessionTable).where(eq(sessionTable.id, sessionId)).limit(1);
  if (!session) return null;

  if (session.teamId != null) {
    // Team session — allow if the athlete is on this team
    if (athlete.teamId !== session.teamId) return null;
  } else if (session.moduleId) {
    const [mod] = await db
      .select({ programId: programModuleTable.programId })
      .from(programModuleTable)
      .where(eq(programModuleTable.id, session.moduleId))
      .limit(1);
    if (mod?.programId) {
      const [assignment] = await db
        .select({ id: programAssignmentTable.id })
        .from(programAssignmentTable)
        .where(
          and(eq(programAssignmentTable.athleteId, athlete.id), eq(programAssignmentTable.programId, mod.programId)),
        )
        .limit(1);
      if (!assignment) return null;
    }
  }

  await db
    .insert(programSessionCompletionTable)
    .values({
      athleteId: athlete.id,
      sessionId,
      videoUrl: feedback?.videoUrl ?? null,
      weightsUsed: feedback?.weightsUsed ?? null,
      repsCompleted: feedback?.repsCompleted ?? null,
      rpe: feedback?.rpe ?? null,
    })
    .onConflictDoNothing();

  let next = null;
  if (session.moduleId && session.programId != null) {
    const nextSession = await db
      .select({ id: sessionTable.id, title: sessionTable.title, sessionNumber: sessionTable.sessionNumber })
      .from(sessionTable)
      .where(and(eq(sessionTable.moduleId, session.moduleId), eq(sessionTable.programId, session.programId)))
      .orderBy(asc(sessionTable.weekNumber), asc(sessionTable.sessionNumber));

    const currentIdx = nextSession.findIndex((s) => s.id === sessionId);
    next = currentIdx >= 0 && currentIdx < nextSession.length - 1 ? nextSession[currentIdx + 1] : null;
  }

  return { completed: true, nextSession: next };
}

export async function getMySessionCompletion(userId: number, sessionId: number) {
  const athlete = await getAthleteForUser(userId);
  if (!athlete) return null;

  const [completion] = await db
    .select({
      id: programSessionCompletionTable.id,
      videoUrl: programSessionCompletionTable.videoUrl,
      weightsUsed: programSessionCompletionTable.weightsUsed,
      repsCompleted: programSessionCompletionTable.repsCompleted,
      rpe: programSessionCompletionTable.rpe,
      coachResponse: programSessionCompletionTable.coachResponse,
      coachResponseAt: programSessionCompletionTable.coachResponseAt,
      completedAt: programSessionCompletionTable.completedAt,
    })
    .from(programSessionCompletionTable)
    .where(
      and(
        eq(programSessionCompletionTable.athleteId, athlete.id),
        eq(programSessionCompletionTable.sessionId, sessionId),
      ),
    )
    .limit(1);

  return completion ?? null;
}

export async function setProgramSessionCoachResponse(input: { completionId: number; coachResponse: string }) {
  const [updated] = await db
    .update(programSessionCompletionTable)
    .set({
      coachResponse: input.coachResponse,
      coachResponseAt: new Date(),
    })
    .where(eq(programSessionCompletionTable.id, input.completionId))
    .returning({
      id: programSessionCompletionTable.id,
      athleteId: programSessionCompletionTable.athleteId,
      sessionId: programSessionCompletionTable.sessionId,
      coachResponse: programSessionCompletionTable.coachResponse,
      coachResponseAt: programSessionCompletionTable.coachResponseAt,
    });

  if (!updated) return null;

  const [athlete] = await db
    .select({ userId: athleteTable.userId })
    .from(athleteTable)
    .where(eq(athleteTable.id, updated.athleteId))
    .limit(1);

  return {
    ...updated,
    athleteUserId: athlete?.userId ?? null,
  };
}

export async function getProgramAiInsight(programId: number) {
  const program = await getProgramById(programId);
  if (!program) return null;

  const { generateContentSummary } = await import("./ai.service");
  const ageGroup = program.minAge || program.maxAge ? `U${program.maxAge ?? program.minAge}` : "All Ages";

  return generateContentSummary(program.name, program.description || "", ageGroup);
}
