import type { Request, Response } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";

import {
  getOnboardingByUser,
  submitOnboarding as submitOnboardingService,
  startYouthOnboarding,
  startAdultOnboarding,
  startTeamOnboarding,
  startPerformanceOnboarding,
  saveOnboardingGoals,
  getPublicOnboardingConfig,
  getPhpPlusProgramTabs,
  updateAthleteProfilePicture,
  listGuardianAthletesWithUsers,
  setActiveGuardianAthlete,
  getGuardianAthleteOnboardingData,
  updateGuardianAthleteOnboardingData,
} from "../services/onboarding.service";
import { AthleteType, ProgramType } from "../db/schema";
import { calculateAge, clampYouthAge, parseISODate } from "../lib/age";

const onboardingSchema = z
  .object({
    athleteName: z.string().min(1),
    birthDate: z.string().optional(),
    age: z.number().int().min(0).optional(),
    athleteType: z.enum(AthleteType.enumValues).optional(),
    team: z.string().optional().nullable(),
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
  })
  .refine((data) => Boolean(data.birthDate || data.age), {
    message: "Birth date is required.",
    path: ["birthDate"],
  });

const youthBasicSchema = z.object({
  guardianName: z.string().min(1),
  athleteName: z.string().min(1),
  birthDate: z.string().min(1),
});

const adultBasicSchema = z.object({
  name: z.string().min(1),
  birthDate: z.string().min(1),
});

const teamBasicSchema = z.object({
  name: z.string().min(1),
  athleteType: z.enum(["youth", "adult"]).default("youth"),
  minAge: z.number().int().min(1).optional().nullable(),
  maxAge: z.number().int().min(1).optional().nullable(),
  maxAthletes: z.number().int().min(1),
});

const onboardingGoalsSchema = z.object({
  trainingPerWeek: z.number().int().min(0).max(7),
  performanceGoals: z.string().min(1),
  injuries: z.any().optional(),
  equipmentAccess: z.string().optional(),
  growthNotes: z.string().optional(),
  phone: z.string().min(1),
});

const performanceSchema = z.object({
  trainingPerWeek: z.number().int().min(0).max(7),
  performanceGoals: z.string().min(1),
  equipmentAccess: z.string().min(1),
});

const athletePhotoSchema = z.object({
  profilePicture: z.string().url().nullable(),
});

const athleteOnboardingPatchSchema = z
  .object({
    name: z.string().min(1).optional(),
    birthDate: z.string().optional(),
    team: z.string().optional().nullable(),
    trainingPerWeek: z.number().int().min(0).optional(),
    injuries: z.unknown().optional(),
    growthNotes: z.string().optional().nullable(),
    performanceGoals: z.string().optional().nullable(),
    equipmentAccess: z.string().optional().nullable(),
    extraResponses: z.record(z.string(), z.any()).optional(),

    // Backward-compatible fields used by older mobile builds
    height: z.string().optional().nullable(),
    weight: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
  })
  .strict();

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
    athleteType: input.athleteType,
    team: input.team ?? null,
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

export async function submitYouthBasic(req: Request, res: Response) {
  const parsed = youthBasicSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  try {
    const result = await startYouthOnboarding({
      userId: req.user!.id,
      ...parsed.data,
    });
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Failed to save youth details" });
  }
}

export async function submitAdultBasic(req: Request, res: Response) {
  const parsed = adultBasicSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  try {
    const result = await startAdultOnboarding({
      userId: req.user!.id,
      ...parsed.data,
    });
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Failed to save adult details" });
  }
}

export async function submitTeamBasic(req: Request, res: Response) {
  const parsed = teamBasicSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }

  function safeOnboardingErrorMessage(error: unknown, fallback: string) {
    const err = error as any;
    const message = typeof err?.message === "string" ? err.message : "";

    // Drizzle's DrizzleQueryError message includes full SQL + params.
    if (err?.name === "DrizzleQueryError" || typeof err?.query === "string" || message.startsWith("Failed query:")) {
      const pgCode = err?.cause?.code ?? err?.code;
      // Missing table / missing column => typically indicates migrations haven't run.
      if (pgCode === "42P01" || pgCode === "42703") {
        return "Database schema is out of date. Run migrations and try again.";
      }
      return fallback;
    }

    return message || fallback;
  }

  try {
    const result = await startTeamOnboarding({
      userId: req.user!.id,
      ...parsed.data,
    });
    return res.status(200).json(result);
  } catch (err: any) {
    const msg = typeof err?.message === "string" ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate") || err?.code === "23505") {
      return res.status(409).json({ error: "A team with that name already exists. Please choose a different name." });
    }

    logger.error({ err }, "[onboarding] submitTeamBasic");
    return res.status(500).json({ error: safeOnboardingErrorMessage(err, "Failed to create team.") });
  }
}

export async function submitGoals(req: Request, res: Response) {
  const parsed = onboardingGoalsSchema.parse(req.body);
  const result = await saveOnboardingGoals({
    userId: req.user!.id,
    ...parsed,
  });
  return res.status(200).json(result);
}

export async function submitPerformanceBasic(req: Request, res: Response) {
  const parsed = performanceSchema.parse(req.body);
  const result = await startPerformanceOnboarding({
    userId: req.user!.id,
    ...parsed,
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

export async function getGuardianAthlete(req: Request, res: Response) {
  const athleteId = Number(req.params.athleteId);
  if (!Number.isFinite(athleteId) || athleteId <= 0) {
    return res.status(400).json({ error: "Invalid athlete id" });
  }

  const athlete = await getGuardianAthleteOnboardingData({
    userId: req.user!.id,
    athleteId,
  });

  if (!athlete) {
    return res.status(404).json({ error: "Athlete not found" });
  }

  return res.status(200).json({ athlete });
}

export async function updateGuardianAthlete(req: Request, res: Response) {
  const athleteId = Number(req.params.athleteId);
  if (!Number.isFinite(athleteId) || athleteId <= 0) {
    return res.status(400).json({ error: "Invalid athlete id" });
  }

  const parsed = athleteOnboardingPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }

  try {
    const updated = await updateGuardianAthleteOnboardingData({
      userId: req.user!.id,
      athleteId,
      name: parsed.data.name,
      birthDate: parsed.data.birthDate,
      team: parsed.data.team,
      trainingPerWeek: parsed.data.trainingPerWeek,
      injuries: parsed.data.injuries,
      growthNotes: parsed.data.growthNotes,
      performanceGoals: parsed.data.performanceGoals,
      equipmentAccess: parsed.data.equipmentAccess,
      extraResponses: parsed.data.extraResponses,
      height: parsed.data.height,
      weight: parsed.data.weight,
      position: parsed.data.position,
    });

    if (!updated) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? "Invalid request" });
  }
}
