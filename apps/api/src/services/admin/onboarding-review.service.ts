import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "../../db";
import {
  athleteTable,
  guardianTable,
  legalAcceptanceTable,
  subscriptionPlanTable,
  teamTable,
  userTable,
} from "../../db/schema";
import { getManagedTeamIds } from "../team-membership";

export type AdminOnboardingAthleteType = "all" | "youth" | "adult" | "team";

export type AdminOnboardingListInput = {
  q?: string | null;
  athleteType?: AdminOnboardingAthleteType | null;
  teamId?: number | null;
  limit?: number | null;
  offset?: number | null;
  viewerUserId: number;
  viewerRole?: string | null;
};

export type AdminOnboardingDetailInput = {
  athleteId: number;
  viewerUserId: number;
  viewerRole?: string | null;
};

function normalizePaging(input: { limit?: number | null; offset?: number | null }) {
  const limit =
    typeof input.limit === "number" && Number.isFinite(input.limit)
      ? Math.max(1, Math.min(200, Math.floor(input.limit)))
      : 100;
  const offset =
    typeof input.offset === "number" && Number.isFinite(input.offset) ? Math.max(0, Math.floor(input.offset)) : 0;
  return { limit, offset };
}

function isTeamScopedRole(role?: string | null) {
  return role === "team_coach";
}

function hasHealthForm(extraResponses: unknown) {
  if (!extraResponses || typeof extraResponses !== "object") return false;
  return Boolean((extraResponses as Record<string, unknown>).healthForm);
}

function hasTrainingData(row: {
  trainingPerWeek: number | null;
  preferredTrainingDays: string[] | null;
  performanceGoals: string | null;
  equipmentAccess: string | null;
  growthNotes: string | null;
  injuries: unknown;
}) {
  return Boolean(
    Number(row.trainingPerWeek ?? 0) > 0 ||
      (Array.isArray(row.preferredTrainingDays) && row.preferredTrainingDays.length > 0) ||
      row.performanceGoals?.trim() ||
      row.equipmentAccess?.trim() ||
      row.growthNotes?.trim() ||
      row.injuries,
  );
}

async function buildIncompleteOnboardingFilters(input: AdminOnboardingListInput): Promise<SQL[]> {
  const guardianUser = alias(userTable, "guardian_user");
  const filters: SQL[] = [eq(athleteTable.onboardingCompleted, false), eq(userTable.isDeleted, false)];

  if (isTeamScopedRole(input.viewerRole)) {
    const managedTeamIds = await getManagedTeamIds(input.viewerUserId);
    if (managedTeamIds.length === 0) {
      filters.push(sql`false`);
    } else {
      filters.push(inArray(athleteTable.teamId, managedTeamIds));
    }
  }

  if (input.teamId) {
    filters.push(eq(athleteTable.teamId, input.teamId));
  }

  if (input.athleteType === "youth" || input.athleteType === "adult") {
    filters.push(eq(athleteTable.athleteType, input.athleteType));
  } else if (input.athleteType === "team") {
    filters.push(sql`${athleteTable.teamId} is not null`);
  }

  const q = input.q?.trim();
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      or(
        ilike(athleteTable.name, pattern),
        ilike(athleteTable.team, pattern),
        ilike(userTable.name, pattern),
        ilike(userTable.email, pattern),
        ilike(teamTable.name, pattern),
        ilike(guardianUser.name, pattern),
        ilike(guardianUser.email, pattern),
      )!,
    );
  }

  return filters;
}

