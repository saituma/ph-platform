import type { Request, Response } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";

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
import { sendDeletionRequestEmail } from "../lib/mailer/auth.mailer";
import { normalizeStoredMediaUrl } from "../services/s3.service";
import { createSocketToken, verifyAccessToken } from "../lib/jwt";
import { getUserById, updateUserProfile } from "../services/user.service";
import { getOnboardingByUser } from "../services/onboarding.service";
import { findManagedTeamIdForUser } from "../services/team-membership";
import { getMessagingAccessTiers } from "../services/messaging-policy.service";
import { buildAppCapabilities } from "../services/app-capabilities.service";
import { db } from "../db";
import { ProgramType, athleteTable, preseasonProgrammeAssignmentTable, subscriptionPlanTable, teamSubscriptionRequestTable, teamTable, userTable } from "../db/schema";
import { and, desc, eq } from "drizzle-orm";
import { isTrainingStaff } from "../lib/user-roles";
import { env } from "../config/env";
import { cache, cacheKeys } from "../lib/cache";
import { isLikelyDatabaseConnectivityFailure } from "../lib/db-connectivity";
import { featuresForTier, getFeaturesForAthlete } from "../services/billing/feature-access.service";
import { getPortalConfig } from "../services/admin/portal-config.service";

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
  accessTierOverride: (typeof ProgramType.enumValues)[number] | null;
  createdAt: Date;
  updatedAt: Date;
};

type TeamForMe = TeamForMeRow & {
  planTier: (typeof ProgramType.enumValues)[number] | null;
  planTierSource: "team_plan" | "approved_team_request" | "team_athlete_tier" | "team_override" | "none";
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
  accessTierOverride: teamTable.accessTierOverride,
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
  const [row] = tid ? await db.select(teamForMeSelect).from(teamTable).where(eq(teamTable.id, tid)).limit(1) : [];
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
  accessTierOverride?: (typeof ProgramType.enumValues)[number] | null;
}): Promise<{
  tier: (typeof ProgramType.enumValues)[number] | null;
  source: "team_plan" | "approved_team_request" | "team_athlete_tier" | "team_override" | "none";
}> {
  // Durable admin override wins over everything else.
  if (team.accessTierOverride) {
    return { tier: team.accessTierOverride, source: "team_override" };
  }

  const [approvedRequest] = await db
    .select({
      tier: subscriptionPlanTable.tier,
      accessTierOverride: teamSubscriptionRequestTable.accessTierOverride,
    })
    .from(teamSubscriptionRequestTable)
    .innerJoin(subscriptionPlanTable, eq(teamSubscriptionRequestTable.planId, subscriptionPlanTable.id))
    .where(and(eq(teamSubscriptionRequestTable.teamId, team.id), eq(teamSubscriptionRequestTable.status, "approved")))
    .orderBy(desc(teamSubscriptionRequestTable.updatedAt), desc(teamSubscriptionRequestTable.id))
    .limit(1);

  if (approvedRequest?.accessTierOverride) {
    return { tier: approvedRequest.accessTierOverride, source: "approved_team_request" };
  }

  const teamAthleteTiers = await db
    .select({ tier: athleteTable.currentProgramTier })
    .from(athleteTable)
    .where(eq(athleteTable.teamId, team.id));
  const uniformAthleteTiers = Array.from(new Set(teamAthleteTiers.map((row) => row.tier).filter(Boolean)));
  if (uniformAthleteTiers.length === 1) {
    return {
      tier: uniformAthleteTiers[0] as (typeof ProgramType.enumValues)[number],
      source: "team_athlete_tier",
    };
  }

  const planId = team.planId;
  if (planId && Number.isFinite(planId) && planId > 0) {
    const [row] = await db
      .select({ tier: subscriptionPlanTable.tier })
      .from(subscriptionPlanTable)
      .where(eq(subscriptionPlanTable.id, planId))
      .limit(1);
    if (row?.tier) return { tier: row.tier, source: "team_plan" };
  }

  if (approvedRequest?.tier) {
    return { tier: approvedRequest.tier, source: "approved_team_request" };
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
  referralCode: z.string().optional(),
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
    coverImage: z.string().url().nullable().optional(),
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
      logger.error({ message }, "[Auth] OTP email failed");
      return res.status(503).json({
        error: "Email delivery is not configured on this server. Please contact the administrator.",
      });
    }
    return res.status(502).json({ error: `Could not send verification email: ${message}` });
  }
}

