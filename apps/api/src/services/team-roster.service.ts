import crypto from "crypto";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";

import { env } from "../config/env";
import { logger } from "../lib/logger";
import { db } from "../db";
import { athleteTable, legalAcceptanceTable, subscriptionPlanTable, teamTable, userTable } from "../db/schema";
import { slugifySegment } from "../lib/slug";
import { getUserByEmail } from "./user.service";
import { addTeamAthleteToTeamChat } from "./admin/team.service";

function hashProvisionPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function generateProvisionPassword() {
  const base = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 16; i += 1) {
    out += base[Math.floor(Math.random() * base.length)];
  }
  return out;
}

function athleteEmailLocalPart(usernameSlug: string, teamSlug: string) {
  return `${usernameSlug}.${teamSlug}`.toLowerCase();
}

function buildEmail(usernameSlug: string, teamSlug: string) {
  const domain = env.teamAthleteEmailDomain.trim().toLowerCase() || "phplatform.com";
  return `${athleteEmailLocalPart(usernameSlug, teamSlug)}@${domain}`;
}

async function ensureTeamEmailSlugRow(team: typeof teamTable.$inferSelect) {
  if (team.emailSlug?.trim()) return team.emailSlug.trim().toLowerCase();
  const slug = `${slugifySegment(team.name)}-${team.id}`;
  await db
    .update(teamTable)
    .set({ emailSlug: slug, updatedAt: new Date() })
    .where(eq(teamTable.id, team.id));
  return slug;
}

type AuthUser = { id: number; role: string };

export async function getManagedTeamForUser(user: AuthUser, teamIdQuery?: number | null) {
  if (user.role === "team_coach" || user.role === "program_coach" || user.role === "coach") {
    const rows = await db.select().from(teamTable).where(eq(teamTable.adminId, user.id)).limit(1);
    return rows[0] ?? null;
  }
  if (user.role === "admin" || user.role === "superAdmin") {
    const tid = teamIdQuery;
    if (!tid || !Number.isFinite(tid)) return null;
    const rows = await db.select().from(teamTable).where(eq(teamTable.id, tid)).limit(1);
    return rows[0] ?? null;
  }
  return null;
}

