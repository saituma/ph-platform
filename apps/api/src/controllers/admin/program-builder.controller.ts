import type { Request, Response } from "express";
import { z } from "zod";
import * as ProgramBuilderService from "../../services/admin/program-builder.service";
import { db } from "../../db";
import { athleteTable, guardianTable, notificationTable, programTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import { createPushIntent } from "../../services/outbox.service";
import { getSocketServer } from "../../socket-hub";
import { cache, cacheKeys } from "../../lib/cache";

function broadcastProgramChanged() {
  const io = getSocketServer();
  if (io) io.emit("program:changed", {});
}

const moduleSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(500).optional().nullable(),
  order: z.number().int().min(1).optional(),
});

const sessionSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  weekNumber: z.number().int().min(1),
  sessionNumber: z.number().int().min(1),
  type: z.string().optional(),
});

export async function getFullProgram(req: Request, res: Response) {
  const programId = z.coerce.number().int().min(1).parse(req.params.programId);
  const program = await ProgramBuilderService.getFullProgram(programId);
  if (!program) return res.status(404).json({ error: "Program not found." });
  return res.status(200).json({ program });
}

export async function listModules(req: Request, res: Response) {
  const programId = z.coerce.number().int().min(1).parse(req.params.programId);
  const modules = await ProgramBuilderService.listModules(programId);
  return res.status(200).json({ modules });
}

export async function createModule(req: Request, res: Response) {
  const programId = z.coerce.number().int().min(1).parse(req.params.programId);
  const input = moduleSchema.parse(req.body);
  const module = await ProgramBuilderService.createModule({
    programId,
    title: input.title,
    description: input.description ?? null,
    order: input.order,
  });
  return res.status(201).json({ module });
}

export async function updateModule(req: Request, res: Response) {
  const moduleId = z.coerce.number().int().min(1).parse(req.params.moduleId);
  const input = moduleSchema.partial().parse(req.body);
  const module = await ProgramBuilderService.updateModule(moduleId, input);
  if (!module) return res.status(404).json({ error: "Module not found." });
  return res.status(200).json({ module });
}

export async function deleteModule(req: Request, res: Response) {
  const moduleId = z.coerce.number().int().min(1).parse(req.params.moduleId);
  const module = await ProgramBuilderService.deleteModule(moduleId);
  if (!module) return res.status(404).json({ error: "Module not found." });
  return res.status(200).json({ module });
}

export async function reorderModules(req: Request, res: Response) {
  const programId = z.coerce.number().int().min(1).parse(req.params.programId);
  const { moduleIds } = z.object({ moduleIds: z.array(z.number().int().min(1)) }).parse(req.body);
  await ProgramBuilderService.reorderModules(programId, moduleIds);
  return res.status(200).json({ ok: true });
}

export async function listSessions(req: Request, res: Response) {
  const moduleId = z.coerce.number().int().min(1).parse(req.params.moduleId);
  const sessions = await ProgramBuilderService.listSessions(moduleId);
  return res.status(200).json({ sessions });
}

export async function createSession(req: Request, res: Response) {
  const programId = z.coerce.number().int().min(1).parse(req.params.programId);
  const moduleId = z.coerce.number().int().min(1).parse(req.params.moduleId);
  const input = sessionSchema.parse(req.body);
  const session = await ProgramBuilderService.createModuleSession({
    programId,
    moduleId,
    title: input.title ?? null,
    description: input.description ?? null,
    weekNumber: input.weekNumber,
    sessionNumber: input.sessionNumber,
    type: input.type,
  });
  broadcastProgramChanged();
  return res.status(201).json({ session });
}

export async function updateSession(req: Request, res: Response) {
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const input = sessionSchema.partial().parse(req.body);
  const session = await ProgramBuilderService.updateSession(sessionId, input);
  if (!session) return res.status(404).json({ error: "Session not found." });
  broadcastProgramChanged();
  return res.status(200).json({ session });
}

export async function deleteSession(req: Request, res: Response) {
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const session = await ProgramBuilderService.deleteSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found." });
  broadcastProgramChanged();
  return res.status(200).json({ session });
}

export async function listSessionExercises(req: Request, res: Response) {
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const exercises = await ProgramBuilderService.listSessionExercises(sessionId);
  return res.status(200).json({ exercises });
}

