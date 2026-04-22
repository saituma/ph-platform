import crypto from "crypto";
import { and, desc, eq, ilike, inArray, notInArray, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { ROLES_ATHLETE } from "../../lib/user-roles";
import {
  athleteTable,
  guardianTable,
  userTable,
  teamTable,
  ProgramType,
  AthleteType,
  PlanPaymentType,
  legalAcceptanceTable,
  enrollmentTable,
  athleteTrainingSessionCompletionTable,
  athleteTrainingSessionWorkoutLogTable,
  programSectionCompletionTable,
  athleteTrainingSessionLogTable,
  athleteAchievementUnlockTable,
  athletePlanSessionTable,
  athletePlanExerciseTable,
  athletePlanExerciseCompletionTable,
  athletePlanSessionCompletionTable,
  referralGroupMemberTable,
  bookingTable,
  subscriptionRequestTable,
  videoUploadTable,
  foodDiaryTable,
  physioRefferalsTable,
} from "../../db/schema";
import { env } from "../../config/env";
import { sendAdminPasswordResetEmail, sendAdminWelcomeCredentialsEmail } from "../../lib/mailer";
import { ensureAthleteUserRecord, submitOnboarding } from "../onboarding.service";
import { getAthleteForUser, getUserByEmail, getUserById } from "../user.service";
import { calculateAge, parseISODate } from "../../lib/age";

export async function listUsers(options?: { q?: string; limit?: number }) {
  type ProgramTier = (typeof ProgramType.enumValues)[number];
  type AthleteTypeValue = (typeof AthleteType.enumValues)[number];
  const coerceProgramTier = (value?: string | null): ProgramTier | null =>
    ProgramType.enumValues.includes(value as ProgramTier) ? (value as ProgramTier) : null;
  const coerceAthleteType = (value?: string | null): AthleteTypeValue | null =>
    AthleteType.enumValues.includes(value as AthleteTypeValue) ? (value as AthleteTypeValue) : null;

  const q = options?.q?.trim() ?? "";
  const requestedLimit = options?.limit;
  const limit =
    typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(200, Math.floor(requestedLimit)))
      : undefined;

  // Keep data-repair behavior for full admin listing, but skip for targeted search.
  if (!q) {
    const staleAthletes = await db
      .select({ athlete: athleteTable, role: userTable.role })
      .from(athleteTable)
      .leftJoin(userTable, eq(athleteTable.userId, userTable.id))
      .where(notInArray(userTable.role, ROLES_ATHLETE));
    for (const row of staleAthletes) {
      if (row.athlete) {
        await ensureAthleteUserRecord(row.athlete);
      }
    }
  }

  const filterConditions = [eq(userTable.isDeleted, false)];
  if (q) {
    const pattern = `%${q}%`;
    filterConditions.push(
      or(
        ilike(userTable.name, pattern),
        ilike(userTable.email, pattern),
        sql`${userTable.role}::text ILIKE ${pattern}`,
        ilike(athleteTable.name, pattern),
        ilike(teamTable.name, pattern),
      )!,
    );
  }

  const baseUsersQuery = db
    .select({
      id: userTable.id,
      cognitoSub: userTable.cognitoSub,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      profilePicture: userTable.profilePicture,
      isBlocked: userTable.isBlocked,
      createdAt: userTable.createdAt,
      updatedAt: userTable.updatedAt,
      athleteId: athleteTable.id,
      athleteName: athleteTable.name,
      athleteTeam: teamTable.name,
      athleteAge: athleteTable.age,
      athleteType: athleteTable.athleteType,
      programTier: athleteTable.currentProgramTier,
      onboardingCompleted: sql<boolean>`
        coalesce(
          ${athleteTable.onboardingCompleted},
          (
            SELECT EXISTS (
              SELECT 1 FROM ${athleteTable} as a
              WHERE a."guardianId" = ${guardianTable.id}
              AND a."onboardingCompleted" = true
            )
          ),
          false
        )
      `.as("onboarding_completed"),
      guardianProgramTier: guardianTable.currentProgramTier,
    })
    .from(userTable)
    .leftJoin(athleteTable, eq(athleteTable.userId, userTable.id))
    .leftJoin(guardianTable, eq(guardianTable.userId, userTable.id))
    .leftJoin(teamTable, eq(athleteTable.teamId, teamTable.id))
    .where(and(...filterConditions))
    .orderBy(desc(userTable.updatedAt));

  const users = limit ? await baseUsersQuery.limit(limit) : await baseUsersQuery;

  const guardianUsers = users.filter((user) => user.role === "guardian");
  if (!guardianUsers.length) {
    return users;
  }

  const guardianUserIds = guardianUsers.map((user) => user.id);
  const guardians = await db
    .select({
      userId: guardianTable.userId,
      guardianId: guardianTable.id,
      activeAthleteId: guardianTable.activeAthleteId,
      guardianProgramTier: guardianTable.currentProgramTier,
    })
    .from(guardianTable)
    .where(inArray(guardianTable.userId, guardianUserIds));

  if (!guardians.length) {
    return users;
  }

  const guardianById = new Map<number, { userId: number; activeAthleteId: number | null }>();
  const guardianIdByUserId = new Map<number, number>();
  const guardianIds: number[] = [];
  for (const guardian of guardians) {
    guardianById.set(guardian.guardianId, {
      userId: guardian.userId,
      activeAthleteId: guardian.activeAthleteId ?? null,
    });
    guardianIdByUserId.set(guardian.userId, guardian.guardianId);
    guardianIds.push(guardian.guardianId);
  }

  const tierByUserId = new Map<number, ProgramTier | null>();
  for (const guardian of guardians) {
    const tier = coerceProgramTier(guardian.guardianProgramTier);
    if (tier) {
      tierByUserId.set(guardian.userId, tier);
    }
  }
  const activeAthleteIds = guardians
    .map((guardian) => guardian.activeAthleteId)
    .filter((id): id is number => typeof id === "number");

  const activeAthleteByGuardianId = new Map<
    number,
    {
      id: number;
      name: string | null;
      team: string | null;
      athleteType: AthleteTypeValue | null;
      programTier: ProgramTier | null;
    }
  >();

  if (activeAthleteIds.length) {
    const activeAthletes = await db
      .select({
        id: athleteTable.id,
        guardianId: athleteTable.guardianId,
        programTier: athleteTable.currentProgramTier,
        name: athleteTable.name,
        team: athleteTable.team,
        athleteType: athleteTable.athleteType,
      })
      .from(athleteTable)
      .where(inArray(athleteTable.id, activeAthleteIds));

    for (const athlete of activeAthletes) {
      if (!athlete.guardianId) continue;
      activeAthleteByGuardianId.set(athlete.guardianId, {
        id: athlete.id,
        name: athlete.name,
        team: athlete.team,
        athleteType: coerceAthleteType(athlete.athleteType),
        programTier: coerceProgramTier(athlete.programTier),
      });
      const guardian = guardianById.get(athlete.guardianId);
      if (!guardian) continue;
      const tier = coerceProgramTier(athlete.programTier);
      if (!tier) continue;
      if (tierByUserId.has(guardian.userId)) continue;
      tierByUserId.set(guardian.userId, tier);
    }
  }

  const missingGuardianIds = guardianIds.filter((guardianId) => {
    const guardian = guardianById.get(guardianId);
    if (!guardian) return false;
    return !tierByUserId.has(guardian.userId);
  });

  if (missingGuardianIds.length) {
    const fallbackAthletes = await db
      .select({
        guardianId: athleteTable.guardianId,
        programTier: athleteTable.currentProgramTier,
        createdAt: athleteTable.createdAt,
      })
      .from(athleteTable)
      .where(inArray(athleteTable.guardianId, missingGuardianIds))
      .orderBy(athleteTable.guardianId, athleteTable.createdAt);

    for (const athlete of fallbackAthletes) {
      if (!athlete.guardianId) continue;
      const guardian = guardianById.get(athlete.guardianId);
      if (!guardian || tierByUserId.has(guardian.userId)) continue;
      const tier = coerceProgramTier(athlete.programTier);
      if (tier) {
        tierByUserId.set(guardian.userId, tier);
      }
    }
  }

  return users.map((user) => {
    if (user.role !== "guardian") return user;
    const resolvedTier = tierByUserId.get(user.id);
    const guardianId = guardianIdByUserId.get(user.id);
    const activeAthlete = typeof guardianId === "number" ? activeAthleteByGuardianId.get(guardianId) : undefined;

    const next = { ...user };
    if (resolvedTier) {
      next.programTier = resolvedTier;
    }
    if (!next.athleteId && activeAthlete) {
      next.athleteId = activeAthlete.id;
      next.athleteName = activeAthlete.name;
      next.athleteTeam = activeAthlete.team;
      next.athleteType = activeAthlete.athleteType;
      if (!next.programTier && activeAthlete.programTier) {
        next.programTier = activeAthlete.programTier;
      }
    }
    return next;
  });
}

