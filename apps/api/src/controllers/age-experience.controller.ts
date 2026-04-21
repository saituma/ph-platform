import type { Request, Response } from "express";
import { z } from "zod";

import {
  createAgeExperienceRule,
  deleteAgeExperienceRule,
  getAgeExperienceForUser,
  listAgeExperienceRules,
  updateAgeExperienceRule,
} from "../services/age-experience.service";

const allowedUiPresets = ["playful", "standard", "performance"] as const;
const allowedFontSizes = ["small", "default", "large", "extraLarge"] as const;
const allowedDensities = ["compact", "default", "spacious"] as const;

const ruleBaseSchema = z.object({
  title: z.string().min(1),
  minAge: z.number().int().min(5).optional().nullable(),
  maxAge: z.number().int().min(5).optional().nullable(),
  isDefault: z.boolean().optional(),
  uiPreset: z.enum(allowedUiPresets).optional(),
  fontSizeOption: z.enum(allowedFontSizes).optional(),
  density: z.enum(allowedDensities).optional(),
  hiddenSections: z.array(z.string().min(1)).optional(),
});

const ruleSchema = ruleBaseSchema.refine(
  (data) => {
    if (data.minAge == null || data.maxAge == null) return true;
    return data.minAge <= data.maxAge;
  },
  { message: "Minimum age cannot exceed maximum age.", path: ["minAge"] },
);

const ruleUpdateSchema = ruleBaseSchema.partial().refine(
  (data) => {
    if (data.minAge == null || data.maxAge == null) return true;
    return data.minAge <= data.maxAge;
  },
  { message: "Minimum age cannot exceed maximum age.", path: ["minAge"] },
);

export async function listAgeExperience(req: Request, res: Response) {
  const items = await listAgeExperienceRules();
  return res.status(200).json({ items });
}

export async function createAgeExperience(req: Request, res: Response) {
  const parsed = ruleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const input = parsed.data;
  const item = await createAgeExperienceRule({
    title: input.title,
    minAge: input.minAge ?? null,
    maxAge: input.maxAge ?? null,
    isDefault: input.isDefault ?? false,
    uiPreset: input.uiPreset ?? "standard",
    fontSizeOption: input.fontSizeOption ?? "default",
    density: input.density ?? "default",
    hiddenSections: input.hiddenSections ?? null,
    createdBy: req.user!.id,
  });
  return res.status(200).json({ item });
}

export async function updateAgeExperience(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const parsed = ruleUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const input = parsed.data;
  const item = await updateAgeExperienceRule({
    id,
    title: input.title ?? null,
    minAge: input.minAge ?? null,
    maxAge: input.maxAge ?? null,
    isDefault: input.isDefault ?? null,
    uiPreset: input.uiPreset ?? null,
    fontSizeOption: input.fontSizeOption ?? null,
    density: input.density ?? null,
    hiddenSections: input.hiddenSections ?? null,
    updatedBy: req.user!.id,
  });
  if (!item) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.status(200).json({ item });
}

export async function deleteAgeExperience(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const item = await deleteAgeExperienceRule(id);
  if (!item) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.status(200).json({ item });
}

export async function getAgeExperience(req: Request, res: Response) {
  const item = await getAgeExperienceForUser(req.user!.id);
  return res.status(200).json({ item });
}
