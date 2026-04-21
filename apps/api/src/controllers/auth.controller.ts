import type { Request, Response } from "express";
import { z } from "zod";

import {
  confirmForgotPasswordLocal,
  confirmLocal,
  changePasswordLocal,
  loginLocal,
  resendLocal,
  registerLocal,
  startEmailRegistration,
  updateUserRole,
  startForgotPasswordLocal,
} from "../services/auth.service";
import { deleteOwnAccount } from "../services/account-deletion.service";
import { normalizeStoredMediaUrl } from "../services/s3.service";
import { verifyAccessToken } from "../lib/jwt";
import { getAthleteForUser, updateUserProfile } from "../services/user.service";
import { getOnboardingByUser } from "../services/onboarding.service";
import { getMessagingAccessTiers } from "../services/messaging-policy.service";
import { buildAppCapabilities } from "../services/app-capabilities.service";
import { db } from "../db";
import { teamTable } from "../db/schema";
import { eq } from "drizzle-orm";

/** Roster/admin flows set `athletes.teamId` but may leave varchar `athletes.team` empty — resolve a real label for clients. */
async function resolveAthleteTeamNameForMe(
  athlete: { team?: unknown; teamId?: number | null } | null | undefined,
): Promise<string | null> {
  if (!athlete) return null;
  const raw = typeof athlete.team === "string" ? athlete.team.trim() : "";
  if (raw.length > 0 && raw.toLowerCase() !== "unknown") {
    return raw;
  }
  const tid = athlete.teamId;
  if (typeof tid === "number" && Number.isFinite(tid) && tid > 0) {
    const [row] = await db
      .select({ name: teamTable.name })
      .from(teamTable)
      .where(eq(teamTable.id, tid))
      .limit(1);
    const n = typeof row?.name === "string" ? row.name.trim() : "";
    if (n.length > 0 && n.toLowerCase() !== "unknown") {
      return n;
    }
    return n.length > 0 ? n : null;
  }
  return null;
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const confirmSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
});

