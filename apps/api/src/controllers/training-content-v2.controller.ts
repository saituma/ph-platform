import { Request, Response } from "express";
import { z } from "zod";

import { trainingOtherType, trainingSessionBlockType } from "../db/schema";
import {
  createTrainingAudience,
  createTrainingModule,
  createTrainingModuleSession,
  createTrainingOtherContent,
  createTrainingSessionItem,
  copyTrainingModulesFromAudience,
  deleteTrainingModule,
  deleteTrainingModuleSession,
  deleteTrainingOtherContent,
  deleteTrainingSessionItem,
  finishTrainingModuleSession,
  getTrainingContentMobileWorkspace,
  listTrainingAudiences,
  listTrainingContentAdminWorkspace,
  updateTrainingModule,
  updateTrainingModuleSession,
  updateTrainingOtherContent,
  updateTrainingSessionItem,
} from "../services/training-content-v2.service";
import { getAthleteForUser } from "../services/user.service";

const audienceQuerySchema = z.object({
  audienceLabel: z.string().min(1).max(64),
});

const metadataSchema = z
  .object({
    sets: z.number().int().min(0).optional().nullable(),
    reps: z.number().int().min(0).optional().nullable(),
    duration: z.number().int().min(0).optional().nullable(),
    restSeconds: z.number().int().min(0).optional().nullable(),
    steps: z.string().optional().nullable(),
    cues: z.string().optional().nullable(),
    progression: z.string().optional().nullable(),
    regression: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    equipment: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

const createModuleSchema = z.object({
  audienceLabel: z.string().min(1).max(64),
  title: z.string().min(1).max(255),
  order: z.number().int().min(1).optional().nullable(),
});

const createAudienceSchema = z.object({
  label: z.string().min(1).max(64),
});

const copyAudienceModulesSchema = z.object({
  sourceAudienceLabel: z.string().min(1).max(64),
  targetAudienceLabel: z.string().min(1).max(64),
});

const updateModuleSchema = z.object({
  title: z.string().min(1).max(255),
  order: z.number().int().min(1).optional().nullable(),
});

const createSessionSchema = z.object({
  moduleId: z.number().int().min(1),
  title: z.string().min(1).max(255),
  dayLength: z.number().int().min(1).max(365),
  order: z.number().int().min(1).optional().nullable(),
});

const updateSessionSchema = z.object({
  title: z.string().min(1).max(255),
  dayLength: z.number().int().min(1).max(365),
  order: z.number().int().min(1).optional().nullable(),
});

const createItemSchema = z.object({
  sessionId: z.number().int().min(1),
  blockType: z.enum(trainingSessionBlockType.enumValues),
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  videoUrl: z.string().optional().nullable(),
  allowVideoUpload: z.boolean().optional().nullable(),
  metadata: metadataSchema,
  order: z.number().int().min(1).optional().nullable(),
});

const updateItemSchema = z.object({
  blockType: z.enum(trainingSessionBlockType.enumValues),
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  videoUrl: z.string().optional().nullable(),
  allowVideoUpload: z.boolean().optional().nullable(),
  metadata: metadataSchema,
  order: z.number().int().min(1).optional().nullable(),
});

const createOtherSchema = z.object({
  audienceLabel: z.string().min(1).max(64),
  type: z.enum(trainingOtherType.enumValues),
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  scheduleNote: z.string().max(255).optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
});

const updateOtherSchema = z.object({
  type: z.enum(trainingOtherType.enumValues),
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  scheduleNote: z.string().max(255).optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
});

const mobileAgeQuerySchema = z.object({
  age: z.coerce.number().int().min(1).max(100),
});

export async function listTrainingAudiencesHandler(_req: Request, res: Response) {
  const items = await listTrainingAudiences();
  return res.status(200).json({ items });
}

export async function createTrainingAudienceHandler(req: Request, res: Response) {
  const input = createAudienceSchema.parse(req.body);
  const item = await createTrainingAudience({
    label: input.label,
    createdBy: req.user!.id,
  });
  return res.status(201).json({ item });
}

export async function copyTrainingModulesFromAudienceHandler(req: Request, res: Response) {
  const input = copyAudienceModulesSchema.parse(req.body);
  const workspace = await copyTrainingModulesFromAudience({
    sourceAudienceLabel: input.sourceAudienceLabel,
    targetAudienceLabel: input.targetAudienceLabel,
    createdBy: req.user!.id,
  });
  return res.status(200).json(workspace);
}

export async function getTrainingContentAdminWorkspaceHandler(req: Request, res: Response) {
  const { audienceLabel } = audienceQuerySchema.parse(req.query);
  const workspace = await listTrainingContentAdminWorkspace(audienceLabel);
  return res.status(200).json(workspace);
}

export async function getTrainingContentMobileWorkspaceHandler(req: Request, res: Response) {
  const parsed = mobileAgeQuerySchema.safeParse(req.query);
  const athlete = req.user ? await getAthleteForUser(req.user.id) : null;
  const age = parsed.success ? parsed.data.age : athlete?.age ?? null;
  if (!age) {
    return res.status(200).json({ age: null, tabs: ["Modules"], modules: [], others: [] });
  }
  const workspace = await getTrainingContentMobileWorkspace({
    age,
    athleteId: athlete?.id ?? null,
  });
  return res.status(200).json(workspace);
}

export async function createTrainingModuleHandler(req: Request, res: Response) {
  const input = createModuleSchema.parse(req.body);
  const item = await createTrainingModule({
    audienceLabel: input.audienceLabel,
    title: input.title,
    order: input.order ?? null,
    createdBy: req.user!.id,
  });
  return res.status(201).json({ item });
}

export async function updateTrainingModuleHandler(req: Request, res: Response) {
  const moduleId = z.coerce.number().int().min(1).parse(req.params.moduleId);
  const input = updateModuleSchema.parse(req.body);
  const item = await updateTrainingModule({
    id: moduleId,
    title: input.title,
    order: input.order ?? null,
  });
  if (!item) {
    return res.status(404).json({ error: "Module not found" });
  }
  return res.status(200).json({ item });
}

export async function deleteTrainingModuleHandler(req: Request, res: Response) {
  const moduleId = z.coerce.number().int().min(1).parse(req.params.moduleId);
  const item = await deleteTrainingModule(moduleId);
  if (!item) {
    return res.status(404).json({ error: "Module not found" });
  }
  return res.status(200).json({ item });
}

export async function createTrainingSessionHandler(req: Request, res: Response) {
  const input = createSessionSchema.parse(req.body);
  const item = await createTrainingModuleSession(input);
  return res.status(201).json({ item });
}

export async function updateTrainingSessionHandler(req: Request, res: Response) {
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const input = updateSessionSchema.parse(req.body);
  const item = await updateTrainingModuleSession({
    id: sessionId,
    title: input.title,
    dayLength: input.dayLength,
    order: input.order ?? null,
  });
  if (!item) {
    return res.status(404).json({ error: "Session not found" });
  }
  return res.status(200).json({ item });
}

export async function deleteTrainingSessionHandler(req: Request, res: Response) {
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const item = await deleteTrainingModuleSession(sessionId);
  if (!item) {
    return res.status(404).json({ error: "Session not found" });
  }
  return res.status(200).json({ item });
}

export async function createTrainingSessionItemHandler(req: Request, res: Response) {
  const input = createItemSchema.parse(req.body);
  const item = await createTrainingSessionItem({
    ...input,
    createdBy: req.user!.id,
  });
  return res.status(201).json({ item });
}

export async function updateTrainingSessionItemHandler(req: Request, res: Response) {
  const itemId = z.coerce.number().int().min(1).parse(req.params.itemId);
  const input = updateItemSchema.parse(req.body);
  const item = await updateTrainingSessionItem({
    id: itemId,
    ...input,
  });
  if (!item) {
    return res.status(404).json({ error: "Session item not found" });
  }
  return res.status(200).json({ item });
}

export async function deleteTrainingSessionItemHandler(req: Request, res: Response) {
  const itemId = z.coerce.number().int().min(1).parse(req.params.itemId);
  const item = await deleteTrainingSessionItem(itemId);
  if (!item) {
    return res.status(404).json({ error: "Session item not found" });
  }
  return res.status(200).json({ item });
}

export async function createTrainingOtherContentHandler(req: Request, res: Response) {
  const input = createOtherSchema.parse(req.body);
  const item = await createTrainingOtherContent({
    ...input,
    createdBy: req.user!.id,
  });
  return res.status(201).json({ item });
}

export async function updateTrainingOtherContentHandler(req: Request, res: Response) {
  const otherId = z.coerce.number().int().min(1).parse(req.params.otherId);
  const input = updateOtherSchema.parse(req.body);
  const item = await updateTrainingOtherContent({
    id: otherId,
    ...input,
  });
  if (!item) {
    return res.status(404).json({ error: "Other content not found" });
  }
  return res.status(200).json({ item });
}

export async function deleteTrainingOtherContentHandler(req: Request, res: Response) {
  const otherId = z.coerce.number().int().min(1).parse(req.params.otherId);
  const item = await deleteTrainingOtherContent(otherId);
  if (!item) {
    return res.status(404).json({ error: "Other content not found" });
  }
  return res.status(200).json({ item });
}

export async function finishTrainingSessionHandler(req: Request, res: Response) {
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "Onboarding incomplete" });
  }
  const item = await finishTrainingModuleSession({
    athleteId: athlete.id,
    sessionId,
  });
  return res.status(201).json({ item });
}
