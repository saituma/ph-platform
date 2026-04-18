import { and, desc, eq } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, guardianTable, userTable, teamTable } from "../db/schema";

export async function getUserByCognitoSub(sub: string) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.cognitoSub, sub), eq(userTable.isDeleted, false)))
    .limit(1);
  return users[0] ?? null;
}

export async function getUserById(id: number) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.id, id), eq(userTable.isDeleted, false)))
    .limit(1);
  return users[0] ?? null;
}

export async function getUserByEmail(email: string) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, email), eq(userTable.isDeleted, false)))
    .limit(1);
  return users[0] ?? null;
}

/**
 * After self-delete (soft), the row stays with isDeleted=true. Re-signup with the same email must revive it
 * instead of inserting (avoids unique-email failures and orphaned FKs).
 */
export async function reviveSoftDeletedUserForCognito(input: {
  sub: string;
  email: string;
  name: string;
  role?: "guardian" | "athlete" | "coach" | "admin" | "superAdmin";
}) {
  const rows = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, input.email), eq(userTable.isDeleted, true)))
    .orderBy(desc(userTable.id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const [updated] = await db
    .update(userTable)
    .set({
      cognitoSub: input.sub,
      name: input.name,
      role: input.role ?? row.role,
      isDeleted: false,
      isBlocked: false,
      emailVerified: true,
      verificationCode: null,
      verificationExpiresAt: null,
      verificationAttempts: 0,
      tokenVersion: (row.tokenVersion ?? 0) + 1,
      expoPushToken: null,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, row.id))
    .returning();

  return updated ?? null;
}

export async function createUserFromCognito(input: {
  sub: string;
  email: string;
  name: string;
  role?: "guardian" | "athlete" | "coach" | "admin" | "superAdmin";
}) {
  const revived = await reviveSoftDeletedUserForCognito(input);
  if (revived) return revived;

  const result = await db
    .insert(userTable)
    .values({
      cognitoSub: input.sub,
      email: input.email,
      name: input.name,
      role: input.role,
    })
    .returning();

  return result[0];
}

export async function updateUserRole(
  userId: number,
  role: "guardian" | "athlete" | "coach" | "admin" | "superAdmin"
) {
  const result = await db
    .update(userTable)
    .set({ role })
    .where(eq(userTable.id, userId))
    .returning();

  return result[0] ?? null;
}

export async function updateUserProfile(
  userId: number,
  input: { name?: string; profilePicture?: string | null }
) {
  const result = await db
    .update(userTable)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.profilePicture !== undefined ? { profilePicture: input.profilePicture } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(userTable.id, userId), eq(userTable.isDeleted, false)))
    .returning();

  const updated = result[0] ?? null;
  if (!updated) return null;

  if (input.profilePicture !== undefined && updated.role === "athlete") {
    await syncAthleteProfilePictureForUser(updated.id, input.profilePicture);
  }

  return updated;
}

export async function syncAthleteProfilePictureForUser(userId: number, profilePicture: string | null) {
  await db
    .update(athleteTable)
    .set({ profilePicture, updatedAt: new Date() })
    .where(eq(athleteTable.userId, userId));
}

export async function getGuardianAndAthlete(userId: number) {
  const guardians = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  const guardian = guardians[0] ?? null;
  if (!guardian) {
    return { guardian: null, athlete: null };
  }
  let athlete = null as (typeof athleteTable.$inferSelect | null);
  if (guardian.activeAthleteId) {
    const active = await db
      .select()
      .from(athleteTable)
      .where(eq(athleteTable.id, guardian.activeAthleteId))
      .limit(1);
    athlete = active[0] ?? null;
  }
  if (!athlete) {
    const athletes = await db
      .select()
      .from(athleteTable)
      .where(eq(athleteTable.guardianId, guardian.id))
      .orderBy(athleteTable.createdAt)
      .limit(1);
    athlete = athletes[0] ?? null;
    if (athlete && !guardian.activeAthleteId) {
      await db
        .update(guardianTable)
        .set({ activeAthleteId: athlete.id, updatedAt: new Date() })
        .where(eq(guardianTable.id, guardian.id));
    }
  }
  return { guardian, athlete };
}