const resendSchema = z.object({
  email: z.string().email(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const forgotConfirmSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
  password: z.string().min(8),
});

const startRegisterSchema = z.object({
  email: z.string().email(),
});

const updateRoleSchema = z.object({
  email: z.string().email(),
  type: z.enum(["youth", "adult", "team"]),
  password: z.string().min(8).optional(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

const deleteAccountSchema = z.object({
  password: z.string().min(8),
});

const updateMeSchema = z
  .object({
    name: z.string().min(1).optional(),
    profilePicture: z.string().url().nullable().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "No fields to update",
  });

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  await registerLocal(input);
  return res.status(200).json({ ok: true });
}

export async function startRegistration(req: Request, res: Response) {
  const input = startRegisterSchema.parse(req.body);
  await startEmailRegistration(input);
  return res.status(200).json({ ok: true });
}

export async function updateRole(req: Request, res: Response) {
  const input = updateRoleSchema.parse(req.body);
  const result = await updateUserRole(input);
  return res.status(200).json(result);
}

export async function confirmRegistration(req: Request, res: Response) {
  const input = confirmSchema.parse(req.body);
  const result = await confirmLocal(input);
  return res.status(200).json(result);
}

export async function resendConfirmation(req: Request, res: Response) {
  const input = resendSchema.parse(req.body);
  await resendLocal(input);
  return res.status(200).json({ ok: true });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const response = await loginLocal(input);
  return res.status(200).json(response);
}

export async function refreshToken(_req: Request, res: Response) {
  return res.status(400).json({ error: "Refresh tokens are not used; sign in again to obtain a new access token." });
}

export async function startPasswordReset(req: Request, res: Response) {
  const input = forgotSchema.parse(req.body);
  await startForgotPasswordLocal(input);
  return res.status(200).json({ ok: true });
}

export async function confirmPasswordReset(req: Request, res: Response) {
  const input = forgotConfirmSchema.parse(req.body);
  await confirmForgotPasswordLocal(input);
  return res.status(200).json({ ok: true });
}

export async function updatePassword(req: Request, res: Response) {
  const input = changePasswordSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Invalid request", details: input.error.flatten().fieldErrors });
  }
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.replace("Bearer ", "") : "";
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const payload = await verifyAccessToken(token);
  const userId = payload.user_id as number | undefined;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  await changePasswordLocal({
    userId,
    previousPassword: input.data.oldPassword,
    proposedPassword: input.data.newPassword,
  });
  return res.status(200).json({ ok: true });
}

export async function getMe(req: Request, res: Response) {
  const user = req.user!;
  const [athleteData, messagingAccessTiers] = await Promise.all([
    getOnboardingByUser(user.id),
    getMessagingAccessTiers(),
  ]);

  const athlete = athleteData as any;
  const programTier = athlete?.currentProgramTier ?? null;
  const capabilities = buildAppCapabilities({
    role: user.role,
    programTier,
    messagingAccessTiers,
  });

  const isCoachRole =
    user.role === "coach" || user.role === "admin" || user.role === "superAdmin";

  const coachManagedTeam = isCoachRole
    ? ((
        await db
          .select({
            id: teamTable.id,
            name: teamTable.name,
            minAge: teamTable.minAge,
            maxAge: teamTable.maxAge,
            maxAthletes: teamTable.maxAthletes,
            emailSlug: teamTable.emailSlug,
            planId: teamTable.planId,
            subscriptionStatus: teamTable.subscriptionStatus,
            planExpiresAt: teamTable.planExpiresAt,
            createdAt: teamTable.createdAt,
            updatedAt: teamTable.updatedAt,
          })
          .from(teamTable)
          .where(eq(teamTable.adminId, user.id))
          .limit(1)
      )[0] ?? null)
    : null;

  // Coach/admin: managed team record. Athletes/guardians: team name string (from row and/or teamId join).
  const teamForUser = isCoachRole
    ? coachManagedTeam
    : await resolveAthleteTeamNameForMe(athlete);

  return res.status(200).json({
    user: {
      ...user,
      ...athlete, // Spread athlete data to include everything (trainingStats, planExpiresAt, etc.)
      // Athlete row `id` is the athlete PK; clients expect `user.id` = auth account id (`users.id`).
      id: user.id,
      team: teamForUser,
      programTier,
      athleteType: athlete?.athleteType ?? null,
      athleteName: athlete?.name ?? null,
      athleteId: athlete?.id ?? null,
      phoneNumber: athlete?.phoneNumber ?? athlete?.guardianPhone ?? (athlete?.extraResponses as any)?.phone ?? null,
      birthDate: athlete?.birthDate ?? null,
      planExpiresAt: athlete?.planExpiresAt ?? null,
      planPaymentType: athlete?.planPaymentType ?? null,
      planCreatedAt: athlete?.planCreatedAt ?? athlete?.createdAt ?? null,
      trainingPerWeek: athlete?.trainingPerWeek ?? 0,
      performanceGoals: athlete?.performanceGoals ?? null,
      equipmentAccess: athlete?.equipmentAccess ?? null,
      growthNotes: athlete?.growthNotes ?? null,
      injuries: athlete?.injuries ?? null,
      onboardingCompleted: athlete?.onboardingCompleted ?? false,
      trainingStats: athlete?.trainingStats ?? null,
      allAthletes: athlete?.allAthletes ?? null,
      capabilities,
      messagingAccessTiers,
    },
  });
}

export async function deleteAccount(req: Request, res: Response) {
  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter your current password (at least 8 characters)." });
  }
  try {
    await deleteOwnAccount(req.user!.id, parsed.data.password);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    const message = typeof err?.message === "string" ? err.message : "Could not delete account.";
    return res.status(status).json({ error: message });
  }
}

export async function updateMe(req: Request, res: Response) {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  const updated = await updateUserProfile(req.user!.id, parsed.data);
  if (!updated) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.status(200).json({
    user: {
      id: updated.id,
      role: updated.role,
      email: updated.email,
      name: updated.name,
      sub: updated.cognitoSub,
      profilePicture: normalizeStoredMediaUrl(updated.profilePicture ?? null),
    },
  });
}
