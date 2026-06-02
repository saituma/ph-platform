import crypto from "crypto";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";

import { env } from "../config/env";
import { logger } from "../lib/logger";
import { db } from "../db";
import {
  athleteTable,
  guardianTable,
  legalAcceptanceTable,
  subscriptionPlanTable,
  teamManagersTable,
  teamTable,
  userTable,
} from "../db/schema";
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
  await db.update(teamTable).set({ emailSlug: slug, updatedAt: new Date() }).where(eq(teamTable.id, team.id));
  return slug;
}

type AuthUser = { id: number; role: string };

const COACH_ROLES = new Set(["team_coach", "program_coach", "coach"]);

export type ManagedTeam = {
  team: typeof teamTable.$inferSelect;
  /** adminId === user.id — the billing owner. Gates plan/Stripe/delete operations. */
  isPrimary: boolean;
  /** Has a team_managers row — operational co-manager. */
  isCoManager: boolean;
};

/**
 * Resolve a single team a user may manage, with privilege flags.
 * A coach manages a team if they are its `adminId` (primary/billing owner) OR
 * have a `team_managers` row (operational co-manager). Platform admins resolve
 * any team by id and are treated as primary.
 */
export async function resolveManagedTeam(user: AuthUser, teamIdQuery?: number | null): Promise<ManagedTeam | null> {
  if (user.role === "admin" || user.role === "superAdmin") {
    const tid = teamIdQuery;
    if (!tid || !Number.isFinite(tid)) return null;
    const [team] = await db.select().from(teamTable).where(eq(teamTable.id, tid)).limit(1);
    return team ? { team, isPrimary: true, isCoManager: false } : null;
  }

  if (!COACH_ROLES.has(user.role)) return null;

  if (teamIdQuery && Number.isFinite(teamIdQuery)) {
    const [primary] = await db
      .select()
      .from(teamTable)
      .where(and(eq(teamTable.id, teamIdQuery), eq(teamTable.adminId, user.id)))
      .limit(1);
    if (primary) return { team: primary, isPrimary: true, isCoManager: false };

    const [co] = await db
      .select({ team: teamTable })
      .from(teamManagersTable)
      .innerJoin(teamTable, eq(teamManagersTable.teamId, teamTable.id))
      .where(and(eq(teamManagersTable.teamId, teamIdQuery), eq(teamManagersTable.userId, user.id)))
      .limit(1);
    return co?.team ? { team: co.team, isPrimary: false, isCoManager: true } : null;
  }

  // No explicit team requested: prefer the primary team, fall back to first co-managed.
  const [primary] = await db.select().from(teamTable).where(eq(teamTable.adminId, user.id)).limit(1);
  if (primary) return { team: primary, isPrimary: true, isCoManager: false };

  const [co] = await db
    .select({ team: teamTable })
    .from(teamManagersTable)
    .innerJoin(teamTable, eq(teamManagersTable.teamId, teamTable.id))
    .where(eq(teamManagersTable.userId, user.id))
    .orderBy(asc(teamTable.id))
    .limit(1);
  return co?.team ? { team: co.team, isPrimary: false, isCoManager: true } : null;
}

export async function getManagedTeamForUser(user: AuthUser, teamIdQuery?: number | null) {
  const resolved = await resolveManagedTeam(user, teamIdQuery);
  return resolved?.team ?? null;
}