export async function setUserBlocked(userId: number, blocked: boolean) {
  const result = await db
    .update(userTable)
    .set({ isBlocked: blocked, updatedAt: new Date() })
    .where(eq(userTable.id, userId))
    .returning();
  return result[0] ?? null;
}

export async function softDeleteUser(userId: number) {
  const existing = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
  const user = existing[0] ?? null;
  if (!user) return null;

  const now = new Date();
  const stamp = `${user.id}-${Date.now()}`;
  const deletedEmail = `deleted+${stamp}@deleted.local`;
  const deletedSub = `deleted:${stamp}`;

  const result = await db.transaction(async (tx) => {
    const guardians = await tx
      .select({ id: guardianTable.id })
      .from(guardianTable)
      .where(eq(guardianTable.userId, userId));
    const guardianIds = guardians.map((g) => g.id);

    const athletesByUser = await tx
      .select({ id: athleteTable.id, guardianId: athleteTable.guardianId, userId: athleteTable.userId })
      .from(athleteTable)
      .where(eq(athleteTable.userId, userId));

    const athletesByGuardian = guardianIds.length
      ? await tx
          .select({ id: athleteTable.id, guardianId: athleteTable.guardianId, userId: athleteTable.userId })
          .from(athleteTable)
          .where(inArray(athleteTable.guardianId, guardianIds))
      : [];

    const athleteMap = new Map<number, { id: number; userId: number }>();
    for (const row of [...athletesByUser, ...athletesByGuardian]) {
      athleteMap.set(row.id, { id: row.id, userId: row.userId });
    }
    const athleteRows = Array.from(athleteMap.values());
    const athleteIds = athleteRows.map((row) => row.id);

    if (athleteIds.length) {
      await tx
        .update(guardianTable)
        .set({ activeAthleteId: null, updatedAt: now })
        .where(inArray(guardianTable.activeAthleteId, athleteIds));

      await tx
        .delete(athletePlanExerciseCompletionTable)
        .where(inArray(athletePlanExerciseCompletionTable.athleteId, athleteIds));
      await tx
        .delete(athletePlanSessionCompletionTable)
        .where(inArray(athletePlanSessionCompletionTable.athleteId, athleteIds));
      await tx
        .delete(athleteTrainingSessionCompletionTable)
        .where(inArray(athleteTrainingSessionCompletionTable.athleteId, athleteIds));
      await tx
        .delete(athleteTrainingSessionWorkoutLogTable)
        .where(inArray(athleteTrainingSessionWorkoutLogTable.athleteId, athleteIds));
      await tx
        .delete(programSectionCompletionTable)
        .where(inArray(programSectionCompletionTable.athleteId, athleteIds));
      await tx
        .delete(athleteTrainingSessionLogTable)
        .where(inArray(athleteTrainingSessionLogTable.athleteId, athleteIds));
      await tx
        .delete(athleteAchievementUnlockTable)
        .where(inArray(athleteAchievementUnlockTable.athleteId, athleteIds));
      await tx.delete(referralGroupMemberTable).where(inArray(referralGroupMemberTable.athleteId, athleteIds));
      await tx.delete(subscriptionRequestTable).where(inArray(subscriptionRequestTable.athleteId, athleteIds));
      await tx.delete(videoUploadTable).where(inArray(videoUploadTable.athleteId, athleteIds));
      await tx.delete(physioRefferalsTable).where(inArray(physioRefferalsTable.athleteId, athleteIds));
      await tx.delete(legalAcceptanceTable).where(inArray(legalAcceptanceTable.athleteId, athleteIds));
      await tx.delete(enrollmentTable).where(inArray(enrollmentTable.athleteId, athleteIds));
      await tx.delete(bookingTable).where(inArray(bookingTable.athleteId, athleteIds));
      await tx.delete(foodDiaryTable).where(inArray(foodDiaryTable.athleteId, athleteIds));

      const planSessions = await tx
        .select({ id: athletePlanSessionTable.id })
        .from(athletePlanSessionTable)
        .where(inArray(athletePlanSessionTable.athleteId, athleteIds));
      const planSessionIds = planSessions.map((row) => row.id);

      if (planSessionIds.length) {
        const planExercises = await tx
          .select({ id: athletePlanExerciseTable.id })
          .from(athletePlanExerciseTable)
          .where(inArray(athletePlanExerciseTable.planSessionId, planSessionIds));
        const planExerciseIds = planExercises.map((row) => row.id);

        if (planExerciseIds.length) {
          await tx
            .delete(athletePlanExerciseCompletionTable)
            .where(inArray(athletePlanExerciseCompletionTable.planExerciseId, planExerciseIds));
          await tx.delete(athletePlanExerciseTable).where(inArray(athletePlanExerciseTable.id, planExerciseIds));
        }

        await tx
          .delete(athletePlanSessionCompletionTable)
          .where(inArray(athletePlanSessionCompletionTable.planSessionId, planSessionIds));
        await tx.delete(athletePlanSessionTable).where(inArray(athletePlanSessionTable.id, planSessionIds));
      }

      await tx.delete(athleteTable).where(inArray(athleteTable.id, athleteIds));
    }

    if (guardianIds.length) {
      await tx.delete(bookingTable).where(inArray(bookingTable.guardianId, guardianIds));
      await tx.delete(foodDiaryTable).where(inArray(foodDiaryTable.guardianId, guardianIds));
      await tx.delete(guardianTable).where(inArray(guardianTable.id, guardianIds));
    }

    const athleteUserIds = athleteRows.map((row) => row.userId).filter((id) => id !== userId);
    for (const athleteUserId of athleteUserIds) {
      const athleteStamp = `${athleteUserId}-${Date.now()}`;
      await tx
        .update(userTable)
        .set({
          isDeleted: true,
          isBlocked: false,
          role: "athlete",
          name: `Deleted Athlete ${athleteUserId}`,
          email: `deleted+${athleteStamp}@deleted.local`,
          cognitoSub: `deleted:${athleteStamp}`,
          profilePicture: null,
          passwordHash: null,
          passwordSalt: null,
          emailVerified: false,
          verificationCode: null,
          verificationExpiresAt: null,
          verificationAttempts: 0,
          tokenVersion: sql`${userTable.tokenVersion} + 1`,
          expoPushToken: null,
          updatedAt: now,
        })
        .where(eq(userTable.id, athleteUserId));
    }

    const updated = await tx
      .update(userTable)
      .set({
        isDeleted: true,
        isBlocked: false,
        name: `Deleted User ${user.id}`,
        email: deletedEmail,
        cognitoSub: deletedSub,
        profilePicture: null,
        passwordHash: null,
        passwordSalt: null,
        emailVerified: false,
        verificationCode: null,
        verificationExpiresAt: null,
        verificationAttempts: 0,
        tokenVersion: sql`${userTable.tokenVersion} + 1`,
        expoPushToken: null,
        updatedAt: now,
      })
      .where(eq(userTable.id, userId))
      .returning();

    return updated[0] ?? null;
  });

  return result;
}

