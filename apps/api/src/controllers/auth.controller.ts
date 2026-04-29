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
import { getUserById, updateUserProfile } from "../services/user.service";
import { getOnboardingByUser } from "../services/onboarding.service";
import { getMessagingAccessTiers } from "../services/messaging-policy.service";
import { buildAppCapabilities } from "../services/app-capabilities.service";
import { db } from "../db";
import {
  ProgramType,
  subscriptionPlanTable,
  teamSubscriptionRequestTable,
  teamTable,
} from "../db/schema";
import { and, desc, eq } from "drizzle-orm";
import { isTrainingStaff } from "../lib/user-roles";
import { isLikelyDatabaseConnectivityFailure } from "../lib/db-connectivity";
import { featuresForTier, getFeaturesForAthlete } from "../services/billing/feature-access.service";

type TeamForMeRow = {
  id: number;
  name: string;
  minAge: number | null;
  maxAge: number | null;
  maxAthletes: number;
  emailSlug: string | null;
  planId: number | null;
  subscriptionStatus: string | null;
  planExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type TeamForMe = TeamForMeRow & {
  planTier: (typeof ProgramType.enumValues)[number] | null;
  planTierSource: "team_plan" | "approved_team_request" | "none";
};

const teamForMeSelect = {
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
} as const;

/** Athletes rostered on a club need the same `team` billing shape as coaches so portal gating can see team plans. */
async function resolveAthleteTeamForMe(
  athlete: { team?: unknown; teamId?: number | null } | null | undefined,
): Promise<TeamForMeRow | null> {
  if (!athlete) return null;
  const tid =
    typeof athlete.teamId === "number" && Number.isFinite(athlete.teamId) && athlete.teamId > 0 ? athlete.teamId : null;
  const [row] = tid
    ? await db.select(teamForMeSelect).from(teamTable).where(eq(teamTable.id, tid)).limit(1)
    : [];
  if (row) return row;

  const teamName = typeof athlete.team === "string" ? athlete.team.trim() : "";
  if (!teamName) return null;
  const [fallback] = await db.select(teamForMeSelect).from(teamTable).where(eq(teamTable.name, teamName)).limit(1);
  if (fallback) return fallback;

  return row ?? null;
}

async function resolveTeamPlanTier(team: {
  id: number;
  planId: number | null;
}): Promise<{
  tier: (typeof ProgramType.enumValues)[number] | null;
  source: "team_plan" | "approved_team_request" | "none";
}> {
  const planId = team.planId;
  if (planId && Number.isFinite(planId) && planId > 0) {
    const [row] = await db
      .select({ tier: subscriptionPlanTable.tier })
      .from(subscriptionPlanTable)
      .where(eq(subscriptionPlanTable.id, planId))
      .limit(1);
    if (row?.tier) return { tier: row.tier, source: "team_plan" };
  }

  const [fallback] = await db
    .select({ tier: subscriptionPlanTable.tier })
    .from(teamSubscriptionRequestTable)
    .innerJoin(
      subscriptionPlanTable,
      eq(teamSubscriptionRequestTable.planId, subscriptionPlanTable.id),
    )
    .where(
      and(
        eq(teamSubscriptionRequestTable.teamId, team.id),
        eq(teamSubscriptionRequestTable.status, "approved"),
      ),
    )
    .orderBy(
      desc(teamSubscriptionRequestTable.updatedAt),
      desc(teamSubscriptionRequestTable.id),
    )
    .limit(1);
  if (fallback?.tier) {
    return { tier: fallback.tier, source: "approved_team_request" };
  }
  return { tier: null, source: "none" };
}

async function withTeamPlanTier(team: TeamForMeRow | null): Promise<TeamForMe | null> {
  if (!team) return null;
  const { tier, source } = await resolveTeamPlanTier(team);
  return { ...team, planTier: tier, planTierSource: source };
}

function hasAssignedTeamContext(athlete: { team?: unknown; teamId?: number | null } | null | undefined): boolean {
  if (!athlete) return false;
  if (typeof athlete.teamId === "number" && Number.isFinite(athlete.teamId) && athlete.teamId > 0) return true;
  if (typeof athlete.team !== "string") return false;
  const team = athlete.team.trim().toLowerCase();
  return Boolean(team && !["unknown", "none", "n/a", "individual", "solo"].includes(team));
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
  try {
    await startEmailRegistration(input);
    return res.status(200).json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "status" in error && "message" in error) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Failed to send verification email";
    const isMailConfig =
      message.includes("SMTP_FROM") ||
      message.includes("SMTP_USER") ||
      message.includes("RESEND_API_KEY") ||
      message.includes("not configured") ||
      message.includes("Resend API");
    if (isMailConfig) {
      console.error("[Auth] OTP email failed:", message);
      return res.status(503).json({
        error: "Email delivery is not configured on this server. Please contact the administrator.",
      });
    }
    return res.status(502).json({ error: `Could not send verification email: ${message}` });
  }
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
  try {
    await resendLocal(input);
    return res.status(200).json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "status" in error && "message" in error) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Failed to send verification email";
    const isMailConfig =
      message.includes("SMTP_FROM") ||
      message.includes("SMTP_USER") ||
      message.includes("RESEND_API_KEY") ||
      message.includes("not configured") ||
      message.includes("Resend API");
    if (isMailConfig) {
      console.error("[Auth] Resend OTP email failed:", message);
      return res.status(503).json({
        error: "Email delivery is not configured on this server. Please contact the administrator.",
      });
    }
    return res.status(502).json({ error: `Could not send verification email: ${message}` });
  }
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  try {
    const response = await loginLocal(input);
    return res.status(200).json(response);
  } catch (error) {
    if (isLikelyDatabaseConnectivityFailure(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable" });
    }
    throw error;
  }
}

