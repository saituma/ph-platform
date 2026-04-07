import type { Request, Response } from "express";
import { z } from "zod";
import {
  listUsers,
  setUserBlocked,
  softDeleteUser,
  getUserOnboarding,
  createGuardianWithOnboardingAdmin,
  createAdultAthleteAdmin,
  updateAthleteProgramTier,
} from "../../services/admin/user.service";
import { ProgramType } from "../../db/schema";

const adminSearchQuerySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const provisionGuardianSchema = z.object({
  email: z.string().email(),
  guardianDisplayName: z.string().min(1),
  athleteName: z.string().min(1),
  birthDate: z.string().min(1),
  team: z.string().min(1),
  trainingPerWeek: z.coerce.number().int().min(0),
  injuries: z.unknown().optional(),
  growthNotes: z.string().optional().nullable(),
  performanceGoals: z.string().optional().nullable(),
  equipmentAccess: z.string().optional().nullable(),
  parentPhone: z.string().optional().nullable(),
  relationToAthlete: z.string().optional().nullable(),
  desiredProgramType: z.enum(ProgramType.enumValues).optional(),
  athleteProfilePicture: z.string().url().optional().nullable(),
  planPaymentType: z.enum(["monthly", "upfront"]),
  planCommitmentMonths: z.union([z.literal(6), z.literal(12)]),
  termsVersion: z.string().min(1),
  privacyVersion: z.string().min(1),
  appVersion: z.string().min(1),
  initialPassword: z.string().min(8).max(128).optional(),
  extraResponses: z.record(z.string(), z.any()).optional(),
});

const provisionAdultAthleteSchema = z.object({
  email: z.string().email(),
  athleteName: z.string().min(1),
  birthDate: z.string().min(1),
  team: z.string().optional().nullable(),
  trainingPerWeek: z.coerce.number().int().min(0),
  injuries: z.unknown().optional(),
  growthNotes: z.string().optional().nullable(),
  performanceGoals: z.string().optional().nullable(),
  equipmentAccess: z.string().optional().nullable(),
  desiredProgramType: z.enum(ProgramType.enumValues).optional().nullable(),
  athleteProfilePicture: z.string().url().optional().nullable(),
  planPaymentType: z.enum(["monthly", "upfront"]),
  planCommitmentMonths: z.union([z.literal(6), z.literal(12)]),
  termsVersion: z.string().min(1),
  privacyVersion: z.string().min(1),
  appVersion: z.string().min(1),
  initialPassword: z.string().min(8).max(128).optional(),
  extraResponses: z.record(z.string(), z.any()).optional(),
});

const provisionTeamMemberSchema = z.object({
  email: z.string().email(),
  guardianDisplayName: z.string().min(1),
  athleteName: z.string().min(1),
  birthDate: z.string().min(1),
  trainingPerWeek: z.coerce.number().int().min(0),
  parentPhone: z.string().optional().nullable(),
  relationToAthlete: z.string().optional().nullable(),
});

const provisionTeamSchema = z.object({
  teamName: z.string().min(1),
  injuries: z.unknown().optional(),
  growthNotes: z.string().optional().nullable(),
  performanceGoals: z.string().optional().nullable(),
  equipmentAccess: z.string().optional().nullable(),
  termsVersion: z.string().min(1),
  privacyVersion: z.string().min(1),
  appVersion: z.string().min(1),
  members: z.array(provisionTeamMemberSchema).min(1),
});

const updateTierSchema = z.object({
  athleteId: z.number().int().min(1),
  programTier: z.enum(ProgramType.enumValues),
});

export async function listAllUsers(req: Request, res: Response) {
  const { q, limit } = adminSearchQuerySchema.parse(req.query ?? {});
  const users = await listUsers({ q, limit });
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

export async function provisionGuardianWithOnboarding(req: Request, res: Response) {
  const parsed = provisionGuardianSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  try {
    const result = await createGuardianWithOnboardingAdmin(parsed.data);
    return res.status(201).json(result);
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    const message = typeof error?.message === "string" ? error.message : "Failed to create user";
    if (status >= 500) {
      console.error("[admin] provisionGuardianWithOnboarding", error);
    }
    return res.status(status).json({ error: message });
  }
}

export async function provisionAdultAthlete(req: Request, res: Response) {
  const parsed = provisionAdultAthleteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  try {
    const result = await createAdultAthleteAdmin(parsed.data);
    return res.status(201).json(result);
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    const message = typeof error?.message === "string" ? error.message : "Failed to create adult athlete";
    if (status >= 500) {
      console.error("[admin] provisionAdultAthlete", error);
    }
    return res.status(status).json({ error: message });
  }
}

export async function provisionTeamWithPlan(req: Request, res: Response) {
  const parsed = provisionTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }

  const input = parsed.data;

  try {
    const failed: Array<{ member: number; email: string; reason: string }> = [];
    let created = 0;
    let emailed = 0;

    for (let index = 0; index < input.members.length; index += 1) {
      const member = input.members[index];
      try {
        const response = await createGuardianWithOnboardingAdmin({
          email: member.email.trim(),
          guardianDisplayName: member.guardianDisplayName.trim(),
          athleteName: member.athleteName.trim(),
          birthDate: member.birthDate,
          team: input.teamName.trim(),
          trainingPerWeek: member.trainingPerWeek,
          injuries: input.injuries,
          growthNotes: input.growthNotes ?? null,
          performanceGoals: input.performanceGoals ?? null,
          equipmentAccess: input.equipmentAccess ?? null,
          parentPhone: member.parentPhone ?? null,
          relationToAthlete: member.relationToAthlete ?? null,
          planPaymentType: "monthly",
          planCommitmentMonths: 6,
          termsVersion: input.termsVersion,
          privacyVersion: input.privacyVersion,
          appVersion: input.appVersion,
        });
        created += 1;
        if (response.emailSent) emailed += 1;
      } catch (error: any) {
        const reason = typeof error?.message === "string" ? error.message : "Could not create user.";
        failed.push({
          member: index + 1,
          email: member.email,
          reason,
        });
      }
    }

    return res.status(201).json({
      created,
      emailed,
      failed,
    });
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    const message = typeof error?.message === "string" ? error.message : "Failed to create team.";
    if (status >= 500) {
      console.error("[admin] provisionTeamWithPlan", error);
    }
    return res.status(status).json({ error: message });
  }
}

export async function updateProgramTier(req: Request, res: Response) {
  const input = updateTierSchema.parse(req.body);
  const athlete = await updateAthleteProgramTier(input.athleteId, input.programTier);
  return res.status(200).json({ athlete });
}
