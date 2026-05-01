import type { Request, Response } from "express";
import { z } from "zod";
import * as ProgramBuilderService from "../../services/admin/program-builder.service";

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
  return res.status(201).json({ session });
}

export async function updateSession(req: Request, res: Response) {
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const input = sessionSchema.partial().parse(req.body);
  const session = await ProgramBuilderService.updateSession(sessionId, input);
  if (!session) return res.status(404).json({ error: "Session not found." });
  return res.status(200).json({ session });
}

export async function deleteSession(req: Request, res: Response) {
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const session = await ProgramBuilderService.deleteSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found." });
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
    })
    .parse(req.body);
  const exercise = await ProgramBuilderService.updateSessionExercise(id, input);
  if (!exercise) return res.status(404).json({ error: "Session exercise not found." });
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
  const assignment = await ProgramBuilderService.assignProgram({
    athleteId,
    programId,
    assignedBy: req.user!.id,
  });
  return res.status(201).json({ assignment });
}

export async function unassignProgram(req: Request, res: Response) {
  const assignmentId = z.coerce.number().int().min(1).parse(req.params.assignmentId);
  const assignment = await ProgramBuilderService.unassignProgram(assignmentId);
  if (!assignment) return res.status(404).json({ error: "Assignment not found." });
  return res.status(200).json({ assignment });
}

export async function getAthleteDetail(req: Request, res: Response) {
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const athlete = await ProgramBuilderService.getAthleteDetail(athleteId);
  if (!athlete) return res.status(404).json({ error: "Athlete not found." });
  return res.status(200).json({ athlete });
}
