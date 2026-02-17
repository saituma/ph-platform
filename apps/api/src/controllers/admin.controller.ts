import type { Request, Response } from "express";
import { z } from "zod";

import {
  addExerciseToSession,
  assignEnrollment,
  createExercise,
  createProgramTemplate,
  createSession,
  deleteSessionExercise,
  getAdminProfile,
  getDashboardMetrics,
  getUserOnboarding,
  listExercises,
  listBookingsAdmin,
  listMessageThreadsAdmin,
  listThreadMessagesAdmin,
  listVideoUploadsAdmin,
  listAvailabilityAdmin,
  markThreadReadAdmin,
  sendMessageAdmin,
  listUsers,
  setUserBlocked,
  softDeleteUser,
  updateAdminPreferences,
  updateAdminProfile,
  updateAthleteProgramTier,
  getOnboardingConfig,
  updateOnboardingConfig,
  updateExercise,
  deleteExercise,
  listProgramTemplates,
  updateProgramTemplate,
} from "../services/admin.service";
import { ProgramType, sessionType } from "../db/schema";

const updateTierSchema = z.object({
  athleteId: z.number().int().min(1),
  programTier: z.enum(ProgramType.enumValues),
});

const assignSchema = z.object({
  athleteId: z.number().int().min(1),
  programType: z.enum(ProgramType.enumValues),
  programTemplateId: z.number().int().min(1).optional(),
});

const programSchema = z.object({
  name: z.string().min(1),
  type: z.enum(ProgramType.enumValues),
  description: z.string().optional(),
});

const programUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    type: z.enum(ProgramType.enumValues).optional(),
    description: z.string().optional().nullable(),
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

const adminProfileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  profilePicture: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
});

const adminPreferencesSchema = z.object({
  timezone: z.string().min(1),
  notificationSummary: z.string().min(1),
  workStartHour: z.number().int().min(0).max(23),
  workStartMinute: z.number().int().min(0).max(59),
  workEndHour: z.number().int().min(0).max(23),
  workEndMinute: z.number().int().min(0).max(59),
});

const onboardingFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "number", "dropdown", "date"]),
  required: z.boolean(),
  visible: z.boolean(),
  options: z.array(z.string().min(1)).optional(),
  optionsByTeam: z.record(z.array(z.string().min(1))).optional(),
});

const onboardingConfigSchema = z.object({
  version: z.number().int().min(1),
  fields: z.array(onboardingFieldSchema).min(1),
  requiredDocuments: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      required: z.boolean(),
    })
  ),
  welcomeMessage: z.string().optional().nullable(),
  coachMessage: z.string().optional().nullable(),
  defaultProgramTier: z.enum(ProgramType.enumValues),
  approvalWorkflow: z.enum(["manual", "auto"]).default("manual"),
  notes: z.string().optional().nullable(),
});

export async function listAllUsers(_req: Request, res: Response) {
  const users = await listUsers();
  return res.status(200).json({ users });
}

export async function blockUser(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const body = z.object({ blocked: z.boolean() }).parse(req.body);
  const user = await setUserBlocked(userId, body.blocked);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.status(200).json({ user });
}

export async function deleteUser(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const user = await softDeleteUser(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.status(200).json({ user });
}

export async function getOnboarding(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const data = await getUserOnboarding(userId);
  return res.status(200).json(data);
}

export async function getAdminProfileDetails(req: Request, res: Response) {
  const data = await getAdminProfile(req.user!.id);
  if (!data) {
    return res.status(404).json({ error: "Admin profile not found" });
  }
  return res.status(200).json(data);
}

export async function updateAdminProfileDetails(req: Request, res: Response) {
  const parsed = adminProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const data = await updateAdminProfile(req.user!.id, parsed.data);
  return res.status(200).json(data);
}

export async function updateAdminPreferencesDetails(req: Request, res: Response) {
  const parsed = adminPreferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const data = await updateAdminPreferences(req.user!.id, parsed.data);
  return res.status(200).json(data);
}

export async function getOnboardingConfigDetails(_req: Request, res: Response) {
  const data = await getOnboardingConfig();
  return res.status(200).json({ config: data });
}

export async function updateOnboardingConfigDetails(req: Request, res: Response) {
  const parsed = onboardingConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const data = await updateOnboardingConfig(req.user!.id, parsed.data);
  return res.status(200).json({ config: data });
}

export async function updateProgramTier(req: Request, res: Response) {
  const input = updateTierSchema.parse(req.body);
  const athlete = await updateAthleteProgramTier(input.athleteId, input.programTier);
  return res.status(200).json({ athlete });
}

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
    createdBy: req.user!.id,
  });
  return res.status(201).json({ program });
}

export async function listPrograms(_req: Request, res: Response) {
  const programs = await listProgramTemplates();
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
  });
  return res.status(200).json({ program });
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

export async function listBookings(req: Request, res: Response) {
  const bookings = await listBookingsAdmin();
  return res.status(200).json({ bookings });
}

export async function listAvailability(_req: Request, res: Response) {
  const items = await listAvailabilityAdmin();
  return res.status(200).json({ items });
}

export async function listVideosAdmin(_req: Request, res: Response) {
  const items = await listVideoUploadsAdmin();
  return res.status(200).json({ items });
}

export async function listMessageThreads(req: Request, res: Response) {
  const threads = await listMessageThreadsAdmin(req.user!.id);
  return res.status(200).json({ threads });
}

export async function listThreadMessages(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const messages = await listThreadMessagesAdmin(req.user!.id, userId);
  return res.status(200).json({ messages });
}

export async function markThreadRead(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const updated = await markThreadReadAdmin(req.user!.id, userId);
  return res.status(200).json({ updated });
}

export async function sendAdminMessage(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const body = z
    .object({
      content: z.string().trim().optional().default(""),
      contentType: z.enum(["text", "image", "video"]).default("text"),
      mediaUrl: z.string().url().optional(),
    })
    .refine((value) => Boolean(value.content) || Boolean(value.mediaUrl), {
      message: "Message content or mediaUrl is required",
    })
    .parse(req.body);
  const message = await sendMessageAdmin({
    coachId: req.user!.id,
    userId,
    content: body.content,
    contentType: body.contentType,
    mediaUrl: body.mediaUrl,
  });
  return res.status(201).json({ message });
}

export async function getDashboard(req: Request, res: Response) {
  const data = await getDashboardMetrics(req.user!.id);
  return res.status(200).json(data);
}
