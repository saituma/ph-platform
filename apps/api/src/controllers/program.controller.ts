import type { Request, Response } from "express";
import { z } from "zod";

import { getProgramCards, getProgramById, getProgramSessions } from "../services/program.service";

const programIdSchema = z.coerce.number().int().min(1);

export async function listPrograms(req: Request, res: Response) {
  const cards = await getProgramCards(req.user!.id);
  return res.status(200).json({ programs: cards });
}

export async function getProgram(req: Request, res: Response) {
  const programId = programIdSchema.parse(req.params.programId);
  const program = await getProgramById(programId);
  if (!program) {
    return res.status(404).json({ error: "Program not found" });
  }
  return res.status(200).json({ program });
}

export async function getProgramSessionsById(req: Request, res: Response) {
  const programId = programIdSchema.parse(req.params.programId);
  const sessions = await getProgramSessions(programId);
  return res.status(200).json({ sessions });
}
