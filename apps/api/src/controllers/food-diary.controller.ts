import type { Request, Response } from "express";
import { z } from "zod";

import { createFoodDiaryEntry, listFoodDiaryEntries, listFoodDiaryForGuardian } from "../services/food-diary.service";
import { getGuardianAndAthlete } from "../services/user.service";
import { normalizeDate } from "../lib/age";

const mealsSchema = z.union([z.array(z.any()), z.record(z.any())]).optional();

const createFoodDiarySchema = z.object({
  date: z.string().optional(),
  meals: mealsSchema,
  notes: z.string().max(500).optional(),
  quantity: z.number().int().min(0).optional(),
  photoUrl: z
    .string()
    .transform((val) => val?.trim() || "")
    .refine((val) => val === "" || z.string().url().safeParse(val).success, {
      message: "Invalid URL format",
    })
    .refine((val) => !val.startsWith("data:"), {
      message: "Use a URL instead of base64 data.",
    })
    .optional(),
});

export async function listFoodDiary(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.user.role !== "guardian") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { guardian } = await getGuardianAndAthlete(req.user.id);
  if (!guardian) {
    return res.status(404).json({ error: "Guardian profile not found" });
  }
  const items = await listFoodDiaryForGuardian(guardian.id);
  return res.status(200).json({ items });
}

export async function createFoodDiary(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.user.role !== "guardian") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const input = createFoodDiarySchema.parse(req.body);
  const { guardian, athlete } = await getGuardianAndAthlete(req.user.id);
  if (!guardian || !athlete) {
    return res.status(404).json({ error: "Guardian profile not found" });
  }
  const parsedDate = input.date ? normalizeDate(input.date) : null;
  const entry = await createFoodDiaryEntry({
    athleteId: athlete.id,
    guardianId: guardian.id,
    date: parsedDate ?? new Date(),
    meals: input.meals ?? null,
    notes: input.notes ?? null,
    quantity: input.quantity ?? null,
    photoUrl: input.photoUrl || null,
  });
  return res.status(201).json({ item: entry });
}

export async function listFoodDiaryAdmin(req: Request, res: Response) {
  const athleteRaw = req.query.athleteId ? Number(req.query.athleteId) : undefined;
  const guardianRaw = req.query.guardianId ? Number(req.query.guardianId) : undefined;
  const athleteId = athleteRaw && Number.isFinite(athleteRaw) ? athleteRaw : undefined;
  const guardianId = guardianRaw && Number.isFinite(guardianRaw) ? guardianRaw : undefined;
  const items = await listFoodDiaryEntries({ athleteId, guardianId });
  return res.status(200).json({ items });
}