export async function updateRole(req: Request, res: Response) {
  const input = updateRoleSchema.parse(req.body);
  // Enforce that a user can only update their own role
  if (input.email.toLowerCase() !== req.user!.email.toLowerCase()) {
    return res.status(403).json({ error: "Forbidden" });
  }
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
      logger.error({ message }, "[Auth] Resend OTP email failed");
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
        coverImage: normalizeStoredMediaUrl(user.coverImage ?? null),
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
  try {
    await startForgotPasswordLocal(input);
  } catch (e: any) {
    // Always return 200 for 404/403 to prevent email enumeration.
    // 5xx errors still propagate so the client can show a real failure.
    if (e?.status === 404 || e?.status === 403) {
      return res.status(200).json({ ok: true });
    }
    throw e;
  }
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
  if (!userId || !Number.isFinite(userId)) {
    return res.status(400).json({ error: "Invalid token payload" });
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

  const payload = await cache.getOrSet(cacheKeys.userProfile(user.id), 60, async () => {
    const [dbUser, athleteData, messagingAccessTiers, portalConfig] = await Promise.all([
      getUserById(user.id),
      getOnboardingByUser(user.id),
      getMessagingAccessTiers(),
      getPortalConfig(),
    ]);

    const fullUser = dbUser ?? user;
    const athlete = athleteData as any;
    const isCoachRole = isTrainingStaff(fullUser.role);

    const coachManagedTeamId = isCoachRole ? await findManagedTeamIdForUser(fullUser.id) : null;
    const coachManagedTeam = coachManagedTeamId
      ? await withTeamPlanTier(
          (await db.select(teamForMeSelect).from(teamTable).where(eq(teamTable.id, coachManagedTeamId)).limit(1))[0] ??
            null,
        )
      : null;

    const teamForUser = isCoachRole ? coachManagedTeam : await withTeamPlanTier(await resolveAthleteTeamForMe(athlete));
    const teamTierFallback = teamForUser?.planTier ?? null;
    const guardianTier = fullUser.role === "guardian" ? (athlete?.guardianProgramTier ?? null) : null;
    // If the athlete's team is pending approval, suppress any manually-set athlete tier so it
    // cannot leak premium access before the admin has approved the team subscription.
    const teamIsPending =
      teamForUser != null &&
      ["pending_approval", "pending_payment"].includes(teamForUser.subscriptionStatus ?? "");
    const athleteTier = teamIsPending ? null : (athlete?.currentProgramTier ?? null);
    const programTier = guardianTier ?? athleteTier ?? teamTierFallback;
    const tierSource =
      guardianTier != null
        ? "guardian"
        : athleteTier != null
          ? "athlete"
          : teamTierFallback != null
            ? "team"
            : "none";
    const planFeatures = athlete?.id
      ? await getFeaturesForAthlete(Number(athlete.id))
      : featuresForTier(programTier ?? null);
    const hasPreseasonAssignment = athlete?.id
      ? await db
          .select({ id: preseasonProgrammeAssignmentTable.id })
          .from(preseasonProgrammeAssignmentTable)
          .where(eq(preseasonProgrammeAssignmentTable.athleteId, Number(athlete.id)))
          .limit(1)
          .then((rows) => rows.length > 0)
      : false;
    // planPaymentType is set when a plan is assigned (admin or subscription flow)
    // and is never cleared by the expiry sweep — reliable signal for "was a paying user".
    const hadPreviousPlan = athlete?.planPaymentType != null;

    const capabilities = buildAppCapabilities({
      role: fullUser.role,
      programTier,
      messagingAccessTiers,
      athleteType: athlete?.athleteType ?? null,
      hasTeam: hasAssignedTeamContext(athlete),
      planFeatures,
      hasActivePlan: athlete?.currentPlanId != null,
      youthTrackingEnabled: athlete?.youthTrackingEnabled ?? false,
      hasPreseasonAssignment,
      hadPreviousPlan,
    });

    return {
      ...fullUser,
      ...athlete,
      id: fullUser.id,
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
      // Coaches/admins never go through athlete onboarding — report null (not false) so the
      // app treats them as complete instead of forcing the onboarding website.
      onboardingCompleted: isCoachRole ? null : (athlete?.onboardingCompleted ?? false),
      trainingStats: athlete?.trainingStats ?? null,
      allAthletes: athlete?.allAthletes
        ? (athlete.allAthletes as any[]).map(({ allAthletes: _, ...a }) => a)
        : null,
      capabilities,
      planFeatures: Array.from(planFeatures),
      messagingAccessTiers,
      expiryBanner: portalConfig.expiryBanner,
      role: fullUser.role,
      email: fullUser.email,
      name:
        fullUser.name && fullUser.name !== "User"
          ? fullUser.name
          : (athlete?.name ?? coachManagedTeam?.name ?? fullUser.name),
    };
  });

  if (
    env.nodeEnv !== "production" &&
    String(payload?.email ?? "")
      .trim()
      .toLowerCase() === "dawitanother@gmail.com"
  ) {
    logger.info(
      {
        marker: "portal-debug",
        route: "GET /api/auth/me",
        userId: payload.id,
        email: payload.email,
        role: payload.role,
        athleteId: payload.athleteId,
        onboardingCompleted: payload.onboardingCompleted,
        birthDate: payload.birthDate,
        trainingPerWeek: payload.trainingPerWeek,
        performanceGoalsPresent: Boolean(String(payload.performanceGoals ?? "").trim()),
        phonePresent: Boolean(String(payload.phoneNumber ?? "").trim()),
        equipmentAccessPresent: Boolean(String(payload.equipmentAccess ?? "").trim()),
        currentProgramTier: payload.programTier,
        planExpiresAt: payload.planExpiresAt,
      },
      "[portal-debug] auth me snapshot",
    );
  }

  return res.status(200).json({
    user: {
      ...payload,
      profilePicture: normalizeStoredMediaUrl(payload.profilePicture ?? null),
      coverImage: normalizeStoredMediaUrl(payload.coverImage ?? null),
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

const requestDeletionSchema = z.object({
  email: z.string().email().max(255),
});

export async function requestAccountDeletion(req: Request, res: Response) {
  const parsed = requestDeletionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "A valid email address is required." });
  }
  try {
    const [user] = await db
      .select({ id: userTable.id, email: userTable.email })
      .from(userTable)
      .where(eq(userTable.email, parsed.data.email.toLowerCase()))
      .limit(1);
    if (user) {
      await sendDeletionRequestEmail({ to: user.email });
    }
  } catch (err) {
    logger.error({ err }, "requestAccountDeletion: failed to process");
  }
  // Always return 200 — never reveal whether the email exists
  return res.status(200).json({ ok: true });
}

export async function issueSocketToken(req: Request, res: Response) {
  const { id, role } = req.user!;
  const token = await createSocketToken(id, role);
  return res.json({ token, expiresAt: Math.floor(Date.now() / 1000) + 60 });
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
  void cache.del(cacheKeys.authUser(req.user!.id));
  void cache.del(cacheKeys.userProfile(req.user!.id));
  return res.status(200).json({
    user: {
      id: updated.id,
      role: updated.role,
      email: updated.email,
      name: updated.name,
      profilePicture: normalizeStoredMediaUrl(updated.profilePicture ?? null),
      coverImage: normalizeStoredMediaUrl(updated.coverImage ?? null),
    },
  });
}
