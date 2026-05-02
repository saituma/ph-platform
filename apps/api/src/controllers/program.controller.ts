import type { Request, Response } from "express";
import { z } from "zod";

import {
  getExerciseLibrary,
  getMyAssignedPrograms,
  getMyProgramFull,
  getMySessionExercises,
  getProgramAiInsight,
  getProgramByIdForUser,
  getProgramCards,
  getProgramSessions,
} from "../services/program.service";

const programIdSchema = z.coerce.number().int().min(1);

export async function listPrograms(req: Request, res: Response) {
  const cards = await getProgramCards(req.user!.id);
  return res.status(200).json({ programs: cards });
}

export async function getProgram(req: Request, res: Response) {
  const programId = programIdSchema.parse(req.params.programId);
  const program = await getProgramByIdForUser(req.user!.id, programId);
  if (!program) {
    return res.status(404).json({ error: "Program not found" });
  }
  return res.status(200).json({ program });
}

export async function getProgramSessionsById(req: Request, res: Response) {
  const programId = programIdSchema.parse(req.params.programId);
  const program = await getProgramByIdForUser(req.user!.id, programId);
  if (!program) {
    return res.status(404).json({ error: "Program not found" });
  }
  const sessions = await getProgramSessions(programId);
  return res.status(200).json({ sessions });
}

export async function listProgramExercises(_req: Request, res: Response) {
  const exercises = await getExerciseLibrary();
  return res.status(200).json({ exercises });
}

export async function getProgramAiInsightController(req: Request, res: Response) {
  const programId = programIdSchema.parse(req.params.programId);
  const program = await getProgramByIdForUser(req.user!.id, programId);
  if (!program) {
    return res.status(404).json({ error: "Program not found" });
  }
  const insight = await getProgramAiInsight(programId);
  return res.status(200).json({ insight });
}

const sessionIdSchema = z.coerce.number().int().min(1);

export async function listMyAssignedPrograms(req: Request, res: Response) {
  const programs = await getMyAssignedPrograms(req.user!.id);
  return res.status(200).json({ programs });
}

export async function getMyProgramFullController(req: Request, res: Response) {
  const programId = programIdSchema.parse(req.params.programId);
  const program = await getMyProgramFull(req.user!.id, programId);
  if (!program) {
    return res.status(404).json({ error: "Program not found" });
  }
  return res.status(200).json({ program });
}

export async function getMySessionExercisesController(req: Request, res: Response) {
  const sessionId = sessionIdSchema.parse(req.params.sessionId);
  const exercises = await getMySessionExercises(req.user!.id, sessionId);
  if (!exercises) {
    return res.status(404).json({ error: "Session not found" });
  }
  return res.status(200).json({ exercises });
}

export async function getActiveProgramAiInsightController(req: Request, res: Response) {
  const cards = await getProgramCards(req.user!.id);
  const active = cards.find((c) => c.status === "active");
  if (!active || !active.programId) {
    return res.status(404).json({ error: "No active program found" });
  }
  const insight = await getProgramAiInsight(active.programId);
  return res.status(200).json({ insight });
}
