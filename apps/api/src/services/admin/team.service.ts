import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  athleteTable,
  chatGroupMemberTable,
  chatGroupTable,
  guardianTable,
  teamTable,
  userTable,
  ProgramType,
} from "../../db/schema";

async function ensureTeamExists(teamName: string) {
  const cleanTeamName = teamName.trim();
  if (!cleanTeamName) return null;

  const existing = await db
    .select({ id: teamTable.id, name: teamTable.name })
    .from(teamTable)
    .where(eq(teamTable.name, cleanTeamName))
    .limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(teamTable)
    .values({
      name: cleanTeamName,
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: teamTable.name })
    .returning({ id: teamTable.id, name: teamTable.name });
  if (created) return created;

  const fallback = await db
    .select({ id: teamTable.id, name: teamTable.name })
    .from(teamTable)
    .where(eq(teamTable.name, cleanTeamName))
    .limit(1);
  return fallback[0] ?? null;
}

async function ensureTeamChatGroup(teamName: string, createdByUserId: number) {
  const cleanTeamName = teamName.trim();
  if (!cleanTeamName) return null;

  const existing = await db
    .select({ id: chatGroupTable.id })
    .from(chatGroupTable)
    .where(
      and(
        eq(chatGroupTable.name, cleanTeamName),
        eq(chatGroupTable.category, "team"),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(chatGroupTable)
    .values({
      name: cleanTeamName,
      category: "team",
      createdBy: createdByUserId,
    })
    .returning({ id: chatGroupTable.id });
  if (created) return created;

  const fallback = await db
    .select({ id: chatGroupTable.id })
    .from(chatGroupTable)
    .where(
      and(
        eq(chatGroupTable.name, cleanTeamName),
        eq(chatGroupTable.category, "team"),
      ),
    )
    .limit(1);
  return fallback[0] ?? null;
}

async function addUsersToGroup(groupId: number, userIds: number[]) {
  const unique = Array.from(new Set(userIds.filter((id) => Number.isFinite(id))));
  if (!unique.length) return;
  await db
    .insert(chatGroupMemberTable)
    .values(unique.map((userId) => ({ groupId, userId })))
    .onConflictDoNothing({
      target: [chatGroupMemberTable.groupId, chatGroupMemberTable.userId],
    });
}

async function syncTeamChatMembers(teamName: string, groupId: number) {
  const cleanTeamName = teamName.trim();
  if (!cleanTeamName) return;

  const athleteUsers = await db
    .select({
      athleteUserId: athleteTable.userId,
      guardianId: athleteTable.guardianId,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(and(eq(athleteTable.team, cleanTeamName), eq(userTable.isDeleted, false)));

  const guardianIds = athleteUsers
    .map((row) => row.guardianId)
    .filter((id): id is number => typeof id === "number");

  const guardianUsers = guardianIds.length
    ? await db
        .select({ userId: guardianTable.userId })
        .from(guardianTable)
        .innerJoin(userTable, eq(guardianTable.userId, userTable.id))
        .where(and(eq(userTable.isDeleted, false), inArray(guardianTable.id, guardianIds)))
    : [];

  const userIds = [
    ...athleteUsers.map((row) => row.athleteUserId),
    ...guardianUsers.map((row) => row.userId),
  ];

  await addUsersToGroup(groupId, userIds);
}

export async function createTeamAdmin(input: {
  teamName: string;
  createdByUserId: number;
}) {
  const cleanTeamName = input.teamName.trim();
  if (!cleanTeamName) {
    throw { status: 400, message: "Team name is required." };
  }

  const existing = await db
    .select({ id: teamTable.id })
    .from(teamTable)
    .where(eq(teamTable.name, cleanTeamName))
    .limit(1);
  if (existing[0]) {
    throw { status: 409, message: "A team with this name already exists." };
  }

  const created = await ensureTeamExists(cleanTeamName);
  const group = await ensureTeamChatGroup(cleanTeamName, input.createdByUserId);
  if (group?.id) {
    await syncTeamChatMembers(cleanTeamName, group.id);
  }
  return { ok: true, team: created?.name ?? cleanTeamName };
}

export async function listTeamsAdmin() {
  const rows = await db
    .select({
      team: teamTable.name,
      memberCount: sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false), 0)`,
      youthCount: sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false and ${athleteTable.athleteType}::text = 'youth'), 0)`,
      adultCount: sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false and ${athleteTable.athleteType}::text = 'adult'), 0)`,
      guardianCount: sql<number>`coalesce(count(distinct ${athleteTable.guardianId}) filter (where ${userTable.isDeleted} = false), 0)`,
      createdAt: teamTable.createdAt,
      updatedAt: teamTable.updatedAt,
    })
    .from(teamTable)
    .leftJoin(athleteTable, eq(athleteTable.team, teamTable.name))
    .leftJoin(userTable, eq(athleteTable.userId, userTable.id))
    .groupBy(teamTable.name, teamTable.createdAt, teamTable.updatedAt)
    .orderBy(desc(sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false), 0)`), teamTable.name);

  return rows.filter((row) => row.team.trim().length > 0);
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

  const teamRows = await db
    .select({
      name: teamTable.name,
      createdAt: teamTable.createdAt,
      updatedAt: teamTable.updatedAt,
    })
    .from(teamTable)
    .where(eq(teamTable.name, cleanTeamName))
    .limit(1);
  const team = teamRows[0];
  if (!team) return null;

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

  const memberCount = rows.length;
  const guardianCount = new Set(rows.map((row) => row.guardianId).filter((id) => id != null)).size;

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
    },
  );

  return {
    team: team.name,
    summary: {
      memberCount,
      guardianCount,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
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
      athleteUserId: athleteTable.userId,
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
      guardianUserId: guardianTable.userId,
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
    athleteUserId: row.athleteUserId,
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
    guardianUserId: row.guardianUserId,
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
  const cleanTeamName = input.teamName.trim();
  if (cleanTeamName) {
    await ensureTeamExists(cleanTeamName);
    await db
      .update(teamTable)
      .set({ updatedAt: new Date() })
      .where(eq(teamTable.name, cleanTeamName));
  }

  const rows = await db
    .update(athleteTable)
    .set({
      injuries: input.injuries?.trim() ? input.injuries.trim() : null,
      growthNotes: input.growthNotes?.trim() ? input.growthNotes.trim() : null,
      performanceGoals: input.performanceGoals?.trim() ? input.performanceGoals.trim() : null,
      equipmentAccess: input.equipmentAccess?.trim() ? input.equipmentAccess.trim() : null,
      updatedAt: new Date(),
    })
    .where(eq(athleteTable.team, cleanTeamName))
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
  const cleanTeamName = input.teamName.trim();

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
  if (athlete.team !== cleanTeamName) {
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

  if (cleanTeamName) {
    await db
      .update(teamTable)
      .set({ updatedAt: new Date() })
      .where(eq(teamTable.name, cleanTeamName));
  }

  return { ok: true };
}

export async function attachAthleteToTeamAdmin(input: {
  teamName: string;
  athleteId: number;
  allowMoveFromOtherTeam?: boolean;
  createdByUserId: number;
}) {
  const cleanTeamName = input.teamName.trim();
  if (!cleanTeamName) {
    throw { status: 400, message: "Team name is required." };
  }

  const rows = await db
    .select({
      id: athleteTable.id,
      team: athleteTable.team,
      userId: athleteTable.userId,
      guardianId: athleteTable.guardianId,
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

  const existingTeam = (athlete.team ?? "").trim();
  if (existingTeam) {
    if (!input.allowMoveFromOtherTeam) {
      throw {
        status: 400,
        message: `Athlete is already assigned to team "${existingTeam}". An athlete can only belong to one team.`,
      };
    }
  }

  await ensureTeamExists(cleanTeamName);

  await db
    .update(athleteTable)
    .set({
      team: cleanTeamName,
      updatedAt: new Date(),
    })
    .where(eq(athleteTable.id, athlete.id));

  if (existingTeam) {
    await db
      .update(teamTable)
      .set({ updatedAt: new Date() })
      .where(eq(teamTable.name, existingTeam));
  }

  await db
    .update(teamTable)
    .set({ updatedAt: new Date() })
    .where(eq(teamTable.name, cleanTeamName));

  const group = await ensureTeamChatGroup(cleanTeamName, input.createdByUserId);
  if (group?.id) {
    const memberIds: number[] = [athlete.userId];
    if (athlete.guardianId) {
      const guardianRows = await db
        .select({ userId: guardianTable.userId })
        .from(guardianTable)
        .where(eq(guardianTable.id, athlete.guardianId))
        .limit(1);
      const guardianUserId = guardianRows[0]?.userId;
      if (guardianUserId) memberIds.push(guardianUserId);
    }
    await addUsersToGroup(group.id, memberIds);
  }

  return {
    ok: true,
    alreadyInTeam: false,
    ...(existingTeam ? { movedFromTeam: existingTeam } : {}),
  };
}