export async function updateSessionExercise(req: Request, res: Response) {
  const id = z.coerce.number().int().min(1).parse(req.params.id);
  const input = z
    .object({
      order: z.number().int().min(1).optional(),
      coachingNotes: z.string().max(500).optional().nullable(),
      progressionNotes: z.string().max(500).optional().nullable(),
      regressionNotes: z.string().max(500).optional().nullable(),
      setsOverride: z.number().int().min(1).optional().nullable(),
      repsOverride: z.number().int().min(1).optional().nullable(),
      durationOverride: z.number().int().min(1).optional().nullable(),
      restSecondsOverride: z.number().int().min(1).optional().nullable(),
    })
    .parse(req.body);
  const exercise = await ProgramBuilderService.updateSessionExercise(id, input);
  if (!exercise) return res.status(404).json({ error: "Session exercise not found." });
  broadcastProgramChanged();
  return res.status(200).json({ exercise });
}

export async function reorderSessionExercises(req: Request, res: Response) {
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const { ids } = z.object({ ids: z.array(z.number().int().min(1)) }).parse(req.body);
  await ProgramBuilderService.reorderSessionExercises(sessionId, ids);
  return res.status(200).json({ ok: true });
}

export async function listAdultAthletes(_req: Request, res: Response) {
  const athletes = await ProgramBuilderService.listAdultAthletes();
  return res.status(200).json({ athletes });
}

export async function assignProgram(req: Request, res: Response) {
  const programId = z.coerce.number().int().min(1).parse(req.params.programId);
  const { athleteId } = z.object({ athleteId: z.number().int().min(1) }).parse(req.body);
  try {
    const assignment = await ProgramBuilderService.assignProgram({
      athleteId,
      programId,
      assignedBy: req.user!.id,
    });

    const [athlete] = await db
      .select({
        athleteUserId: athleteTable.userId,
        athleteName: athleteTable.name,
        guardianUserId: guardianTable.userId,
      })
      .from(athleteTable)
      .leftJoin(guardianTable, eq(guardianTable.id, athleteTable.guardianId))
      .where(eq(athleteTable.id, athleteId))
      .limit(1);

    const [program] = await db
      .select({ name: programTable.name })
      .from(programTable)
      .where(eq(programTable.id, programId))
      .limit(1);

    const recipients = new Set<number>();
    if (athlete?.athleteUserId) recipients.add(athlete.athleteUserId);
    if (athlete?.guardianUserId) recipients.add(athlete.guardianUserId);
    const programName = program?.name ?? "a training program";
    const content = `You were assigned ${programName}`;
    const link = "/portal/programs";

    if (recipients.size > 0) {
      await db.insert(notificationTable).values(
        Array.from(recipients).map((userId) => ({
          userId,
          type: "program-assigned",
          content,
          link,
        })),
      );

      for (const userId of recipients) {
        void createPushIntent({
          userId,
          title: "New program assigned",
          body: content,
          data: {
            type: "program_assigned",
            athleteId,
            athleteName: athlete?.athleteName ?? null,
            programId,
            programName,
            assignmentId: assignment.id,
            url: link,
          },
        });
      }

      const io = getSocketServer();
      if (io) {
        for (const userId of recipients) {
          io.to(`user:${userId}`).emit("program:assigned", {
            assignmentId: assignment.id,
            athleteId,
            athleteUserId: athlete?.athleteUserId ?? null,
            athleteName: athlete?.athleteName ?? null,
            programId,
            programName,
            link,
            createdAt: assignment.createdAt ?? new Date().toISOString(),
          });
          io.to(`user:${userId}`).emit("notification:new", {
            type: "program-assigned",
            content,
            link,
          });
        }
      }
    }
    // Invalidate assigned-programs cache for all affected user IDs
    for (const userId of recipients) {
      void cache.del(cacheKeys.assignedPrograms(userId));
      void cache.del(cacheKeys.programsList(userId));
    }
    return res.status(201).json({ assignment });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("not found") || msg.includes("Not found")) {
      return res.status(404).json({ error: msg });
    }
    const code = (err as any)?.code;
    if (code === "23505" || msg.includes("unique") || msg.includes("duplicate")) {
      return res.status(409).json({ error: "Already assigned" });
    }
    throw err;
  }
}

export async function unassignProgram(req: Request, res: Response) {
  const assignmentId = z.coerce.number().int().min(1).parse(req.params.assignmentId);
  const assignment = await ProgramBuilderService.unassignProgram(assignmentId);
  if (!assignment) return res.status(404).json({ error: "Assignment not found." });
  // Invalidate cache for the affected user — look up from assignment if possible
  if ((assignment as any).athleteUserId) {
    void cache.del(cacheKeys.assignedPrograms((assignment as any).athleteUserId));
    void cache.del(cacheKeys.programsList((assignment as any).athleteUserId));
  }
  return res.status(200).json({ assignment });
}

