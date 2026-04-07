import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  athleteTable,
  guardianTable,
  userTable,
  ProgramType,
} from "../../db/schema";

export async function listTeamsAdmin() {
  const rows = await db
    .select({
      team: athleteTable.team,
      memberCount: sql<number>`count(*)`,
      guardianCount: sql<number>`count(distinct ${athleteTable.guardianId})`,
      createdAt: sql<Date>`min(${athleteTable.createdAt})`,
      updatedAt: sql<Date>`max(${athleteTable.updatedAt})`,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(eq(userTable.isDeleted, false))
    .groupBy(athleteTable.team)
    .orderBy(desc(sql<number>`count(*)`), athleteTable.team);

  return rows;
}

function normalizeInjuriesForText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const flattened = value
      .map((item) => (typeof item === "string" ? item.trim() : String(item)))
      .filter(Boolean);
    return flattened.length ? flattened.join(", ") : null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function getTeamDetailsAdmin(teamName: string) {
  const cleanTeamName = teamName.trim();
  if (!cleanTeamName) return null;

  const rows = await db
    .select({
      athleteId: athleteTable.id,
      athleteName: athleteTable.name,
      birthDate: athleteTable.birthDate,
      trainingPerWeek: athleteTable.trainingPerWeek,
      currentProgramTier: athleteTable.currentProgramTier,
      injuries: athleteTable.injuries,
      growthNotes: athleteTable.growthNotes,
      performanceGoals: athleteTable.performanceGoals,
      equipmentAccess: athleteTable.equipmentAccess,
      createdAt: athleteTable.createdAt,
      updatedAt: athleteTable.updatedAt,
      guardianId: guardianTable.id,
      guardianEmail: guardianTable.email,
      guardianPhone: guardianTable.phoneNumber,
      relationToAthlete: guardianTable.relationToAthlete,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .leftJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .where(and(eq(athleteTable.team, cleanTeamName), eq(userTable.isDeleted, false)))
    .orderBy(asc(athleteTable.name));

  if (!rows.length) return null;

  const memberCount = rows.length;
  const guardianCount = new Set(rows.map((row) => row.guardianId).filter((id) => id != null)).size;
  const createdAt = rows.reduce((min, row) => (row.createdAt < min ? row.createdAt : min), rows[0].createdAt);
  const updatedAt = rows.reduce((max, row) => (row.updatedAt > max ? row.updatedAt : max), rows[0].updatedAt);

  const defaults = rows.reduce(
    (acc, row) => ({
      injuries: acc.injuries ?? (row.injuries ? JSON.stringify(row.injuries) : null),
      growthNotes: acc.growthNotes ?? row.growthNotes ?? null,
      performanceGoals: acc.performanceGoals ?? row.performanceGoals ?? null,
      equipmentAccess: acc.equipmentAccess ?? row.equipmentAccess ?? null,
    }),
    {
      injuries: null as string | null,
      growthNotes: null as string | null,
      performanceGoals: null as string | null,
      equipmentAccess: null as string | null,
    }
  );

  return {
    team: cleanTeamName,
    summary: {
      memberCount,
      guardianCount,
      createdAt,
      updatedAt,
    },
    defaults,
    members: rows.map((row) => ({
      athleteId: row.athleteId,
      athleteName: row.athleteName,
      birthDate: row.birthDate,
      trainingPerWeek: row.trainingPerWeek,
      currentProgramTier: row.currentProgramTier,
      guardianEmail: row.guardianEmail,
      guardianPhone: row.guardianPhone,
      relationToAthlete: row.relationToAthlete,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  };
}

export async function getTeamMemberAdmin(input: { teamName: string; athleteId: number }) {
  const cleanTeamName = input.teamName.trim();
  if (!cleanTeamName) return null;

  const rows = await db
    .select({
      athleteId: athleteTable.id,
      team: athleteTable.team,
      athleteName: athleteTable.name,
      birthDate: athleteTable.birthDate,
      trainingPerWeek: athleteTable.trainingPerWeek,
      currentProgramTier: athleteTable.currentProgramTier,
      injuries: athleteTable.injuries,
      growthNotes: athleteTable.growthNotes,
      performanceGoals: athleteTable.performanceGoals,
      equipmentAccess: athleteTable.equipmentAccess,
      createdAt: athleteTable.createdAt,
      updatedAt: athleteTable.updatedAt,
      guardianEmail: guardianTable.email,
      guardianPhone: guardianTable.phoneNumber,
      relationToAthlete: guardianTable.relationToAthlete,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .leftJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .where(and(eq(athleteTable.id, input.athleteId), eq(userTable.isDeleted, false)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.team !== cleanTeamName) return null;

  return {
    athleteId: row.athleteId,
    team: row.team,
    athleteName: row.athleteName,
    birthDate: row.birthDate,
    trainingPerWeek: row.trainingPerWeek,
    currentProgramTier: row.currentProgramTier,
    injuries: normalizeInjuriesForText(row.injuries),
    growthNotes: row.growthNotes,
    performanceGoals: row.performanceGoals,
    equipmentAccess: row.equipmentAccess,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    guardianEmail: row.guardianEmail,
    guardianPhone: row.guardianPhone,
    relationToAthlete: row.relationToAthlete,
  };
}

export async function updateTeamDefaultsAdmin(input: {
  teamName: string;
  injuries?: string | null;
  growthNotes?: string | null;
  performanceGoals?: string | null;
  equipmentAccess?: string | null;
}) {
  const rows = await db
    .update(athleteTable)
    .set({
      injuries: input.injuries?.trim() ? input.injuries.trim() : null,
      growthNotes: input.growthNotes?.trim() ? input.growthNotes.trim() : null,
      performanceGoals: input.performanceGoals?.trim() ? input.performanceGoals.trim() : null,
      equipmentAccess: input.equipmentAccess?.trim() ? input.equipmentAccess.trim() : null,
      updatedAt: new Date(),
    })
    .where(eq(athleteTable.team, input.teamName.trim()))
    .returning({ id: athleteTable.id });

  return {
    updatedCount: rows.length,
  };
}

export async function updateTeamMemberAdmin(input: {
  teamName: string;
  athleteId: number;
  athleteName?: string;
  birthDate?: string | null;
  trainingPerWeek?: number;
  currentProgramTier?: (typeof ProgramType.enumValues)[number] | null;
  injuries?: unknown;
  growthNotes?: string | null;
  performanceGoals?: string | null;
  equipmentAccess?: string | null;
  guardianEmail?: string | null;
  guardianPhone?: string | null;
  relationToAthlete?: string | null;
}) {
  const athleteRows = await db
    .select({
      id: athleteTable.id,
      team: athleteTable.team,
      guardianId: athleteTable.guardianId,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(and(eq(athleteTable.id, input.athleteId), eq(userTable.isDeleted, false)))
    .limit(1);

  const athlete = athleteRows[0];
  if (!athlete) {
    throw { status: 404, message: "Team member not found." };
  }
  if (athlete.team !== input.teamName.trim()) {
    throw { status: 400, message: "Member does not belong to this team." };
  }

  const athletePatch: Partial<typeof athleteTable.$inferInsert> = {};
  if (input.athleteName != null) athletePatch.name = input.athleteName.trim();
  if (input.birthDate !== undefined) athletePatch.birthDate = input.birthDate ? input.birthDate : null;
  if (input.trainingPerWeek !== undefined) athletePatch.trainingPerWeek = input.trainingPerWeek;
  if (input.currentProgramTier !== undefined) athletePatch.currentProgramTier = input.currentProgramTier;
  if (input.injuries !== undefined) {
    if (Array.isArray(input.injuries)) {
      const normalized = input.injuries
        .map((item) => (typeof item === "string" ? item.trim() : String(item)))
        .filter(Boolean);
      athletePatch.injuries = normalized.length ? normalized : null;
    } else if (typeof input.injuries === "string") {
      const trimmed = input.injuries.trim();
      athletePatch.injuries = trimmed ? [trimmed] : null;
    } else {
      athletePatch.injuries = null;
    }
  }
  if (input.growthNotes !== undefined) athletePatch.growthNotes = input.growthNotes?.trim() ? input.growthNotes.trim() : null;
  if (input.performanceGoals !== undefined) athletePatch.performanceGoals = input.performanceGoals?.trim() ? input.performanceGoals.trim() : null;
  if (input.equipmentAccess !== undefined) athletePatch.equipmentAccess = input.equipmentAccess?.trim() ? input.equipmentAccess.trim() : null;

  if (Object.keys(athletePatch).length > 0) {
    athletePatch.updatedAt = new Date();
    await db.update(athleteTable).set(athletePatch).where(eq(athleteTable.id, athlete.id));
  }

  const guardianPatch: Partial<typeof guardianTable.$inferInsert> = {};
  if (input.guardianEmail !== undefined) guardianPatch.email = input.guardianEmail?.trim() || null;
  if (input.guardianPhone !== undefined) guardianPatch.phoneNumber = input.guardianPhone?.trim() || null;
  if (input.relationToAthlete !== undefined) guardianPatch.relationToAthlete = input.relationToAthlete?.trim() || null;

  if (Object.keys(guardianPatch).length > 0) {
    if (!athlete.guardianId) {
      throw { status: 400, message: "Adult athletes do not have guardian details." };
    }
    guardianPatch.updatedAt = new Date();
    await db.update(guardianTable).set(guardianPatch).where(eq(guardianTable.id, athlete.guardianId));
  }

  return { ok: true };
}

export async function attachAthleteToTeamAdmin(input: { teamName: string; athleteId: number }) {
  const cleanTeamName = input.teamName.trim();
  if (!cleanTeamName) {
    throw { status: 400, message: "Team name is required." };
  }

  const rows = await db
    .select({
      id: athleteTable.id,
      team: athleteTable.team,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(and(eq(athleteTable.id, input.athleteId), eq(userTable.isDeleted, false)))
    .limit(1);

  const athlete = rows[0];
  if (!athlete) {
    throw { status: 404, message: "Athlete not found." };
  }

  if (athlete.team === cleanTeamName) {
    return { ok: true, alreadyInTeam: true };
  }

  await db
    .update(athleteTable)
    .set({
      team: cleanTeamName,
      updatedAt: new Date(),
    })
    .where(eq(athleteTable.id, athlete.id));

  return { ok: true, alreadyInTeam: false };
}
