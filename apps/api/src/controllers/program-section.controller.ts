import { Request, Response } from "express";
import { z } from "zod";

import { ProgramType, sessionType } from "../db/schema";
import {
  createProgramSectionContent,
  getProgramSectionContentById,
  deleteProgramSectionContent,
  listProgramSectionContent,
  updateProgramSectionContent,
} from "../services/program-section.service";
import { getAthleteForUser } from "../services/user.service";
import { calculateAge, normalizeDate } from "../lib/age";

function resolveAgeFromAthlete(row: any) {
  if (!row) return null;
  const birthDate = normalizeDate(row.birthDate);
  if (birthDate) {
    return calculateAge(birthDate);
  }
  return row.age ?? null;
}

const listSchema = z.object({
  sectionType: z.enum(sessionType.enumValues).optional(),
  programTier: z.enum(ProgramType.enumValues).optional(),
  age: z.coerce.number().int().optional(),
});

const exerciseMetadataSchema = z.object({
  sets: z.number().int().min(0).optional().nullable(),
  reps: z.number().int().min(0).optional().nullable(),
  duration: z.number().int().min(0).optional().nullable(),
  restSeconds: z.number().int().min(0).optional().nullable(),
  cues: z.string().optional().nullable(),
  progression: z.string().optional().nullable(),
  regression: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  equipment: z.string().optional().nullable(),
}).optional().nullable();

const createSchema = z.object({
  sectionType: z.enum(sessionType.enumValues),
  programTier: z.enum(ProgramType.enumValues).optional().nullable(),
  ageList: z.array(z.number().int().min(0)).optional().nullable(),
  title: z.string().min(1),
  body: z.string().min(1),
  videoUrl: z.string().optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
  metadata: exerciseMetadataSchema,
});

const updateSchema = z.object({
  sectionType: z.enum(sessionType.enumValues),
  programTier: z.enum(ProgramType.enumValues).optional().nullable(),
  ageList: z.array(z.number().int().min(0)).optional().nullable(),
  title: z.string().min(1),
  body: z.string().min(1),
  videoUrl: z.string().optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
  metadata: exerciseMetadataSchema,
});

export async function listProgramSectionContentHandler(req: Request, res: Response) {
  const input = listSchema.parse(req.query);
  
  let age = Number.isFinite(input.age) ? input.age! : null;
  
  // If age not provided in query, try to resolve it from the user (athlete or guardian's active athlete)
  // HOWEVER: If user is admin/coach/superAdmin, we WANT them to see everything in the admin lib by default.
  // The mobile app (athlete/guardian) will either pass age or it will be resolved here.
  const isAdmin = req.user && ["admin", "superAdmin", "coach"].includes(req.user.role);

  if (!isAdmin && age === null && req.user) {
    const athlete = await getAthleteForUser(req.user.id);
    age = resolveAgeFromAthlete(athlete);
  }

  const items = await listProgramSectionContent({
    sectionType: input.sectionType,
    programTier: input.programTier ?? null,
    age: age,
    bypassAgeFilter: isAdmin,
  });
  return res.status(200).json({ items });
}

export async function getProgramSectionContentHandler(req: Request, res: Response) {
  const id = z.coerce.number().int().min(1).parse(req.params.contentId);
  const item = await getProgramSectionContentById(id);
  if (!item) {
    return res.status(404).json({ error: "Content not found" });
  }
  return res.status(200).json({ item });
}

export async function createProgramSectionContentHandler(req: Request, res: Response) {
  const input = createSchema.parse(req.body);
  const item = await createProgramSectionContent({
    sectionType: input.sectionType,
    programTier: input.programTier ?? null,
    ageList: input.ageList ?? null,
    title: input.title,
    body: input.body,
    videoUrl: input.videoUrl ?? null,
    metadata: input.metadata ?? null,
    order: input.order ?? null,
    createdBy: req.user!.id,
  });
  return res.status(201).json({ item });
}

export async function updateProgramSectionContentHandler(req: Request, res: Response) {
  const id = z.coerce.number().int().min(1).parse(req.params.contentId);
  const input = updateSchema.parse(req.body);
  const item = await updateProgramSectionContent({
    id,
    sectionType: input.sectionType,
    programTier: input.programTier ?? null,
    ageList: input.ageList ?? null,
    title: input.title,
    body: input.body,
    videoUrl: input.videoUrl ?? null,
    metadata: input.metadata ?? null,
    order: input.order ?? null,
  });
  if (!item) {
    return res.status(404).json({ error: "Content not found" });
  }
  return res.status(200).json({ item });
}

export async function deleteProgramSectionContentHandler(req: Request, res: Response) {
  const id = z.coerce.number().int().min(1).parse(req.params.contentId);
  const item = await deleteProgramSectionContent(id);
  if (!item) {
    return res.status(404).json({ error: "Content not found" });
  }
  return res.status(200).json({ item });
}
