import type { Request, Response } from "express";
import { z } from "zod";

import {
  getOnboardingByUser,
  submitOnboarding as submitOnboardingService,
  getPublicOnboardingConfig,
  getPhpPlusProgramTabs,
  updateAthleteProfilePicture,
  listGuardianAthletesWithUsers,
  setActiveGuardianAthlete,
} from "../services/onboarding.service";
import { ProgramType } from "../db/schema";
import { calculateAge, clampYouthAge, parseISODate } from "../lib/age";

const onboardingSchema = z.object({
  athleteName: z.string().min(1),
  birthDate: z.string().optional(),
  age: z.number().int().min(0).optional(),
  team: z.string().min(1),
  trainingPerWeek: z.number().int().min(0),
  injuries: z.unknown().optional(),
  growthNotes: z.string().optional().nullable(),
  performanceGoals: z.string().optional(),
  equipmentAccess: z.string().optional(),
  parentEmail: z.string().email(),
  parentPhone: z.string().optional(),
  relationToAthlete: z.string().optional(),
  /** Legacy / optional. New signups choose and pay for a plan in the app; tier is set via billing, not onboarding. */
  desiredProgramType: z.enum(ProgramType.enumValues).optional(),
  termsVersion: z.string().min(1),
  privacyVersion: z.string().min(1),
  appVersion: z.string().min(1),
  extraResponses: z.record(z.string(), z.any()).optional(),
  createNew: z.boolean().optional(),
  athleteId: z.number().optional().nullable(),
}).refine((data) => Boolean(data.birthDate || data.age), {
  message: "Birth date is required.",
  path: ["birthDate"],
});

const athletePhotoSchema = z.object({
  profilePicture: z.string().url().nullable(),
});

export async function submitOnboarding(req: Request, res: Response) {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const input = parsed.data;
  const parsedBirthDate = input.birthDate ? parseISODate(input.birthDate) : null;
  if (input.birthDate && !parsedBirthDate) {
    return res.status(400).json({ error: "Birth date must be in YYYY-MM-DD format." });
  }
  if (parsedBirthDate) {
    const age = clampYouthAge(calculateAge(parsedBirthDate), "youth");
    if (!age) {
      return res.status(400).json({ error: "Birth date is invalid." });
    }
  }
  const result = await submitOnboardingService({
    userId: req.user!.id,
    athleteName: input.athleteName,
    birthDate: input.birthDate ?? null,
    age: input.age ?? null,
    team: input.team,
    trainingPerWeek: input.trainingPerWeek,
    injuries: input.injuries,
    growthNotes: input.growthNotes,
    performanceGoals: input.performanceGoals,
    equipmentAccess: input.equipmentAccess,
    parentEmail: input.parentEmail,
    parentPhone: input.parentPhone,
    relationToAthlete: input.relationToAthlete,
    desiredProgramType: input.desiredProgramType ?? undefined,
    termsVersion: input.termsVersion,
    privacyVersion: input.privacyVersion,
    appVersion: input.appVersion,
    extraResponses: input.extraResponses,
    createNew: input.createNew,
    athleteId: input.athleteId ?? null,
  });

  return res.status(200).json(result);
}

export async function getOnboardingConfig(_req: Request, res: Response) {
  const config = await getPublicOnboardingConfig();
  const { defaultProgramTier: _defaultTier, ...publicConfig } = config as Record<string, unknown> & {
    defaultProgramTier?: unknown;
  };
  return res.status(200).json({ config: publicConfig });
}

export async function getPhpPlusTabs(_req: Request, res: Response) {
  const tabs = await getPhpPlusProgramTabs();
  return res.status(200).json({ tabs });
}

export async function getOnboardingStatus(req: Request, res: Response) {
  const athlete = await getOnboardingByUser(req.user!.id);
  return res.status(200).json({ athlete });
}

export async function updateAthletePhoto(req: Request, res: Response) {
  const input = athletePhotoSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Invalid request", details: input.error.flatten().fieldErrors });
  }
  const updated = await updateAthleteProfilePicture({
    userId: req.user!.id,
    profilePicture: input.data.profilePicture,
  });
  if (!updated) {
    return res.status(404).json({ error: "Athlete profile not found" });
  }
  return res.status(200).json({ athlete: updated });
}

export async function listGuardianAthletes(req: Request, res: Response) {
  const { guardian, athletes } = await listGuardianAthletesWithUsers(req.user!.id);
  if (!guardian) {
    return res.status(200).json({ guardian: null, athletes: [] });
  }
  return res.status(200).json({
    guardian: { id: guardian.id, activeAthleteId: guardian.activeAthleteId ?? null },
    athletes,
  });
}

export async function selectActiveAthlete(req: Request, res: Response) {
  const input = z.object({ athleteId: z.number() }).safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Invalid request", details: input.error.flatten().fieldErrors });
  }
  const updated = await setActiveGuardianAthlete({ userId: req.user!.id, athleteId: input.data.athleteId });
  if (!updated) {
    return res.status(404).json({ error: "Athlete not found" });
  }
  return res.status(200).json({ guardian: { id: updated.id, activeAthleteId: updated.activeAthleteId ?? null } });
}