export async function getUserOnboarding(userId: number) {
  const guardians = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  const guardian = guardians[0] ?? null;
  const athlete = await getAthleteForUser(userId);
  return { guardian, athlete };
}

export async function updateAthleteProgramTier(athleteId: number, tier: (typeof ProgramType.enumValues)[number]) {
  const result = await db
    .update(athleteTable)
    .set({ currentProgramTier: tier })
    .where(eq(athleteTable.id, athleteId))
    .returning();

  return result[0] ?? null;
}

function generateProvisionPassword() {
  const base = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let out = "";
  for (let i = 0; i < 20; i += 1) {
    out += base[Math.floor(Math.random() * base.length)];
  }
  return out;
}

function resolveProvisionPassword(input?: string | null) {
  const candidate = input?.trim() ?? "";
  if (!candidate) return generateProvisionPassword();
  return candidate;
}

function hashLocalProvisionPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function computePlanExpiryFromCommitment(months: 6 | 12) {
  const end = new Date();
  end.setMonth(end.getMonth() + months);
  end.setHours(23, 59, 59, 999);
  return end;
}

export type CreateGuardianWithOnboardingAdminInput = {
  email: string;
  guardianDisplayName: string;
  athleteName: string;
  birthDate: string;
  team?: string | null;
  trainingPerWeek: number;
  injuries?: unknown;
  growthNotes?: string | null;
  performanceGoals?: string | null;
  equipmentAccess?: string | null;
  parentPhone?: string | null;
  relationToAthlete?: string | null;
  desiredProgramType?: (typeof ProgramType.enumValues)[number];
  athleteProfilePicture?: string | null;
  planPaymentType: (typeof PlanPaymentType.enumValues)[number];
  planCommitmentMonths: 6 | 12;
  termsVersion: string;
  privacyVersion: string;
  appVersion: string;
  initialPassword?: string;
  extraResponses?: Record<string, unknown>;
};

