import type { Request, Response } from "express";
import { z } from "zod";

import {
  getOnboardingAthleteDetail,
  listIncompleteOnboardingAthletes,
} from "../../services/admin/onboarding-review.service";

const incompleteQuerySchema = z.object({
  q: z.string().trim().optional(),
  athleteType: z.enum(["all", "youth", "adult", "team"]).optional(),
  teamId: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function listIncomplete(req: Request, res: Response) {
  const query = incompleteQuerySchema.parse(req.query ?? {});
  const result = await listIncompleteOnboardingAthletes({
    q: query.q ?? null,
    athleteType: query.athleteType ?? "all",
    teamId: query.teamId ?? null,
    limit: query.limit ?? 100,
    offset: query.offset ?? 0,
    viewerUserId: req.user!.id,
    viewerRole: req.user!.role,
  });
  return res.status(200).json(result);
}

export async function getAthleteDetail(req: Request, res: Response) {
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const detail = await getOnboardingAthleteDetail({
    athleteId,
    viewerUserId: req.user!.id,
    viewerRole: req.user!.role,
  });
  if (!detail) {
    return res.status(404).json({
      code: "ONBOARDING_ATHLETE_NOT_FOUND",
      error: "Onboarding athlete not found.",
    });
  }
  return res.status(200).json(detail);
}