/** All teams a coach manages (primary + co-managed), for team switchers / listings. */
export async function listManagedTeams(user: AuthUser): Promise<ManagedTeam[]> {
  if (!COACH_ROLES.has(user.role)) return [];

  const primaryTeams = await db.select().from(teamTable).where(eq(teamTable.adminId, user.id));
  const coManagedRows = await db
    .select({ team: teamTable })
    .from(teamManagersTable)
    .innerJoin(teamTable, eq(teamManagersTable.teamId, teamTable.id))
    .where(eq(teamManagersTable.userId, user.id));

  const seen = new Set(primaryTeams.map((t) => t.id));
  const result: ManagedTeam[] = primaryTeams.map((team) => ({ team, isPrimary: true, isCoManager: false }));
  for (const row of coManagedRows) {
    if (seen.has(row.team.id)) continue;
    seen.add(row.team.id);
    result.push({ team: row.team, isPrimary: false, isCoManager: true });
  }
  return result.sort((a, b) => a.team.id - b.team.id);
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
    .where(and(eq(athleteTable.id, athleteId), eq(athleteTable.teamId, team.id), eq(userTable.isDeleted, false)))
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
    .where(and(eq(athleteTable.id, athleteId), eq(athleteTable.teamId, team.id), eq(userTable.isDeleted, false)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw { status: 404, message: "Athlete not on this team." };
  }

  const tempPassword = customPasswordPlain !== undefined ? customPasswordPlain : generateProvisionPassword();
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

  await db.update(teamTable).set({ emailSlug: next, updatedAt: new Date() }).where(eq(teamTable.id, team.id));

  return { emailSlug: next };
}

/**
 * Ensure a team athlete has a parent/guardian account linked to it so the parent
 * can sign in to the parent portal and see their child. Team athletes are created
 * with `guardianId = null`; this find-or-creates the guardian user (role "guardian")
 * + guardian row and points `athlete.guardianId` at it.
 *
 * Idempotent: safe to re-run. Reuses an existing user with the same email (e.g. a
 * parent who already self-registered) and sets a temporary password only when that
 * account has none yet, so we never clobber a password the parent already set.
 */
export async function ensureGuardianForTeamAthlete(input: {
  athleteId: number;
  parentEmail: string;
  parentName?: string | null;
}): Promise<{
  guardianUserId: number;
  guardianId: number;
  email: string;
  temporaryPassword: string | null;
  createdUser: boolean;
}> {
  const email = input.parentEmail.trim().toLowerCase();
  if (!email) throw { status: 400, message: "Parent email is required." };

  let temporaryPassword: string | null = null;
  let createdUser = false;

  const [existingUser] = await db
    .select({ id: userTable.id, passwordHash: userTable.passwordHash })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);

  let guardianUserId: number;
  if (existingUser) {
    guardianUserId = existingUser.id;
    // Account exists but never finished signup (no password): give it a usable one.
    if (!existingUser.passwordHash) {
      temporaryPassword = generateProvisionPassword();
      const { hash, salt } = hashProvisionPassword(temporaryPassword);
      await db
        .update(userTable)
        .set({ passwordHash: hash, passwordSalt: salt, emailVerified: true, updatedAt: new Date() })
        .where(eq(userTable.id, guardianUserId));
    }
  } else {
    temporaryPassword = generateProvisionPassword();
    const { hash, salt } = hashProvisionPassword(temporaryPassword);
    const inserted = await db
      .insert(userTable)
      .values({
        cognitoSub: `local:team-guardian:${crypto.randomUUID()}`,
        name: input.parentName?.trim() || email.split("@")[0],
        email,
        role: "guardian",
        passwordHash: hash,
        passwordSalt: salt,
        emailVerified: true,
      })
      .returning({ id: userTable.id });
    guardianUserId = inserted[0]?.id as number;
    if (!guardianUserId) throw new Error("Guardian user insert failed");
    createdUser = true;
  }

  const [existingGuardian] = await db
    .select({ id: guardianTable.id })
    .from(guardianTable)
    .where(eq(guardianTable.userId, guardianUserId))
    .limit(1);

  let guardianId: number;
  if (existingGuardian) {
    guardianId = existingGuardian.id;
  } else {
    const insertedGuardian = await db
      .insert(guardianTable)
      .values({ userId: guardianUserId, email, relationToAthlete: "Parent" })
      .returning({ id: guardianTable.id });
    guardianId = insertedGuardian[0]?.id as number;
    if (!guardianId) throw new Error("Guardian record insert failed");
  }

  await db.update(athleteTable).set({ guardianId, updatedAt: new Date() }).where(eq(athleteTable.id, input.athleteId));

  return { guardianUserId, guardianId, email, temporaryPassword, createdUser };
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
    guardianEmail?: string | null;
  },
) {
  const team = await getManagedTeamForUser(user, input.teamId ?? null);
  if (!team) {
    throw { status: 403, message: "Team not found or access denied." };
  }

  const usernameSlug = slugifySegment(input.username, 32);
  if (usernameSlug.length < 2) {
    throw { status: 400, message: "Username must be at least 2 letters or numbers." };
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

  const athleteType = age >= 18 ? ("adult" as const) : ("youth" as const);
  const tempPassword = input.customPassword !== undefined ? input.customPassword : generateProvisionPassword();
  const { hash, salt } = hashProvisionPassword(tempPassword);

  // Resolve sponsored plan info before entering the transaction
  let sponsoredTier: (typeof athleteTable.$inferInsert)["currentProgramTier"] = undefined;
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

  // BUG 4 FIX: Wrap capacity check + insert in a transaction so concurrent
  // requests cannot both pass the capacity gate and both insert an athlete.
  let athleteId: number;
  let userId: number;
  try {
    const result = await db.transaction(async (tx) => {
      // Re-check capacity inside the transaction (serialised read)
      const countRows = await tx
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

      const insertedUser = await tx
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
      const newUserId = insertedUser[0]?.id ?? null;
      if (!newUserId) throw new Error("User insert failed");

      const insertedAthlete = await tx
        .insert(athleteTable)
        .values({
          userId: newUserId,
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

      const newAthleteId = insertedAthlete[0]?.id;
      if (!newAthleteId) throw new Error("Athlete insert failed");

      await tx.insert(legalAcceptanceTable).values({
        athleteId: newAthleteId,
        termsAcceptedAt: new Date(),
        termsVersion: "1.0",
        privacyAcceptedAt: new Date(),
        privacyVersion: "1.0",
        appVersion: "1.0.0",
      });

      return { athleteId: newAthleteId, userId: newUserId };
    });
    athleteId = result.athleteId;
    userId = result.userId;
  } catch (e: any) {
    throw e;
  }

  await addTeamAthleteToTeamChat(team.name, userId, user.id).catch((err) => {
    logger.warn({ err }, "[team-roster] addTeamAthleteToTeamChat failed");
  });

  // Optionally provision a linked parent/guardian account so the parent can use the portal.
  let guardian: Awaited<ReturnType<typeof ensureGuardianForTeamAthlete>> | null = null;
  if (input.guardianEmail?.trim()) {
    try {
      guardian = await ensureGuardianForTeamAthlete({
        athleteId,
        parentEmail: input.guardianEmail,
        parentName: displayName,
      });
    } catch (err) {
      logger.warn({ err }, "[team-roster] ensureGuardianForTeamAthlete failed");
    }
  }

  return {
    athleteId,
    userId,
    email,
    temporaryPassword: tempPassword,
    teamSlug,
    guardian,
  };
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