export async function listTeamRosterForCoach(user: AuthUser, teamIdQuery?: number | null) {
  const team = await getManagedTeamForUser(user, teamIdQuery);
  if (!team) return null;

  const emailSlug = await ensureTeamEmailSlugRow(team);

  const countRows = await db
    .select({ memberCount: count() })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(and(eq(athleteTable.teamId, team.id), eq(userTable.isDeleted, false)));
  const memberCount = Number(countRows[0]?.memberCount ?? 0);

  const members = await db
    .select({
      athleteId: athleteTable.id,
      name: athleteTable.name,
      age: athleteTable.age,
      birthDate: athleteTable.birthDate,
      profilePicture: athleteTable.profilePicture,
      athleteType: athleteTable.athleteType,
      isSponsored: athleteTable.isSponsored,
      email: userTable.email,
      userId: userTable.id,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(and(eq(athleteTable.teamId, team.id), eq(userTable.isDeleted, false)))
    .orderBy(asc(athleteTable.name));

  return {
    team: {
      id: team.id,
      name: team.name,
      maxAthletes: team.maxAthletes,
      emailSlug,
      memberCount,
      slotsRemaining: Math.max(0, team.maxAthletes - memberCount),
      sponsoredPlayerCount: team.sponsoredPlayerCount,
      sponsoredPlanId: team.sponsoredPlanId,
    },
    members,
  };
}

export async function getTeamRosterAthleteDetail(user: AuthUser, athleteId: number, teamIdQuery?: number | null) {
  const team = await getManagedTeamForUser(user, teamIdQuery ?? null);
  if (!team) return null;

  const rows = await db
    .select({
      athleteId: athleteTable.id,
      userId: athleteTable.userId,
      name: athleteTable.name,
      age: athleteTable.age,
      birthDate: athleteTable.birthDate,
      athleteType: athleteTable.athleteType,
      teamId: athleteTable.teamId,
      teamName: athleteTable.team,
      trainingPerWeek: athleteTable.trainingPerWeek,
      injuries: athleteTable.injuries,
      growthNotes: athleteTable.growthNotes,
      performanceGoals: athleteTable.performanceGoals,
      equipmentAccess: athleteTable.equipmentAccess,
      profilePicture: athleteTable.profilePicture,
      onboardingCompleted: athleteTable.onboardingCompleted,
      email: userTable.email,
      accountName: userTable.name,
      emailVerified: userTable.emailVerified,
      userCreatedAt: userTable.createdAt,
      userUpdatedAt: userTable.updatedAt,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(
      and(eq(athleteTable.id, athleteId), eq(athleteTable.teamId, team.id), eq(userTable.isDeleted, false)),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    ...row,
    /** Passwords are hashed; coaches can issue a new temporary password from the portal. */
    canResetPassword: true as const,
  };
}

export async function resetTeamAthletePassword(
  user: AuthUser,
  athleteId: number,
  teamIdQuery?: number | null,
  customPasswordPlain?: string,
) {
  const team = await getManagedTeamForUser(user, teamIdQuery ?? null);
  if (!team) {
    throw { status: 403, message: "Team not found or access denied." };
  }

  const rows = await db
    .select({
      athleteId: athleteTable.id,
      userId: athleteTable.userId,
      email: userTable.email,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(
      and(eq(athleteTable.id, athleteId), eq(athleteTable.teamId, team.id), eq(userTable.isDeleted, false)),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw { status: 404, message: "Athlete not on this team." };
  }

  const tempPassword =
    customPasswordPlain !== undefined ? customPasswordPlain : generateProvisionPassword();
  const { hash, salt } = hashProvisionPassword(tempPassword);

  await db
    .update(userTable)
    .set({
      passwordHash: hash,
      passwordSalt: salt,
      tokenVersion: sql`${userTable.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, row.userId));

  return {
    email: row.email,
    temporaryPassword: tempPassword,
  };
}

export async function updateTeamEmailSlug(user: AuthUser, input: { teamId?: number | null; emailSlug: string }) {
  const team = await getManagedTeamForUser(user, input.teamId ?? null);
  if (!team) {
    throw { status: 403, message: "Team not found or access denied." };
  }
  const next = slugifySegment(input.emailSlug, 72);
  if (next.length < 2) {
    throw { status: 400, message: "Team email segment is too short." };
  }

  const clash = await db
    .select({ id: teamTable.id })
    .from(teamTable)
    .where(and(eq(teamTable.emailSlug, next), ne(teamTable.id, team.id)))
    .limit(1);
  if (clash[0]) {
    throw { status: 409, message: "That team email segment is already in use." };
  }

  await db
    .update(teamTable)
    .set({ emailSlug: next, updatedAt: new Date() })
    .where(eq(teamTable.id, team.id));

  return { emailSlug: next };
}

export async function createTeamRosterAthlete(
  user: AuthUser,
  input: {
    teamId?: number | null;
    username: string;
    name: string;
    age: number;
    birthDate?: string | null;
    profilePicture?: string | null;
    customPassword?: string;
    isSponsored?: boolean;
  },
) {
  const team = await getManagedTeamForUser(user, input.teamId ?? null);
  if (!team) {
    throw { status: 403, message: "Team not found or access denied." };
  }

  const countRows = await db
    .select({ memberCount: count() })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(and(eq(athleteTable.teamId, team.id), eq(userTable.isDeleted, false)));
  const memberCount = Number(countRows[0]?.memberCount ?? 0);

  if (memberCount >= team.maxAthletes) {
    throw {
      status: 403,
      message: `Team is full (${memberCount}/${team.maxAthletes}). Upgrade the plan or increase seats to add athletes.`,
    };
  }

  const usernameSlug = slugifySegment(input.username, 32);
  if (usernameSlug.length < 2) {
    throw { status: 400, message: "Username must be at least 2 letters or numbers." };
  }

  const teamSlug = await ensureTeamEmailSlugRow(team);
  let email = buildEmail(usernameSlug, teamSlug);
  let suffix = 1;
  while ((await getUserByEmail(email)) !== null) {
    email = buildEmail(`${usernameSlug}${suffix}`, teamSlug);
    suffix += 1;
    if (suffix > 50) {
      throw { status: 409, message: "Could not allocate a unique email; try a different username." };
    }
  }

  const displayName = input.name.trim();
  if (!displayName) {
    throw { status: 400, message: "Name is required." };
  }

  const age = Math.floor(Number(input.age));
  if (!Number.isFinite(age) || age < 5 || age > 99) {
    throw { status: 400, message: "Age must be between 5 and 99." };
  }

  let birthDateStr: string;
  if (input.birthDate?.trim()) {
    birthDateStr = input.birthDate.trim();
  } else {
    const now = new Date();
    const bd = new Date(now.getFullYear() - age, now.getMonth(), now.getDate());
    birthDateStr = bd.toISOString().slice(0, 10);
  }

  const athleteType = age >= 18 ? ("adult" as const) : ("youth" as const);
  const tempPassword =
    input.customPassword !== undefined ? input.customPassword : generateProvisionPassword();
  const { hash, salt } = hashProvisionPassword(tempPassword);

  let userId: number | null = null;
  try {
    const insertedUser = await db
      .insert(userTable)
      .values({
        cognitoSub: `local:team-athlete:${crypto.randomUUID()}`,
        name: displayName,
        email,
        role: "team_athlete",
        passwordHash: hash,
        passwordSalt: salt,
        emailVerified: true,
        profilePicture: input.profilePicture?.trim() || null,
      })
      .returning({ id: userTable.id });
    userId = insertedUser[0]?.id ?? null;
    if (!userId) throw new Error("User insert failed");

    let sponsoredTier: typeof athleteTable.$inferInsert["currentProgramTier"] = undefined;
    let sponsoredPlanIdValue: number | undefined;
    if (input.isSponsored && team.sponsoredPlanId) {
      const [sponsoredPlan] = await db
        .select({ id: subscriptionPlanTable.id, tier: subscriptionPlanTable.tier })
        .from(subscriptionPlanTable)
        .where(eq(subscriptionPlanTable.id, team.sponsoredPlanId))
        .limit(1);
      if (sponsoredPlan?.tier) {
        sponsoredTier = sponsoredPlan.tier;
        sponsoredPlanIdValue = sponsoredPlan.id;
      }
    }

    const insertedAthlete = await db
      .insert(athleteTable)
      .values({
        userId,
        guardianId: null,
        athleteType,
        name: displayName,
        age,
        birthDate: birthDateStr,
        teamId: team.id,
        team: team.name,
        trainingPerWeek: 3,
        profilePicture: input.profilePicture?.trim() || null,
        isSponsored: input.isSponsored ?? false,
        currentProgramTier: sponsoredTier ?? undefined,
        currentPlanId: sponsoredPlanIdValue ?? undefined,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      })
      .returning({ id: athleteTable.id });

    const athleteId = insertedAthlete[0]?.id;
    if (!athleteId) throw new Error("Athlete insert failed");

    await db.insert(legalAcceptanceTable).values({
      athleteId,
      termsAcceptedAt: new Date(),
      termsVersion: "1.0",
      privacyAcceptedAt: new Date(),
      privacyVersion: "1.0",
      appVersion: "1.0.0",
    });

    await addTeamAthleteToTeamChat(team.name, userId, user.id).catch((err) => {
      logger.warn({ err }, "[team-roster] addTeamAthleteToTeamChat failed");
    });

    return {
      athleteId,
      userId,
      email,
      temporaryPassword: tempPassword,
      teamSlug,
    };
  } catch (e) {
    if (userId) {
      await db.update(userTable).set({ isDeleted: true, updatedAt: new Date() }).where(eq(userTable.id, userId));
    }
    throw e;
  }
}

export async function updateTeamRosterAthlete(
  user: AuthUser,
  input: {
    teamId?: number | null;
    athleteId: number;
    name?: string;
    age?: number;
    birthDate?: string | null;
    athleteType?: "youth" | "adult";
    trainingPerWeek?: number;
    performanceGoals?: string | null;
    equipmentAccess?: string | null;
    growthNotes?: string | null;
    profilePicture?: string | null;
  },
) {
  const team = await getManagedTeamForUser(user, input.teamId ?? null);
  if (!team) {
    throw { status: 403, message: "Team not found or access denied." };
  }

  const rows = await db
    .select({ athleteId: athleteTable.id, userId: athleteTable.userId })
    .from(athleteTable)
    .where(and(eq(athleteTable.id, input.athleteId), eq(athleteTable.teamId, team.id)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw { status: 404, message: "Athlete not on this team." };
  }

  const patch: Partial<typeof athleteTable.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.age !== undefined) {
    const a = Math.floor(Number(input.age));
    if (Number.isFinite(a) && a >= 5 && a <= 99) {
      patch.age = a;
      patch.athleteType = a >= 18 ? "adult" : "youth";
    }
  }
  if (input.athleteType !== undefined) patch.athleteType = input.athleteType;
  if (input.birthDate !== undefined) patch.birthDate = input.birthDate?.trim() || null;
  if (input.trainingPerWeek !== undefined) {
    const t = Math.floor(Number(input.trainingPerWeek));
    if (Number.isFinite(t) && t >= 1 && t <= 14) patch.trainingPerWeek = t;
  }
  if (input.performanceGoals !== undefined) {
    patch.performanceGoals = input.performanceGoals?.trim() || null;
  }
  if (input.equipmentAccess !== undefined) {
    patch.equipmentAccess = input.equipmentAccess?.trim() || null;
  }
  if (input.growthNotes !== undefined) {
    patch.growthNotes = input.growthNotes?.trim() || null;
  }
  if (input.profilePicture !== undefined) {
    patch.profilePicture = input.profilePicture?.trim() || null;
  }

  await db.update(athleteTable).set(patch).where(eq(athleteTable.id, input.athleteId));

  if (input.name !== undefined || input.profilePicture !== undefined) {
    await db
      .update(userTable)
      .set({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.profilePicture !== undefined ? { profilePicture: input.profilePicture?.trim() || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, row.userId));
  }

  return { ok: true as const };
}