export async function updateAssignment(req: Request, res: Response) {
  const assignmentId = z.coerce.number().int().min(1).parse(req.params.assignmentId);
  const body = z.object({
    scheduledDate: z.string().nullable().optional(),
  }).parse(req.body);

  const assignment = await ProgramBuilderService.updateAssignment(assignmentId, {
    scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
  });
  if (!assignment) return res.status(404).json({ error: "Assignment not found." });
  return res.status(200).json({ assignment });
}

export async function listScheduledAssignments(_req: Request, res: Response) {
  const items = await ProgramBuilderService.listScheduledAssignments();
  return res.status(200).json({ items });
}

export async function getAthleteDetail(req: Request, res: Response) {
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  try {
    const athlete = await ProgramBuilderService.getAthleteDetail(athleteId);
    if (!athlete) return res.status(404).json({ error: "Athlete not found." });
    return res.status(200).json({ athlete });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("not found") || msg.includes("Not found")) {
      return res.status(404).json({ error: msg });
    }
    throw err;
  }
}

// --- Standalone Session Library ---

export async function listLibrarySessions(_req: Request, res: Response) {
  const sessions = await ProgramBuilderService.listLibrarySessions();
  return res.status(200).json({ sessions });
}

export async function createStandaloneLibrarySession(req: Request, res: Response) {
  const input = sessionSchema.partial().parse(req.body);
  const session = await ProgramBuilderService.createStandaloneLibrarySession({
    title: input.title ?? null,
    description: input.description ?? null,
    weekNumber: input.weekNumber ?? 1,
    sessionNumber: input.sessionNumber ?? 1,
    type: input.type,
  });
  return res.status(201).json({ session });
}

export async function copySessionToModule(req: Request, res: Response) {
  const moduleId = z.coerce.number().int().min(1).parse(req.params.moduleId);
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const { programId } = z.object({ programId: z.number().int().min(1).optional() }).parse(req.body);
  try {
    const session = await ProgramBuilderService.copySessionToModule(sessionId, moduleId, programId ?? null);
    broadcastProgramChanged();
    return res.status(201).json({ session });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("not found")) return res.status(404).json({ error: msg });
    throw err;
  }
}

export async function listTeamSessions(req: Request, res: Response) {
  const teamId = z.coerce.number().int().min(1).parse(req.params.teamId);
  const sessions = await ProgramBuilderService.listTeamSessions(teamId);
  return res.status(200).json({ sessions });
}

export async function copySessionToTeam(req: Request, res: Response) {
  const teamId = z.coerce.number().int().min(1).parse(req.params.teamId);
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  try {
    const session = await ProgramBuilderService.copySessionToTeam(sessionId, teamId);
    return res.status(201).json({ session });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("not found")) return res.status(404).json({ error: msg });
    throw err;
  }
}

export async function deleteTeamSession(req: Request, res: Response) {
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const session = await ProgramBuilderService.deleteSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found." });
  return res.status(200).json({ session });
}

// --- Module Library ---

export async function listLibraryModules(_req: Request, res: Response) {
  const modules = await ProgramBuilderService.listLibraryModules();
  return res.status(200).json({ modules });
}

export async function createLibraryModule(req: Request, res: Response) {
  const input = moduleSchema.parse(req.body);
  const module = await ProgramBuilderService.createLibraryModule({
    title: input.title,
    description: input.description ?? null,
  });
  return res.status(201).json({ module });
}

export async function createLibrarySession(req: Request, res: Response) {
  const moduleId = z.coerce.number().int().min(1).parse(req.params.moduleId);
  const input = sessionSchema.parse(req.body);
  const session = await ProgramBuilderService.createLibraryModuleSession({
    moduleId,
    title: input.title ?? null,
    description: input.description ?? null,
    weekNumber: input.weekNumber,
    sessionNumber: input.sessionNumber,
    type: input.type,
  });
  return res.status(201).json({ session });
}

export async function copyModuleToProgram(req: Request, res: Response) {
  const programId = z.coerce.number().int().min(1).parse(req.params.programId);
  const moduleId = z.coerce.number().int().min(1).parse(req.params.moduleId);
  try {
    const module = await ProgramBuilderService.copyModuleToProgram(moduleId, programId);
    broadcastProgramChanged();
    return res.status(201).json({ module });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("not found")) return res.status(404).json({ error: msg });
    throw err;
  }
}
