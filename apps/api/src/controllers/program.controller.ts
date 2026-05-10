import type { Request, Response } from "express";
import { z } from "zod";

import {
  completeMySession,
  getExerciseLibrary,
  getMyAssignedPrograms,
  getMyProgramFull,
  getMySessionCompletion,
  getMySessionExercises,
  getProgramAiInsight,
  getProgramByIdForUser,
  getProgramCards,
  getProgramSessions,
} from "../services/program.service";
import { getSocketServer } from "../socket-hub";
import { cache, cacheKeys } from "../lib/cache";

const programIdSchema = z.coerce.number().int().min(1);

export async function listPrograms(req: Request, res: Response) {
  const userId = req.user!.id;
  const cards = await cache.getOrSet(cacheKeys.programsList(userId), 120, () => getProgramCards(userId));
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
  const userId = req.user!.id;
  const programs = await cache.getOrSet(cacheKeys.assignedPrograms(userId), 60, () => getMyAssignedPrograms(userId));
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

export async function getMySessionCompletionController(req: Request, res: Response) {
  try {
    const sessionId = sessionIdSchema.parse(req.params.sessionId);
    const completion = await getMySessionCompletion(req.user!.id, sessionId);
    return res.status(200).json({ completion });
  } catch (err: any) {
    console.error("[getMySessionCompletion] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function completeMySessionController(req: Request, res: Response) {
  try {
    const sessionId = sessionIdSchema.parse(req.params.sessionId);
    const feedback = req.body ?? {};
    const result = await completeMySession(req.user!.id, sessionId, {
      videoUrl: typeof feedback.videoUrl === "string" ? feedback.videoUrl.trim() || null : null,
      weightsUsed: typeof feedback.weightsUsed === "string" ? feedback.weightsUsed.trim() || null : null,
      repsCompleted: typeof feedback.repsCompleted === "string" ? feedback.repsCompleted.trim() || null : null,
      rpe: typeof feedback.rpe === "number" && feedback.rpe >= 1 && feedback.rpe <= 10 ? feedback.rpe : null,
    });
    if (!result) {
      return res.status(404).json({ error: "Session not found or not assigned" });
    }
    if (feedback.videoUrl) {
      const io = getSocketServer();
      if (io) {
        io.to("admin:all").emit("program:session:submitted", {
          sessionId,
          athleteUserId: req.user!.id,
          videoUrl: feedback.videoUrl,
        });
      }
    }
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("[completeMySession] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
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