export async function refreshToken(_req: Request, res: Response) {
  return res.status(400).json({ error: "Refresh tokens are not used; sign in again to obtain a new access token." });
}

/**
 * Compatibility endpoint for clients expecting Better Auth's `GET /api/auth/get-session`.
 * We don't use cookie sessions in this API; return a lightweight bearer-derived shape when possible.
 */
export async function getSessionCompat(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.replace("Bearer ", "") : "";
  if (!token) {
    return res.status(200).json({ session: null, user: null });
  }

  try {
    const payload = await verifyAccessToken(token);
    const userId = Number(payload.user_id ?? Number.NaN);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(200).json({ session: null, user: null });
    }

    const user = await getUserById(userId);
    if (!user || user.isDeleted || user.isBlocked) {
      return res.status(200).json({ session: null, user: null });
    }

    return res.status(200).json({
      session: {
        userId: user.id,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: normalizeStoredMediaUrl(user.profilePicture ?? null),
        role: user.role,
      },
    });
  } catch (error) {
    if (isLikelyDatabaseConnectivityFailure(error)) {
      // Session checks should fail closed as "logged out" so clients never
      // keep a stale authenticated UI when DB verification is unavailable.
      return res.status(200).json({ session: null, user: null });
    }
    return res.status(200).json({ session: null, user: null });
  }
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
  const isCoachRole = isTrainingStaff(user.role);

  const coachManagedTeam = isCoachRole
    ? await withTeamPlanTier(
        (await db.select(teamForMeSelect).from(teamTable).where(eq(teamTable.adminId, user.id)).limit(1))[0] ?? null,
      )
    : null;

  // Coach/admin: managed team. Athletes/guardians: roster team (same shape) when `athletes.teamId` is set.
  const teamForUser = isCoachRole
    ? coachManagedTeam
    : await withTeamPlanTier(await resolveAthleteTeamForMe(athlete));
  const teamTierFallback = teamForUser?.planTier ?? null;
  const guardianTier = user.role === "guardian" ? (athlete?.guardianProgramTier ?? null) : null;
  const programTier = guardianTier ?? athlete?.currentProgramTier ?? teamTierFallback;
  const tierSource =
    guardianTier != null
      ? "guardian"
      : athlete?.currentProgramTier != null
        ? "athlete"
        : teamTierFallback != null
          ? "team"
          : "none";
  const capabilities = buildAppCapabilities({
    role: user.role,
    programTier,
    messagingAccessTiers,
    athleteType: athlete?.athleteType ?? null,
    hasTeam: hasAssignedTeamContext(athlete),
  });

  return res.status(200).json({
    user: {
      ...user,
      ...athlete, // Spread athlete data to include everything (trainingStats, planExpiresAt, etc.)
      // Athlete row `id` is the athlete PK; clients expect `user.id` = auth account id (`users.id`).
      id: user.id,
      // Preserve raw athlete team value if roster/team lookup returns null.
      team: teamForUser ?? athlete?.team ?? null,
      programTier,
      debugProgramAccess: {
        guardianProgramTier: guardianTier,
        athleteProgramTier: athlete?.currentProgramTier ?? null,
        teamProgramTier: teamTierFallback,
        teamPlanTierSource: teamForUser?.planTierSource ?? "none",
        teamPlanId: teamForUser?.planId ?? null,
        teamSubscriptionStatus: teamForUser?.subscriptionStatus ?? null,
        effectiveProgramTier: programTier,
        effectiveTierSource: tierSource,
        coachVideoUpload: capabilities.coachVideoUpload,
      },
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
      // Plan-level feature keys ("video_upload", "physio_referrals", etc.) for client-side gating.
      // Computed from the user's current plan; falls back to tier defaults when a plan has no features set.
      planFeatures: athlete?.id
        ? Array.from(await getFeaturesForAthlete(Number(athlete.id)))
        : Array.from(featuresForTier(programTier ?? null)),
      messagingAccessTiers,
      // Never let merged athlete/guardian payloads override the authenticated account identity.
      role: user.role,
      email: user.email,
      name: user.name && user.name !== "User" ? user.name : (athlete?.name ?? coachManagedTeam?.name ?? user.name),
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