export async function getAthleteForUser(userId: number) {
  const directAthlete = await db
    .select({
      id: athleteTable.id,
      userId: athleteTable.userId,
      guardianId: athleteTable.guardianId,
      athleteType: athleteTable.athleteType,
      name: athleteTable.name,
      age: athleteTable.age,
      birthDate: athleteTable.birthDate,
      teamId: athleteTable.teamId,
      team: teamTable.name,
      trainingPerWeek: athleteTable.trainingPerWeek,
      injuries: athleteTable.injuries,
      growthNotes: athleteTable.growthNotes,
      performanceGoals: athleteTable.performanceGoals,
      equipmentAccess: athleteTable.equipmentAccess,
      profilePicture: athleteTable.profilePicture,
      currentProgramTier: athleteTable.currentProgramTier,
      planExpiresAt: athleteTable.planExpiresAt,
      onboardingCompleted: athleteTable.onboardingCompleted,
      extraResponses: athleteTable.extraResponses,
      createdAt: athleteTable.createdAt,
      updatedAt: athleteTable.updatedAt,
      phoneNumber: guardianTable.phoneNumber,
    })
    .from(athleteTable)
    .leftJoin(teamTable, eq(athleteTable.teamId, teamTable.id))
    .leftJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .where(eq(athleteTable.userId, userId))
    .limit(1);

  if (directAthlete[0]) {
    return directAthlete[0];
  }
  const { athlete } = await getGuardianAndAthlete(userId);
  if (!athlete) return null;

  // For guardian-owned athletes, we also need to join the team name and phone
  const [athleteWithTeam] = await db
    .select({
      id: athleteTable.id,
      userId: athleteTable.userId,
      guardianId: athleteTable.guardianId,
      athleteType: athleteTable.athleteType,
      name: athleteTable.name,
      age: athleteTable.age,
      birthDate: athleteTable.birthDate,
      teamId: athleteTable.teamId,
      team: teamTable.name,
      trainingPerWeek: athleteTable.trainingPerWeek,
      injuries: athleteTable.injuries,
      growthNotes: athleteTable.growthNotes,
      performanceGoals: athleteTable.performanceGoals,
      equipmentAccess: athleteTable.equipmentAccess,
      profilePicture: athleteTable.profilePicture,
      currentProgramTier: athleteTable.currentProgramTier,
      planExpiresAt: athleteTable.planExpiresAt,
      onboardingCompleted: athleteTable.onboardingCompleted,
      extraResponses: athleteTable.extraResponses,
      createdAt: athleteTable.createdAt,
      updatedAt: athleteTable.updatedAt,
      phoneNumber: guardianTable.phoneNumber,
    })
    .from(athleteTable)
    .leftJoin(teamTable, eq(athleteTable.teamId, teamTable.id))
    .leftJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .where(eq(athleteTable.id, athlete.id))
    .limit(1);

  return athleteWithTeam ?? null;
}

export async function listGuardianAthletes(userId: number) {
  const { guardian } = await getGuardianAndAthlete(userId);
  if (!guardian) return { guardian: null, athletes: [] as (typeof athleteTable.$inferSelect)[] };
  const athletes = await db
    .select()
    .from(athleteTable)
    .where(eq(athleteTable.guardianId, guardian.id))
    .orderBy(athleteTable.createdAt);
  return { guardian, athletes };
}

export async function setActiveAthleteForGuardian(input: { userId: number; athleteId: number }) {
  const { guardian } = await getGuardianAndAthlete(input.userId);
  if (!guardian) return null;
  const athlete = await db
    .select()
    .from(athleteTable)
    .where(and(eq(athleteTable.guardianId, guardian.id), eq(athleteTable.id, input.athleteId)))
    .limit(1);
  if (!athlete[0]) return null;
  const [updated] = await db
    .update(guardianTable)
    .set({ activeAthleteId: input.athleteId, updatedAt: new Date() })
    .where(eq(guardianTable.id, guardian.id))
    .returning();
  return updated ?? null;
}

export async function ensureGuardianForUser(userId: number) {
  const guardians = await db
    .select()
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);
  if (guardians[0]) return guardians[0];

  const user = await getUserById(userId);
  const inserted = (await db
    .insert(guardianTable)
    .values({
      userId,
      email: user?.email ?? null,
      relationToAthlete: "Self",
      activeAthleteId: null,
    })
    .returning()) as (typeof guardianTable.$inferSelect)[];

  return inserted[0] ?? null;
}