export async function listIncompleteOnboardingAthletes(input: AdminOnboardingListInput) {
  const { limit, offset } = normalizePaging(input);
  const guardianUser = alias(userTable, "guardian_user");
  const filters = await buildIncompleteOnboardingFilters(input);

  const base = db
    .select({
      athleteId: athleteTable.id,
      userId: athleteTable.userId,
      userName: userTable.name,
      userEmail: userTable.email,
      userRole: userTable.role,
      athleteName: athleteTable.name,
      athleteType: athleteTable.athleteType,
      age: athleteTable.age,
      birthDate: athleteTable.birthDate,
      teamId: athleteTable.teamId,
      teamName: teamTable.name,
      teamFallback: athleteTable.team,
      guardianId: athleteTable.guardianId,
      guardianName: guardianUser.name,
      guardianEmail: guardianUser.email,
      trainingPerWeek: athleteTable.trainingPerWeek,
      preferredTrainingDays: athleteTable.preferredTrainingDays,
      performanceGoals: athleteTable.performanceGoals,
      equipmentAccess: athleteTable.equipmentAccess,
      growthNotes: athleteTable.growthNotes,
      injuries: athleteTable.injuries,
      currentProgramTier: athleteTable.currentProgramTier,
      currentPlanId: athleteTable.currentPlanId,
      onboardingCompleted: athleteTable.onboardingCompleted,
      createdAt: athleteTable.createdAt,
      updatedAt: athleteTable.updatedAt,
      extraResponses: athleteTable.extraResponses,
      legalAccepted: sql<boolean>`exists (
        select 1 from ${legalAcceptanceTable}
        where ${legalAcceptanceTable.athleteId} = ${athleteTable.id}
      )`,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(userTable.id, athleteTable.userId))
    .leftJoin(guardianTable, eq(guardianTable.id, athleteTable.guardianId))
    .leftJoin(guardianUser, eq(guardianUser.id, guardianTable.userId))
    .leftJoin(teamTable, eq(teamTable.id, athleteTable.teamId))
    .where(and(...filters))
    .orderBy(desc(athleteTable.updatedAt), desc(athleteTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [rows, totalRows] = await Promise.all([
    base,
    db
      .select({ value: count() })
      .from(athleteTable)
      .innerJoin(userTable, eq(userTable.id, athleteTable.userId))
      .leftJoin(guardianTable, eq(guardianTable.id, athleteTable.guardianId))
      .leftJoin(guardianUser, eq(guardianUser.id, guardianTable.userId))
      .leftJoin(teamTable, eq(teamTable.id, athleteTable.teamId))
      .where(and(...filters)),
  ]);

  return {
    items: rows.map((row) => {
      const teamName = row.teamName ?? row.teamFallback ?? null;
      return {
        athleteId: row.athleteId,
        userId: row.userId,
        userName: row.userName,
        userEmail: row.userEmail,
        userRole: row.userRole,
        athleteName: row.athleteName,
        athleteType: row.athleteType,
        category: row.teamId ? "team" : row.athleteType,
        age: row.age,
        birthDate: row.birthDate,
        teamId: row.teamId,
        teamName,
        guardianId: row.guardianId,
        guardianName: row.guardianName,
        guardianEmail: row.guardianEmail,
        currentProgramTier: row.currentProgramTier,
        currentPlanId: row.currentPlanId,
        onboardingCompleted: row.onboardingCompleted,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        sections: {
          basic: Boolean(row.athleteName && (row.birthDate || row.age != null)),
          training: hasTrainingData(row),
          health: hasHealthForm(row.extraResponses),
          agreements: Boolean(row.legalAccepted),
          billing: Boolean(row.currentProgramTier || row.currentPlanId),
        },
      };
    }),
    total: Number(totalRows[0]?.value ?? 0),
    limit,
    offset,
  };
}

export async function getOnboardingAthleteDetail(input: AdminOnboardingDetailInput) {
  const [row] = await db
    .select({
      athleteId: athleteTable.id,
      userId: athleteTable.userId,
      userName: userTable.name,
      userEmail: userTable.email,
      userRole: userTable.role,
      userProfilePicture: userTable.profilePicture,
      isBlocked: userTable.isBlocked,
      athleteType: athleteTable.athleteType,
      athleteName: athleteTable.name,
      age: athleteTable.age,
      birthDate: athleteTable.birthDate,
      teamId: athleteTable.teamId,
      teamFallback: athleteTable.team,
      trainingPerWeek: athleteTable.trainingPerWeek,
      preferredTrainingDays: athleteTable.preferredTrainingDays,
      phoneNumber: athleteTable.phoneNumber,
      injuries: athleteTable.injuries,
      growthNotes: athleteTable.growthNotes,
      performanceGoals: athleteTable.performanceGoals,
      equipmentAccess: athleteTable.equipmentAccess,
      profilePicture: athleteTable.profilePicture,
      extraResponses: athleteTable.extraResponses,
      currentProgramTier: athleteTable.currentProgramTier,
      currentPlanId: athleteTable.currentPlanId,
      planPaymentType: athleteTable.planPaymentType,
      planCommitmentMonths: athleteTable.planCommitmentMonths,
      planExpiresAt: athleteTable.planExpiresAt,
      isSponsored: athleteTable.isSponsored,
      youthTrackingEnabled: athleteTable.youthTrackingEnabled,
      onboardingCompleted: athleteTable.onboardingCompleted,
      onboardingCompletedAt: athleteTable.onboardingCompletedAt,
      createdAt: athleteTable.createdAt,
      updatedAt: athleteTable.updatedAt,
      guardianId: athleteTable.guardianId,
      teamName: teamTable.name,
      teamAthleteType: teamTable.athleteType,
      teamMaxAthletes: teamTable.maxAthletes,
      teamMinAge: teamTable.minAge,
      teamMaxAge: teamTable.maxAge,
      teamPlanId: teamTable.planId,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(userTable.id, athleteTable.userId))
    .leftJoin(teamTable, eq(teamTable.id, athleteTable.teamId))
    .where(and(eq(athleteTable.id, input.athleteId), eq(userTable.isDeleted, false)))
    .limit(1);

  if (!row) return null;

  if (isTeamScopedRole(input.viewerRole)) {
    const managedTeamIds = await getManagedTeamIds(input.viewerUserId);
    if (!row.teamId || !managedTeamIds.includes(row.teamId)) return null;
  }

  const [guardian, legalAcceptance, plan] = await Promise.all([
    row.guardianId
      ? db
          .select({
            id: guardianTable.id,
            userId: guardianTable.userId,
            email: guardianTable.email,
            phoneNumber: guardianTable.phoneNumber,
            relationToAthlete: guardianTable.relationToAthlete,
            activeAthleteId: guardianTable.activeAthleteId,
            currentProgramTier: guardianTable.currentProgramTier,
            createdAt: guardianTable.createdAt,
            updatedAt: guardianTable.updatedAt,
            userName: userTable.name,
            userEmail: userTable.email,
          })
          .from(guardianTable)
          .leftJoin(userTable, eq(userTable.id, guardianTable.userId))
          .where(eq(guardianTable.id, row.guardianId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    db
      .select()
      .from(legalAcceptanceTable)
      .where(eq(legalAcceptanceTable.athleteId, row.athleteId))
      .orderBy(
        desc(legalAcceptanceTable.updatedAt),
        desc(legalAcceptanceTable.createdAt),
        desc(legalAcceptanceTable.id),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
    row.currentPlanId
      ? db
          .select({
            id: subscriptionPlanTable.id,
            name: subscriptionPlanTable.name,
            tier: subscriptionPlanTable.tier,
            displayPrice: subscriptionPlanTable.displayPrice,
            billingInterval: subscriptionPlanTable.billingInterval,
            isActive: subscriptionPlanTable.isActive,
          })
          .from(subscriptionPlanTable)
          .where(eq(subscriptionPlanTable.id, row.currentPlanId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  const extraResponses =
    row.extraResponses && typeof row.extraResponses === "object"
      ? (row.extraResponses as Record<string, unknown>)
      : null;

  return {
    account: {
      userId: row.userId,
      name: row.userName,
      email: row.userEmail,
      role: row.userRole,
      profilePicture: row.userProfilePicture,
      isBlocked: row.isBlocked,
    },
    athlete: {
      id: row.athleteId,
      userId: row.userId,
      name: row.athleteName,
      athleteType: row.athleteType,
      category: row.teamId ? "team" : row.athleteType,
      age: row.age,
      birthDate: row.birthDate,
      teamId: row.teamId,
      team: row.teamName ?? row.teamFallback ?? null,
      trainingPerWeek: row.trainingPerWeek,
      preferredTrainingDays: row.preferredTrainingDays,
      phoneNumber: row.phoneNumber ?? (extraResponses?.phone as string | undefined) ?? null,
      injuries: row.injuries,
      growthNotes: row.growthNotes,
      performanceGoals: row.performanceGoals,
      equipmentAccess: row.equipmentAccess,
      profilePicture: row.profilePicture,
      currentProgramTier: row.currentProgramTier,
      currentPlanId: row.currentPlanId,
      planPaymentType: row.planPaymentType,
      planCommitmentMonths: row.planCommitmentMonths,
      planExpiresAt: row.planExpiresAt,
      isSponsored: row.isSponsored,
      youthTrackingEnabled: row.youthTrackingEnabled,
      onboardingCompleted: row.onboardingCompleted,
      onboardingCompletedAt: row.onboardingCompletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    guardian,
    team: row.teamId
      ? {
          id: row.teamId,
          name: row.teamName ?? row.teamFallback ?? null,
          athleteType: row.teamAthleteType,
          minAge: row.teamMinAge,
          maxAge: row.teamMaxAge,
          maxAthletes: row.teamMaxAthletes,
          planId: row.teamPlanId,
        }
      : null,
    healthForm: extraResponses?.healthForm ?? null,
    legalAcceptance,
    plan,
    extraResponses,
    sections: {
      basic: Boolean(row.athleteName && (row.birthDate || row.age != null)),
      training: hasTrainingData(row),
      health: Boolean(extraResponses?.healthForm),
      agreements: Boolean(legalAcceptance),
      billing: Boolean(row.currentProgramTier || row.currentPlanId),
    },
  };
}
