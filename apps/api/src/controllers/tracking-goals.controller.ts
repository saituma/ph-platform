import { type Request, type Response } from "express";
import { z } from "zod";
import * as GoalService from "../services/tracking-goals.service";
import { getAthleteForUser } from "../services/user.service";

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  unit: z.enum(["km", "sec", "min", "reps", "custom"]),
  customUnit: z.string().max(50).optional(),
  targetValue: z.coerce.number().positive(),
  scope: z.enum(["all", "individual"]),
  athleteId: z.coerce.number().int().min(1).optional(),
  audience: z.enum(["adult", "premium_team", "all"]),
  teamId: z.coerce.number().int().min(1).optional(),
  dueDate: z.string().optional(),
});

export async function listGoals(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : "active";
  const goals = await GoalService.listGoals({ status });
  return res.status(200).json({ goals });
}

export async function createGoal(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
  }
  const goal = await GoalService.createGoal({
    ...parsed.data,
    coachId: req.user!.id,
  });
  return res.status(201).json({ goal });
}

export async function updateGoal(req: Request, res: Response) {
  const id = z.coerce.number().int().min(1).parse(req.params.id);
  const data = z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(500).optional(),
    targetValue: z.coerce.number().positive().optional(),
    dueDate: z.string().optional(),
    status: z.enum(["active", "archived"]).optional(),
  }).parse(req.body);
  const goal = await GoalService.updateGoal(id, data);
  if (!goal) return res.status(404).json({ error: "Goal not found" });
  return res.status(200).json({ goal });
}

export async function deleteGoal(req: Request, res: Response) {
  const id = z.coerce.number().int().min(1).parse(req.params.id);
  const goal = await GoalService.deleteGoal(id);
  if (!goal) return res.status(404).json({ error: "Goal not found" });
  return res.status(200).json({ goal });
}

export async function listGoalsForAthlete(req: Request, res: Response) {
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) return res.status(200).json({ goals: [] });
  const goals = await GoalService.listGoalsForAthlete({
    athleteId: athlete.id,
    athleteType: athlete.athleteType as "youth" | "adult",
    teamId: athlete.teamId ?? null,
  });
  return res.status(200).json({ goals });
}
