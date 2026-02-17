import type { Request, Response } from "express";
import { z } from "zod";

import {
  getOnboardingByUser,
  submitOnboarding as submitOnboardingService,
  getPublicOnboardingConfig,
  updateAthleteProfilePicture,
} from "../services/onboarding.service";
import { ProgramType } from "../db/schema";
import { calculateAge, parseISODate } from "../lib/age";

const onboardingSchema = z.object({
  athleteName: z.string().min(1),
  birthDate: z.string().optional(),
  age: z.number().int().min(5).optional(),
  team: z.string().min(1),
  trainingPerWeek: z.number().int().min(0),
  injuries: z.unknown().optional(),
  growthNotes: z.string().optional(),
  performanceGoals: z.string().optional(),
  equipmentAccess: z.string().optional(),
  parentEmail: z.string().email(),
  parentPhone: z.string().optional(),
  relationToAthlete: z.string().optional(),
  desiredProgramType: z.enum(ProgramType.enumValues),
  termsVersion: z.string().min(1),
  privacyVersion: z.string().min(1),
  appVersion: z.string().min(1),
  extraResponses: z.record(z.string(), z.any()).optional(),
}).refine((data) => Boolean(data.birthDate || data.age), {
  message: "Birth date is required.",
  path: ["birthDate"],
});

const athletePhotoSchema = z.object({
  profilePicture: z.string().url().nullable(),
});

export async function submitOnboarding(req: Request, res: Response) {
  const input = onboardingSchema.parse(req.body);
  const parsedBirthDate = input.birthDate ? parseISODate(input.birthDate) : null;
  if (input.birthDate && !parsedBirthDate) {
    return res.status(400).json({ error: "Birth date must be in YYYY-MM-DD format." });
  }
  if (parsedBirthDate) {
    const age = calculateAge(parsedBirthDate);
    if (age < 5) {
      return res.status(400).json({ error: "Birth date must result in an age of 5 or older." });
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
    desiredProgramType: input.desiredProgramType,
    termsVersion: input.termsVersion,
    privacyVersion: input.privacyVersion,
    appVersion: input.appVersion,
    extraResponses: input.extraResponses,
  });

  return res.status(200).json(result);
}

export async function getOnboardingConfig(_req: Request, res: Response) {
  const config = await getPublicOnboardingConfig();
  return res.status(200).json({ config });
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
