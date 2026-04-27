import { Request, Response } from "express";
import { z } from "zod";

import { ProgramType, trainingOtherType, trainingSessionBlockType } from "../db/schema";
import {
  createTrainingAudience,
  createTrainingModule,
  createTrainingModuleSession,
  createTrainingOtherContent,
  createTrainingSessionItem,
  cleanupTrainingPlaceholderModules,
  copyTrainingModulesFromAudience,
  copySelectedModulesToAudience,
  deleteTrainingModule,
  deleteTrainingModuleSession,
  deleteTrainingOtherContent,
  deleteTrainingSessionItem,
  finishTrainingModuleSessionWithLog,
  getTrainingContentMobileWorkouts,
  getTrainingContentMobileWorkspace,
  listTrainingAudiences,
  listTrainingContentAdminWorkspace,
  updateTrainingSessionTierLocks,
  updateTrainingModuleTierLocks,
  unlockTrainingModuleTierLocks,
  updateTrainingModule,
  updateTrainingModuleSession,
  updateTrainingOtherContent,
  updateTrainingOtherTypeSetting,
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

const copySelectedModulesSchema = z.object({
  sourceAudienceLabel: z.string().min(1).max(64),
  targetAudienceLabel: z.string().min(1).max(64),
  moduleIds: z.array(z.number().int()),
  sessionIds: z.array(z.number().int()).nullable().optional(),
});

const updateModuleSchema = z.object({
  title: z.string().min(1).max(255),
  order: z.number().int().min(1).optional().nullable(),
});

const updateModuleTierLocksSchema = z.object({
  audienceLabel: z.string().min(1).max(64),
  moduleId: z.number().int().min(1).optional().nullable(),
  programTiers: z.array(z.enum(ProgramType.enumValues)).min(1),
});

const unlockModuleTierLocksSchema = z.object({
  audienceLabel: z.string().min(1).max(64),
  throughModuleId: z.number().int().min(1),
  programTiers: z.array(z.enum(ProgramType.enumValues)).min(1),
});

const cleanupPlaceholderModulesSchema = z.object({
  audienceLabel: z.string().min(1).max(64),
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

const updateSessionTierLocksSchema = z.object({
  moduleId: z.number().int().min(1),
  sessionId: z.number().int().min(1).optional().nullable(),
  programTiers: z.array(z.enum(ProgramType.enumValues)).min(1),
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

const updateOtherSettingSchema = z.object({
  audienceLabel: z.string().min(1).max(64),
  type: z.enum(trainingOtherType.enumValues),
  enabled: z.boolean(),
});

const mobileAgeQuerySchema = z.object({
  age: z.coerce.number().int().min(1).max(100),
});

const finishTrainingSessionBodySchema = z
  .object({
    weightsUsed: z.string().max(2000).optional().nullable(),
    repsCompleted: z.string().max(2000).optional().nullable(),
    rpe: z.coerce.number().int().min(1).max(10).optional().nullable(),
  })
  .strict();

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

export async function copySelectedModulesToAudienceHandler(req: Request, res: Response) {
  const input = copySelectedModulesSchema.parse(req.body);
  const workspace = await copySelectedModulesToAudience({
    sourceAudienceLabel: input.sourceAudienceLabel,
    targetAudienceLabel: input.targetAudienceLabel,
    moduleIds: input.moduleIds,
    sessionIds: input.sessionIds ?? null,
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
  try {
    const parsed = mobileAgeQuerySchema.safeParse(req.query);
    const athlete = req.user ? await getAthleteForUser(req.user.id) : null;
    const age = parsed.success ? parsed.data.age : (athlete?.age ?? null);
    if (!age) {
      return res.status(200).json({ age: null, tabs: ["Modules"], modules: [], others: [] });
    }
    const workspace = await getTrainingContentMobileWorkspace({
      age,
      athleteId: athlete?.id ?? null,
      programTier: athlete?.currentProgramTier ?? null,
      team: athlete?.team ?? null,
    });
    return res.status(200).json(workspace);
  } catch (error) {
    console.error("[training-content-v2/mobile] failed", {
      userId: req.user?.id ?? null,
      query: req.query,
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(200).json({ age: null, tabs: ["Modules"], modules: [], others: [] });
  }
}

export async function getTrainingContentMobileWorkoutsHandler(req: Request, res: Response) {
  try {
    const parsed = mobileAgeQuerySchema.safeParse(req.query);
    const athlete = req.user ? await getAthleteForUser(req.user.id) : null;
    const age = parsed.success ? parsed.data.age : (athlete?.age ?? null);
    if (!athlete || !age) {
      return res.status(200).json({
        generatedAt: new Date().toISOString(),
        nextWorkoutSessionId: null,
        completedCount: 0,
        totalCount: 0,
        workouts: [],
      });
    }

    const payload = await getTrainingContentMobileWorkouts({
      age,
      athleteId: athlete.id,
      programTier: athlete.currentProgramTier ?? null,
      team: athlete.team ?? null,
    });
    return res.status(200).json(payload);
  } catch (error) {
    console.error("[training-content-v2/mobile/workouts] failed", {
      userId: req.user?.id ?? null,
      query: req.query,
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      nextWorkoutSessionId: null,
      completedCount: 0,
      totalCount: 0,
      workouts: [],
    });
  }
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

export async function updateTrainingModuleTierLocksHandler(req: Request, res: Response) {
  const input = updateModuleTierLocksSchema.parse(req.body);
  const workspace = await updateTrainingModuleTierLocks({
    audienceLabel: input.audienceLabel,
    moduleId: input.moduleId ?? null,
    programTiers: input.programTiers,
    createdBy: req.user!.id,
  });
  return res.status(200).json(workspace);
}

export async function unlockTrainingModuleTierLocksHandler(req: Request, res: Response) {
  const input = unlockModuleTierLocksSchema.parse(req.body);
  const workspace = await unlockTrainingModuleTierLocks({
    audienceLabel: input.audienceLabel,
    throughModuleId: input.throughModuleId,
    programTiers: input.programTiers,
    createdBy: req.user!.id,
  });
  return res.status(200).json(workspace);
}

export async function cleanupTrainingPlaceholderModulesHandler(req: Request, res: Response) {
  const input = cleanupPlaceholderModulesSchema.parse(req.body);
  const result = await cleanupTrainingPlaceholderModules({
    audienceLabel: input.audienceLabel,
    createdBy: req.user!.id,
  });
  return res.status(200).json(result);
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

export async function updateTrainingSessionTierLocksHandler(req: Request, res: Response) {
  const input = updateSessionTierLocksSchema.parse(req.body);
  const workspace = await updateTrainingSessionTierLocks({
    moduleId: input.moduleId,
    sessionId: input.sessionId ?? null,
    programTiers: input.programTiers,
    createdBy: req.user!.id,
  });
  return res.status(200).json(workspace);
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

export async function updateTrainingOtherTypeSettingHandler(req: Request, res: Response) {
  const input = updateOtherSettingSchema.parse(req.body);
  const item = await updateTrainingOtherTypeSetting({
    audienceLabel: input.audienceLabel,
    type: input.type,
    enabled: input.enabled,
    createdBy: req.user!.id,
  });
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

async function completeTrainingSessionRequest(req: Request, res: Response) {
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "Onboarding incomplete" });
  }
  const age = athlete.age ?? null;
  if (!age) {
    return res.status(400).json({ error: "Athlete age missing" });
  }
  const workspace = await getTrainingContentMobileWorkspace({
    age,
    athleteId: athlete.id,
    programTier: athlete.currentProgramTier ?? null,
    team: athlete.team ?? null,
  });
  const foundSession = workspace.modules
    .flatMap((module) => module.sessions)
    .find((session) => session.id === sessionId);
  if (!foundSession) {
    return res.status(404).json({ error: "Session not found" });
  }
  if (foundSession.locked) {
    return res.status(403).json({ error: "Session locked" });
  }

  const parsedBody = finishTrainingSessionBodySchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid workout log" });
  }

  const weightsUsed = typeof parsedBody.data.weightsUsed === "string" ? parsedBody.data.weightsUsed.trim() : "";
  const repsCompleted = typeof parsedBody.data.repsCompleted === "string" ? parsedBody.data.repsCompleted.trim() : "";
  const rpe = typeof parsedBody.data.rpe === "number" ? parsedBody.data.rpe : null;

  const hasWorkoutLog = Boolean(weightsUsed) || Boolean(repsCompleted) || rpe != null;
  try {
    const item = await finishTrainingModuleSessionWithLog({
      athleteId: athlete.id,
      sessionId,
      workoutLog: hasWorkoutLog
        ? {
            weightsUsed: weightsUsed ? weightsUsed : null,
            repsCompleted: repsCompleted ? repsCompleted : null,
            rpe,
          }
        : null,
    });
    return res.status(201).json({ item });
  } catch (error: any) {
    console.error("finishTrainingSession error:", error);
    if (error?.message === "Session already completed") {
      return res.status(409).json({ error: "Session already completed" });
    }
    return res.status(500).json({ error: "Failed to complete session" });
  }
}

export async function finishTrainingSessionHandler(req: Request, res: Response) {
  return completeTrainingSessionRequest(req, res);
}

export async function completeTrainingWorkoutHandler(req: Request, res: Response) {
  return completeTrainingSessionRequest(req, res);
}
