import type { Request, Response } from "express";
import { z } from "zod";

import { setProgramSessionCoachResponse } from "../../services/program.service";
import { getSocketServer } from "../../socket-hub";

const paramsSchema = z.object({
  completionId: z.coerce.number().int().min(1),
});

const bodySchema = z.object({
  coachResponse: z.string().trim().min(1).max(5000),
});

export async function setCoachResponseAdmin(req: Request, res: Response) {
  const { completionId } = paramsSchema.parse(req.params);
  const { coachResponse } = bodySchema.parse(req.body ?? {});

  const updated = await setProgramSessionCoachResponse({
    completionId,
    coachResponse,
  });

  if (!updated) {
    return res.status(404).json({ error: "Program session completion not found" });
  }

  if (updated.athleteUserId) {
    const io = getSocketServer();
    if (io) {
      io.to(`user:${updated.athleteUserId}`).emit("program:session:coach-response", {
        completionId: updated.id,
        sessionId: updated.sessionId,
        coachResponse: updated.coachResponse,
        coachResponseAt: updated.coachResponseAt,
      });
    }
  }

  return res.status(200).json({ item: updated });
}
