import { Request, Response } from "express";
import { z } from "zod";

import { ProgramType, sessionType } from "../db/schema";
import {
  createProgramSectionContent,
  deleteProgramSectionContent,
  listProgramSectionContent,
  updateProgramSectionContent,
} from "../services/program-section.service";

const listSchema = z.object({
  sectionType: z.enum(sessionType.enumValues).optional(),
  programTier: z.enum(ProgramType.enumValues).optional(),
});

const createSchema = z.object({
  sectionType: z.enum(sessionType.enumValues),
  programTier: z.enum(ProgramType.enumValues).optional().nullable(),
  title: z.string().min(1),
  body: z.string().min(1),
  videoUrl: z.string().url().optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
});

const updateSchema = z.object({
  sectionType: z.enum(sessionType.enumValues),
  programTier: z.enum(ProgramType.enumValues).optional().nullable(),
  title: z.string().min(1),
  body: z.string().min(1),
  videoUrl: z.string().url().optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
});

export async function listProgramSectionContentHandler(req: Request, res: Response) {
  const input = listSchema.parse(req.query);
  const items = await listProgramSectionContent({
    sectionType: input.sectionType,
    programTier: input.programTier ?? null,
  });
  return res.status(200).json({ items });
}

export async function createProgramSectionContentHandler(req: Request, res: Response) {
  const input = createSchema.parse(req.body);
  const item = await createProgramSectionContent({
    sectionType: input.sectionType,
    programTier: input.programTier ?? null,
    title: input.title,
    body: input.body,
    videoUrl: input.videoUrl ?? null,
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
    title: input.title,
    body: input.body,
    videoUrl: input.videoUrl ?? null,
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
