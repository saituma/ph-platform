import type { Request, Response } from "express";
import { z } from "zod";

import { getAthleteForUser } from "../services/user.service";
import {
  completePlanSession,
  getAthletePremiumPlan,
  markPlanExerciseComplete,
  unmarkPlanExerciseComplete,
} from "../services/athlete-plan.service";

const planListSchema = z.object({
  weekNumber: z.coerce.number().int().min(1).optional(),
});

const sessionCompletionSchema = z.object({
  rpe: z.number().int().min(1).max(10).optional().nullable(),
  soreness: z.number().int().min(0).max(10).optional().nullable(),
  fatigue: z.number().int().min(0).max(10).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function getMyPremiumPlan(req: Request, res: Response) {
  const query = planListSchema.parse(req.query);
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "Onboarding incomplete" });
  }
  const items = await getAthletePremiumPlan({
    athleteId: athlete.id,
    weekNumber: query.weekNumber ?? null,
  });
  return res.status(200).json({ items });
}

export async function completeMyPlanExercise(req: Request, res: Response) {
  const planExerciseId = z.coerce.number().int().min(1).parse(req.params.planExerciseId);
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "Onboarding incomplete" });
  }
  const row = await markPlanExerciseComplete({ athleteId: athlete.id, planExerciseId });
  return res.status(201).json({ item: row });
}

export async function uncompleteMyPlanExercise(req: Request, res: Response) {
  const planExerciseId = z.coerce.number().int().min(1).parse(req.params.planExerciseId);
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "Onboarding incomplete" });
  }
  await unmarkPlanExerciseComplete({ athleteId: athlete.id, planExerciseId });
  return res.status(200).json({ ok: true });
}

export async function completeMyPlanSession(req: Request, res: Response) {
  const planSessionId = z.coerce.number().int().min(1).parse(req.params.planSessionId);
  const input = sessionCompletionSchema.parse(req.body ?? {});
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "Onboarding incomplete" });
  }
  const row = await completePlanSession({
    athleteId: athlete.id,
    planSessionId,
    rpe: input.rpe ?? null,
    soreness: input.soreness ?? null,
    fatigue: input.fatigue ?? null,
    notes: input.notes ?? null,
  });
  return res.status(201).json({ item: row });
}