export type CreateAdultAthleteAdminInput = {
  email: string;
  athleteName: string;
  birthDate: string;
  team?: string | null;
  trainingPerWeek: number;
  injuries?: unknown;
  growthNotes?: string | null;
  performanceGoals?: string | null;
  equipmentAccess?: string | null;
  desiredProgramType?: (typeof ProgramType.enumValues)[number] | null;
  athleteProfilePicture?: string | null;
  planPaymentType: (typeof PlanPaymentType.enumValues)[number];
  planCommitmentMonths: 6 | 12;
  termsVersion: string;
  privacyVersion: string;
  appVersion: string;
  initialPassword?: string;
  extraResponses?: Record<string, unknown>;
};

export async function createGuardianWithOnboardingAdmin(input: CreateGuardianWithOnboardingAdminInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await getUserByEmail(email);
  if (existing) {
    throw { status: 409, message: "An account with this email already exists." };
  }

  const resolvedTeam = input.team?.trim() || "";

  const tempPassword = resolveProvisionPassword(input.initialPassword);
  let userId: number | null = null;
  const createdEmail = email;

  try {
    const { hash, salt } = hashLocalProvisionPassword(tempPassword);
    const inserted = await db
      .insert(userTable)
      .values({
        cognitoSub: `local:${crypto.randomUUID()}`,
        name: input.guardianDisplayName.trim(),
        email,
        role: "guardian",
        passwordHash: hash,
        passwordSalt: salt,
        emailVerified: true,
        verificationCode: null,
        verificationExpiresAt: null,
        verificationAttempts: 0,
      })
      .returning();
    userId = inserted[0]?.id ?? null;
    if (!userId) {
      throw new Error("User insert failed");
    }

    const onboardingResult = await submitOnboarding({
      userId: userId!,
      athleteName: input.athleteName.trim(),
      birthDate: input.birthDate,
      team: resolvedTeam,
      trainingPerWeek: input.trainingPerWeek,
      injuries: input.injuries,
      growthNotes: input.growthNotes ?? null,
      performanceGoals: input.performanceGoals ?? null,
      equipmentAccess: input.equipmentAccess ?? null,
      parentEmail: email,
      parentPhone: input.parentPhone ?? null,
      relationToAthlete: input.relationToAthlete ?? null,
      desiredProgramType: input.desiredProgramType ?? undefined,
      termsVersion: input.termsVersion,
      privacyVersion: input.privacyVersion,
      appVersion: input.appVersion,
      extraResponses: input.extraResponses,
    });

    const commitmentExpiry = computePlanExpiryFromCommitment(input.planCommitmentMonths);
    await db
      .update(athleteTable)
      .set({
        planPaymentType: input.planPaymentType,
        planCommitmentMonths: input.planCommitmentMonths,
        planExpiresAt: commitmentExpiry,
        profilePicture: input.athleteProfilePicture?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(athleteTable.id, onboardingResult.athleteId));

    if (onboardingResult.athleteUserId) {
      await db
        .update(userTable)
        .set({ profilePicture: input.athleteProfilePicture?.trim() || null, updatedAt: new Date() })
        .where(eq(userTable.id, onboardingResult.athleteUserId));
    }

    let emailSent = true;
    try {
      await sendAdminWelcomeCredentialsEmail({
        to: email,
        guardianName: input.guardianDisplayName.trim(),
        temporaryPassword: tempPassword,
      });
    } catch (mailErr) {
      console.error("[admin] Welcome email failed after provisioning", mailErr);
      emailSent = false;
    }

    return {
      userId: userId!,
      athleteId: onboardingResult.athleteId,
      athleteUserId: onboardingResult.athleteUserId,
      status: onboardingResult.status,
      emailSent,
    };
  } catch (error: any) {
    if (userId) {
      await softDeleteUser(userId);
    }
    throw error;
  }
}

export async function createAdultAthleteAdmin(input: CreateAdultAthleteAdminInput) {
  const email = input.email.trim().toLowerCase();
  const athleteName = input.athleteName.trim();
  const existing = await getUserByEmail(email);
  if (existing) {
    throw { status: 409, message: "An account with this email already exists." };
  }

  const parsedBirthDate = parseISODate(input.birthDate);
  if (!parsedBirthDate) {
    throw { status: 400, message: "Birth date is invalid." };
  }
  const age = calculateAge(parsedBirthDate, new Date());
  if (age < 18) {
    throw { status: 400, message: "Adult athletes must be 18 or older." };
  }

  const desiredProgramType = input.desiredProgramType ?? null;
  const resolvedTeam = input.team?.trim() || "";
  const planExpiresAt = computePlanExpiryFromCommitment(input.planCommitmentMonths);

  const tempPassword = resolveProvisionPassword(input.initialPassword);
  let userId: number | null = null;
  const createdEmail = email;

  try {
    const { hash, salt } = hashLocalProvisionPassword(tempPassword);
    const inserted = await db
      .insert(userTable)
      .values({
        cognitoSub: `local:${crypto.randomUUID()}`,
        name: athleteName,
        email,
        role: "adult_athlete",
        passwordHash: hash,
        passwordSalt: salt,
        emailVerified: true,
        verificationCode: null,
        verificationExpiresAt: null,
        verificationAttempts: 0,
      })
      .returning();
    userId = inserted[0]?.id ?? null;
    if (!userId) {
      throw new Error("User insert failed");
    }

    const now = new Date();
    const insertedAthlete = await db
      .insert(athleteTable)
      .values({
        userId: userId!,
        guardianId: null,
        athleteType: "adult" as (typeof AthleteType.enumValues)[number],
        name: athleteName,
        age,
        birthDate: input.birthDate,
        team: resolvedTeam,
        trainingPerWeek: input.trainingPerWeek,
        injuries: input.injuries ?? null,
        growthNotes: input.growthNotes ?? null,
        performanceGoals: input.performanceGoals ?? null,
        equipmentAccess: input.equipmentAccess ?? null,
        extraResponses: input.extraResponses ?? null,
        currentProgramTier: desiredProgramType,
        profilePicture: input.athleteProfilePicture?.trim() || null,
        planPaymentType: input.planPaymentType,
        planCommitmentMonths: input.planCommitmentMonths,
        planExpiresAt,
        onboardingCompleted: true,
        onboardingCompletedAt: now,
      })
      .returning();
    const athlete = insertedAthlete[0];
    if (!athlete) {
      throw new Error("Athlete row insert failed.");
    }

    if (athlete.userId) {
      await db
        .update(userTable)
        .set({ profilePicture: input.athleteProfilePicture?.trim() || null, updatedAt: new Date() })
        .where(eq(userTable.id, athlete.userId));
    }

    await db.insert(legalAcceptanceTable).values({
      athleteId: athlete.id,
      termsAcceptedAt: now,
      termsVersion: input.termsVersion,
      privacyAcceptedAt: now,
      privacyVersion: input.privacyVersion,
      appVersion: input.appVersion,
    });

    if (desiredProgramType) {
      await db.insert(enrollmentTable).values({
        athleteId: athlete.id,
        programType: desiredProgramType,
        status: "active",
        assignedByCoach: null,
      });
    }

    let emailSent = true;
    try {
      await sendAdminWelcomeCredentialsEmail({
        to: email,
        guardianName: athleteName,
        temporaryPassword: tempPassword,
      });
    } catch (mailErr) {
      console.error("[admin] Adult welcome email failed after provisioning", mailErr);
      emailSent = false;
    }

    return {
      userId: userId!,
      athleteId: athlete.id,
      athleteUserId: athlete.userId,
      status: desiredProgramType ? "active" : "completed",
      emailSent,
    };
  } catch (error: any) {
    if (userId) {
      await softDeleteUser(userId);
    }
    throw error;
  }
}

export async function resetUserPasswordAdmin(input: { userId: number; temporaryPassword?: string | null }) {
  const user = await getUserById(input.userId);
  if (!user) {
    throw { status: 404, message: "User not found." };
  }

  const nextPassword = resolveProvisionPassword(input.temporaryPassword);

  const { hash, salt } = hashLocalProvisionPassword(nextPassword);
  await db
    .update(userTable)
    .set({
      passwordHash: hash,
      passwordSalt: salt,
      tokenVersion: (user.tokenVersion ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, user.id));

  let emailSent = true;
  try {
    await sendAdminPasswordResetEmail({
      to: user.email,
      displayName: user.name,
      temporaryPassword: nextPassword,
    });
  } catch (mailErr) {
    console.error("[admin] Password reset email failed", mailErr);
    emailSent = false;
  }

  return {
    ok: true,
    temporaryPassword: nextPassword,
    emailSent,
    generated: !(input.temporaryPassword ?? "").trim(),
  };
}
