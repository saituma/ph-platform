import type { Request, Response } from "express";
import { z } from "zod";
import {
  createProgramTemplate,
  deleteProgramTemplate,
  listProgramTemplates,
  updateProgramTemplate,
  createExercise,
  listExercises,
  updateExercise,
  deleteExercise,
  createSession,
  addExerciseToSession,
  deleteSessionExercise,
  assignEnrollment,
} from "../../services/admin/program.service";
import { ProgramType, sessionType } from "../../db/schema";

const adminSearchQuerySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const assignSchema = z.object({
  athleteId: z.number().int().min(1),
  programType: z.enum(ProgramType.enumValues),
  programTemplateId: z.number().int().min(1).optional(),
});

const programSchema = z
  .object({
    name: z.string().min(1),
    type: z.enum(ProgramType.enumValues),
    description: z.string().optional(),
    minAge: z.number().int().min(1).max(99).optional().nullable(),
    maxAge: z.number().int().min(1).max(99).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.minAge != null && data.maxAge != null && data.minAge > data.maxAge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum age cannot be greater than maximum age.",
        path: ["minAge"],
      });
    }
  });

const programUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    type: z.enum(ProgramType.enumValues).optional(),
    description: z.string().optional().nullable(),
    minAge: z.number().int().min(1).max(99).optional().nullable(),
    maxAge: z.number().int().min(1).max(99).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.minAge != null && data.maxAge != null && data.minAge > data.maxAge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum age cannot be greater than maximum age.",
        path: ["minAge"],
      });
    }
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "No fields to update",
  });

const exerciseSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  cues: z.string().optional(),
  howTo: z.string().optional(),
  progression: z.string().optional(),
  regression: z.string().optional(),
  sets: z.number().int().optional(),
  reps: z.number().int().optional(),
  duration: z.number().int().optional(),
  restSeconds: z.number().int().optional(),
  notes: z.string().optional(),
  videoUrl: z.string().url().optional(),
});

const exerciseUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    category: z.string().optional().nullable(),
    cues: z.string().optional(),
    howTo: z.string().optional().nullable(),
    progression: z.string().optional().nullable(),
    regression: z.string().optional().nullable(),
    sets: z.number().int().optional().nullable(),
    reps: z.number().int().optional().nullable(),
    duration: z.number().int().optional().nullable(),
    restSeconds: z.number().int().optional().nullable(),
    notes: z.string().optional().nullable(),
    videoUrl: z.string().url().optional().nullable(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "No fields to update",
  });

const sessionSchema = z.object({
  programId: z.number().int().min(1),
  weekNumber: z.number().int().min(1),
  sessionNumber: z.number().int().min(1),
  type: z.enum(sessionType.enumValues),
});

const sessionExerciseSchema = z.object({
  sessionId: z.number().int().min(1),
  exerciseId: z.number().int().min(1),
  order: z.number().int().min(1),
  coachingNotes: z.string().optional(),
  progressionNotes: z.string().optional(),
  regressionNotes: z.string().optional(),
});

export async function assignProgram(req: Request, res: Response) {
  const input = assignSchema.parse(req.body);
  const enrollment = await assignEnrollment({
    athleteId: input.athleteId,
    programType: input.programType,
    programTemplateId: input.programTemplateId,
    assignedByCoach: req.user!.id,
  });
  return res.status(201).json({ enrollment });
}

export async function createProgram(req: Request, res: Response) {
  const input = programSchema.parse(req.body);
  const program = await createProgramTemplate({
    name: input.name,
    type: input.type,
    description: input.description,
    minAge: input.minAge ?? null,
    maxAge: input.maxAge ?? null,
    createdBy: req.user!.id,
  });
  return res.status(201).json({ program });
}

export async function listPrograms(_req: Request, res: Response) {
  const { q, limit } = adminSearchQuerySchema.parse(_req.query ?? {});
  const programs = await listProgramTemplates({ q, limit });
  return res.status(200).json({ programs });
}

export async function updateProgram(req: Request, res: Response) {
  const programId = z.coerce.number().int().min(1).parse(req.params.programId);
  const input = programUpdateSchema.parse(req.body);
  const program = await updateProgramTemplate({
    programId,
    name: input.name,
    type: input.type,
    description: input.description ?? null,
    minAge: input.minAge ?? null,
    maxAge: input.maxAge ?? null,
  });
  return res.status(200).json({ program });
}

export async function deleteProgram(req: Request, res: Response) {
  const programId = z.coerce.number().int().min(1).parse(req.params.programId);
  const deleted = await deleteProgramTemplate(programId);
  if (!deleted) {
    return res.status(404).json({ error: "Program not found" });
  }
  return res.status(200).json({ deleted: true });
}

export async function createExerciseItem(req: Request, res: Response) {
  const input = exerciseSchema.parse(req.body);
  const exercise = await createExercise({
    name: input.name,
    cues: input.cues,
    sets: input.sets,
    reps: input.reps,
    duration: input.duration,
    restSeconds: input.restSeconds,
    notes: input.notes,
    videoUrl: input.videoUrl,
  });
  return res.status(201).json({ exercise });
}

export async function listExerciseLibrary(_req: Request, res: Response) {
  const exercises = await listExercises();
  return res.status(200).json({ exercises });
}

export async function updateExerciseItem(req: Request, res: Response) {
  const exerciseId = z.coerce.number().int().min(1).parse(req.params.exerciseId);
  const parsed = exerciseUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }

  const exercise = await updateExercise(exerciseId, parsed.data);
  if (!exercise) {
    return res.status(404).json({ error: "Exercise not found" });
  }
  return res.status(200).json({ exercise });
}

export async function deleteExerciseItem(req: Request, res: Response) {
  const exerciseId = z.coerce.number().int().min(1).parse(req.params.exerciseId);
  const exercise = await deleteExercise(exerciseId);
  if (!exercise) {
    return res.status(404).json({ error: "Exercise not found" });
  }
  return res.status(200).json({ exercise });
}

export async function createSessionItem(req: Request, res: Response) {
  const input = sessionSchema.parse(req.body);
  const session = await createSession({
    programId: input.programId,
    weekNumber: input.weekNumber,
    sessionNumber: input.sessionNumber,
    type: input.type,
  });
  return res.status(201).json({ session });
}

export async function addExercise(req: Request, res: Response) {
  const input = sessionExerciseSchema.parse(req.body);
  const item = await addExerciseToSession({
    sessionId: input.sessionId,
    exerciseId: input.exerciseId,
    order: input.order,
    coachingNotes: input.coachingNotes,
    progressionNotes: input.progressionNotes,
    regressionNotes: input.regressionNotes,
  });
  return res.status(201).json({ item });
}

export async function deleteSessionExerciseItem(req: Request, res: Response) {
  const sessionExerciseId = z.coerce.number().int().min(1).parse(req.params.sessionExerciseId);
  const item = await deleteSessionExercise(sessionExerciseId);
  if (!item) {
    return res.status(404).json({ error: "Session exercise not found" });
  }
  return res.status(200).json({ item });
}
