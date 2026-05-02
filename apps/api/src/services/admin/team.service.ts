import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  athleteTable,
  chatGroupMemberTable,
  chatGroupTable,
  guardianTable,
  teamTable,
  userTable,
  ProgramType,
  subscriptionPlanTable,
  athleteTrainingSessionCompletionTable,
  trainingModuleSessionTable,
  trainingModuleTable,
} from "../../db/schema";
import { getStripeClient, getSuccessUrl, getCancelUrl, createTeamCheckoutSession } from "../billing/stripe.service";
import { createTeamManagerUser } from "./user.service";
import { sendPlanInviteEmail } from "../../lib/mailer/billing.mailer";

async function ensureTeamExists(input: {
  name: string;
  athleteType?: "youth" | "adult";
  emailSlug?: string;
  minAge?: number;
  maxAge?: number;
  adminId?: number;
  planId?: number;
  maxAthletes?: number;
  sponsoredPlayerCount?: number;
  sponsoredPlanId?: number;
}) {
  const cleanTeamName = input.name.trim();
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
      athleteType: input.athleteType ?? "youth",
      emailSlug: input.emailSlug ?? null,
      minAge: input.minAge ?? null,
      maxAge: input.maxAge ?? null,
      adminId: input.adminId,
      planId: input.planId,
      maxAthletes: input.maxAthletes ?? 0,
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
    .where(and(eq(chatGroupTable.name, cleanTeamName), eq(chatGroupTable.category, "team")))
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
    .where(and(eq(chatGroupTable.name, cleanTeamName), eq(chatGroupTable.category, "team")))
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

async function syncTeamChatMembers(teamId: number, groupId: number) {
  const teamRows = await db
    .select({ adminId: teamTable.adminId })
    .from(teamTable)
    .where(eq(teamTable.id, teamId))
    .limit(1);

  const teamAdminId = teamRows[0]?.adminId;

  const athleteUsers = await db
    .select({
      athleteUserId: athleteTable.userId,
      guardianId: athleteTable.guardianId,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(and(eq(athleteTable.teamId, teamId), eq(userTable.isDeleted, false)));

  const guardianIds = athleteUsers.map((row) => row.guardianId).filter((id): id is number => typeof id === "number");

  const guardianUsers = guardianIds.length
    ? await db
        .select({ userId: guardianTable.userId })
        .from(guardianTable)
        .innerJoin(userTable, eq(guardianTable.userId, userTable.id))
        .where(and(eq(userTable.isDeleted, false), inArray(guardianTable.id, guardianIds)))
    : [];

  const staffUsers = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(
      and(
        inArray(userTable.role, ["coach", "program_coach", "team_coach", "admin", "superAdmin"]),
        eq(userTable.isDeleted, false),
      ),
    );

  const userIds = [
    ...athleteUsers.map((row) => row.athleteUserId),
    ...guardianUsers.map((row) => row.userId),
    ...staffUsers.map((row) => row.id),
  ];

  if (teamAdminId) userIds.push(teamAdminId);

  await addUsersToGroup(groupId, userIds);
}

export async function createTeamAdmin(input: {
  teamName: string;
  athleteType?: "youth" | "adult";
  emailSlug?: string;
  minAge?: number;
  maxAge?: number;
  adminId?: number;
  managerEmail?: string;
  managerPassword?: string;
  managerName?: string;
  tier: (typeof ProgramType.enumValues)[number];
  maxAthletes: number;
  createdByUserId: number;
  paymentMethod?: "pay_now" | "email_link" | "cash";
  billingCycle?: "monthly" | "6months" | "yearly";
  hasSponsoredPlayers?: boolean;
  sponsoredPlayerCount?: number;
  sponsoredTier?: (typeof ProgramType.enumValues)[number];
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

  const plans = await db
    .select()
    .from(subscriptionPlanTable)
    .where(and(eq(subscriptionPlanTable.tier, input.tier), eq(subscriptionPlanTable.isActive, true)))
    .limit(1);
  const plan = plans[0] ?? null;
  const resolvedPlanId = plan?.id ?? null;

  const sponsoredCount = input.hasSponsoredPlayers ? Math.max(0, input.sponsoredPlayerCount ?? 0) : 0;
  let sponsoredPlanId: number | null = null;
  let sponsoredTier: (typeof ProgramType.enumValues)[number] | null = null;
  if (sponsoredCount > 0 && input.sponsoredTier) {
    const sponsoredPlans = await db
      .select()
      .from(subscriptionPlanTable)
      .where(and(eq(subscriptionPlanTable.tier, input.sponsoredTier), eq(subscriptionPlanTable.isActive, true)))
      .limit(1);
    sponsoredPlanId = sponsoredPlans[0]?.id ?? null;
    sponsoredTier = input.sponsoredTier;
  }

  // If manager credentials are provided, create the manager user first.
  let resolvedAdminId = input.adminId;
  if (input.managerEmail && input.managerPassword) {
    const manager = await createTeamManagerUser({
      email: input.managerEmail,
      password: input.managerPassword,
      name: input.managerName,
    });
    resolvedAdminId = manager.id;
  }

  if (!resolvedAdminId) {
    throw { status: 400, message: "A team manager is required. Provide managerEmail and managerPassword." };
  }

  const paymentMethod = input.paymentMethod ?? "pay_now";
  const billingCycle = input.billingCycle ?? "monthly";

  // Create the team record first
  const created = await ensureTeamExists({
    name: cleanTeamName,
    athleteType: input.athleteType,
    emailSlug: input.emailSlug,
    minAge: input.minAge,
    maxAge: input.maxAge,
    adminId: resolvedAdminId,
    planId: resolvedPlanId ?? undefined,
    maxAthletes: input.maxAthletes + sponsoredCount,
  });

  if (created && sponsoredCount > 0) {
    await db
      .update(teamTable)
      .set({
        sponsoredPlayerCount: sponsoredCount,
        sponsoredPlanId: sponsoredPlanId,
        updatedAt: new Date(),
      })
      .where(eq(teamTable.id, created.id));
  }

  if (!created) {
    throw { status: 500, message: "Failed to create team record." };
  }

  const adminUserRows = await db
    .select({ id: userTable.id, role: userTable.role, email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, resolvedAdminId!))
    .limit(1);

  let adminEmail = adminUserRows[0]?.email;

  if (adminUserRows[0]) {
    // Preserve higher-level roles; promote everyone else (including generic "coach") to team_coach.
    const preserveRole = ["team_coach", "program_coach", "admin", "superAdmin"].includes(adminUserRows[0].role || "");
    if (!preserveRole) {
      await db.update(userTable).set({ role: "team_coach" }).where(eq(userTable.id, resolvedAdminId!));
    }
  }

  let checkoutUrl: string | null = null;

  if (paymentMethod === "cash") {
    // 1. CASH FLOW: Activate immediately
    const expiresAt = new Date();
    if (billingCycle === "6months") expiresAt.setMonth(expiresAt.getMonth() + 6);
    else if (billingCycle === "yearly") expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setMonth(expiresAt.getMonth() + 1);

    await db
      .update(teamTable)
      .set({
        subscriptionStatus: "active",
        planPaymentType: billingCycle === "monthly" ? "monthly" : "upfront",
        planCommitmentMonths: billingCycle === "6months" ? 6 : billingCycle === "yearly" ? 12 : 1,
        planExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(teamTable.id, created.id));
  } else {
    // 2. STRIPE FLOW (Pay Now or Email Link)
    // Construct the Lookup Key based on your convention: tier_interval
    // e.g. "php_pro_six_months"
    const intervalKey = billingCycle === "monthly" ? "monthly" : billingCycle === "6months" ? "six_months" : "yearly";
    const lookupKey = `${input.tier.toLowerCase()}_${intervalKey}`;

    try {
      const sponsoredLineItem =
        sponsoredCount > 0 && sponsoredTier
          ? {
              priceLookupKey: `${sponsoredTier.toLowerCase()}_${intervalKey}`,
              tier: sponsoredTier,
              quantity: sponsoredCount,
            }
          : undefined;

      const session = await createTeamCheckoutSession({
        teamId: created.id,
        adminId: resolvedAdminId!,
        priceLookupKey: lookupKey,
        tier: input.tier,
        interval: billingCycle === "monthly" ? "monthly" : billingCycle === "6months" ? "six_months" : "yearly",
        quantity: input.maxAthletes,
        mode: billingCycle === "monthly" ? "subscription" : "payment",
        customerEmail: paymentMethod === "email_link" ? adminEmail : undefined,
        sponsoredLineItem,
      });

      checkoutUrl = session.url;

      if (paymentMethod === "email_link" && checkoutUrl && adminEmail) {
        const managerName = adminUserRows[0]
          ? (input.managerName || adminEmail.split("@")[0])
          : adminEmail.split("@")[0];
        await sendPlanInviteEmail({
          to: adminEmail,
          name: managerName,
          planName: cleanTeamName,
          planTier: input.tier,
          checkoutUrl,
          invitedByName: null,
          loginCredentials: input.managerEmail && input.managerPassword
            ? { email: input.managerEmail, temporaryPassword: input.managerPassword }
            : null,
        });
      }
    } catch (err: any) {
      console.error("[Stripe] Failed to create team checkout session:", err);
    }
  }

  const group = await ensureTeamChatGroup(cleanTeamName, input.createdByUserId);
  if (group?.id) {
    await syncTeamChatMembers(created.id, group.id);
  }

  return {
    ok: true,
    team: created.name,
    teamId: created.id,
    checkoutUrl: paymentMethod === "pay_now" ? checkoutUrl : null,
    sentToEmail: paymentMethod === "email_link",
  };
}

export async function approveTeamAdmin(teamId: number, billingCycle: "monthly" | "6months" | "yearly" = "monthly") {
  const rows = await db
    .select({ id: teamTable.id, name: teamTable.name, subscriptionStatus: teamTable.subscriptionStatus })
    .from(teamTable)
    .where(eq(teamTable.id, teamId))
    .limit(1);
  const team = rows[0];
  if (!team) throw { status: 404, message: "Team not found." };

  const expiresAt = new Date();
  if (billingCycle === "6months") expiresAt.setMonth(expiresAt.getMonth() + 6);
  else if (billingCycle === "yearly") expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  else expiresAt.setMonth(expiresAt.getMonth() + 1);

  await db
    .update(teamTable)
    .set({
      subscriptionStatus: "active",
      planPaymentType: billingCycle === "monthly" ? "monthly" : "upfront",
      planCommitmentMonths: billingCycle === "6months" ? 6 : billingCycle === "yearly" ? 12 : 1,
      planExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(teamTable.id, teamId));

  return { ok: true, teamId, status: "active" };
}

export async function listTeamsAdmin(options?: { adminId?: number | null; limit?: number }) {
  const filters = [];
  if (typeof options?.adminId === "number") {
    filters.push(eq(teamTable.adminId, options.adminId));
  }

  const effectiveLimit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(200, Math.floor(options.limit)))
      : 200;

  const rows = await db
    .select({
      id: teamTable.id,
      team: teamTable.name,
      athleteType: teamTable.athleteType,
      minAge: teamTable.minAge,
      maxAge: teamTable.maxAge,
      adminId: teamTable.adminId,
      planId: teamTable.planId,
      maxAthletes: teamTable.maxAthletes,
      subscriptionStatus: teamTable.subscriptionStatus,
      planPaymentType: teamTable.planPaymentType,
      planCommitmentMonths: teamTable.planCommitmentMonths,
      planExpiresAt: teamTable.planExpiresAt,
      memberCount: sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false), 0)`,
      youthCount: sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false and ${athleteTable.athleteType}::text = 'youth'), 0)`,
      adultCount: sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false and ${athleteTable.athleteType}::text = 'adult'), 0)`,
      guardianCount: sql<number>`coalesce(count(distinct ${athleteTable.guardianId}) filter (where ${userTable.isDeleted} = false), 0)`,
      createdAt: teamTable.createdAt,
      updatedAt: teamTable.updatedAt,
    })
    .from(teamTable)
    .leftJoin(athleteTable, eq(athleteTable.teamId, teamTable.id))
    .leftJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .groupBy(
      teamTable.id,
      teamTable.name,
      teamTable.subscriptionStatus,
      teamTable.planPaymentType,
      teamTable.planCommitmentMonths,
      teamTable.planExpiresAt,
      teamTable.createdAt,
      teamTable.updatedAt,
    )
    .orderBy(
      desc(sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false), 0)`),
      teamTable.name,
    )
    .limit(effectiveLimit);

  return rows;
}

function normalizeInjuriesForText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const flattened = value.map((item) => (typeof item === "string" ? item.trim() : String(item))).filter(Boolean);
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
      id: teamTable.id,
      name: teamTable.name,
      athleteType: teamTable.athleteType,
      minAge: teamTable.minAge,
      maxAge: teamTable.maxAge,
      adminId: teamTable.adminId,
      planId: teamTable.planId,
      planTier: subscriptionPlanTable.tier,
      planName: subscriptionPlanTable.name,
      sponsoredPlayerCount: teamTable.sponsoredPlayerCount,
      sponsoredPlanId: teamTable.sponsoredPlanId,
      subscriptionStatus: teamTable.subscriptionStatus,
      createdAt: teamTable.createdAt,
      updatedAt: teamTable.updatedAt,
    })
    .from(teamTable)
    .leftJoin(subscriptionPlanTable, eq(teamTable.planId, subscriptionPlanTable.id))
    .where(eq(teamTable.name, cleanTeamName))
    .limit(1);
  const team = teamRows[0];
  if (!team) return null;

  let manager: { id: number; name: string | null; email: string; role: string | null } | null = null;
  if (team.adminId) {
    const [row] = await db
      .select({ id: userTable.id, name: userTable.name, email: userTable.email, role: userTable.role })
      .from(userTable)
      .where(eq(userTable.id, team.adminId))
      .limit(1);
    if (row) manager = row;
  }

  const sessionsCompletedExpr = sql<number>`(SELECT count(*) FROM ${athleteTrainingSessionCompletionTable} WHERE ${athleteTrainingSessionCompletionTable.athleteId} = ${athleteTable.id})`;
  const modulesCompletedExpr = sql<number>`(
    SELECT count(DISTINCT m.id)
    FROM ${trainingModuleTable} m
    WHERE NOT EXISTS (
      SELECT 1 FROM ${trainingModuleSessionTable} s
      WHERE s."moduleId" = m.id
      AND NOT EXISTS (
        SELECT 1 FROM ${athleteTrainingSessionCompletionTable} c
        WHERE c."athleteId" = ${athleteTable.id}
        AND c."sessionId" = s.id
      )
    )
    AND EXISTS (SELECT 1 FROM ${trainingModuleSessionTable} s2 WHERE s2."moduleId" = m.id)
  )`;

  const rows = await db
    .select({
      athleteId: athleteTable.id,
      athleteName: athleteTable.name,
      birthDate: athleteTable.birthDate,
      trainingPerWeek: athleteTable.trainingPerWeek,
      currentProgramTier: athleteTable.currentProgramTier,
      isSponsored: athleteTable.isSponsored,
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
      sessionsCompleted: sessionsCompletedExpr,
      modulesCompleted: modulesCompletedExpr,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .leftJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .where(and(eq(athleteTable.teamId, team.id), eq(userTable.isDeleted, false)))
    .orderBy(desc(sessionsCompletedExpr), asc(athleteTable.name));

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

  function calcAge(birthDate: string | null): number | null {
    if (!birthDate) return null;
    const dob = new Date(birthDate);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }

  return {
    team: team.name,
    teamId: team.id,
    athleteType: team.athleteType ?? "youth",
    minAge: team.minAge,
    maxAge: team.maxAge,
    planTier: team.planTier ?? null,
    planName: team.planName ?? null,
    sponsoredPlayerCount: team.sponsoredPlayerCount,
    sponsoredPlanId: team.sponsoredPlanId,
    subscriptionStatus: team.subscriptionStatus ?? "pending_payment",
    manager,
    summary: {
      memberCount,
      guardianCount,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    },
    defaults,
    members: rows.map((row, index) => ({
      athleteId: row.athleteId,
      athleteName: row.athleteName,
      birthDate: row.birthDate,
      age: calcAge(row.birthDate),
      trainingPerWeek: row.trainingPerWeek,
      currentProgramTier: row.currentProgramTier,
      isSponsored: row.isSponsored,
      guardianEmail: row.guardianEmail,
      guardianPhone: row.guardianPhone,
      relationToAthlete: row.relationToAthlete,
      sessionsCompleted: row.sessionsCompleted,
      modulesCompleted: row.modulesCompleted,
      rank: index + 1,
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
  const team = await ensureTeamExists({ name: cleanTeamName });
  if (!team) throw { status: 404, message: "Team not found." };

  await db.update(teamTable).set({ updatedAt: new Date() }).where(eq(teamTable.id, team.id));

  const rows = await db
    .update(athleteTable)
    .set({
      injuries: input.injuries?.trim() ? input.injuries.trim() : null,
      growthNotes: input.growthNotes?.trim() ? input.growthNotes.trim() : null,
      performanceGoals: input.performanceGoals?.trim() ? input.performanceGoals.trim() : null,
      equipmentAccess: input.equipmentAccess?.trim() ? input.equipmentAccess.trim() : null,
      updatedAt: new Date(),
    })
    .where(eq(athleteTable.teamId, team.id))
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
  const team = await ensureTeamExists({ name: cleanTeamName });
  if (!team) throw { status: 404, message: "Team not found." };

  const athleteRows = await db
    .select({
      id: athleteTable.id,
      teamId: athleteTable.teamId,
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
  if (athlete.teamId !== team.id) {
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
  if (input.growthNotes !== undefined)
    athletePatch.growthNotes = input.growthNotes?.trim() ? input.growthNotes.trim() : null;
  if (input.performanceGoals !== undefined)
    athletePatch.performanceGoals = input.performanceGoals?.trim() ? input.performanceGoals.trim() : null;
  if (input.equipmentAccess !== undefined)
    athletePatch.equipmentAccess = input.equipmentAccess?.trim() ? input.equipmentAccess.trim() : null;

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

  await db.update(teamTable).set({ updatedAt: new Date() }).where(eq(teamTable.id, team.id));

  return { ok: true };
}

export async function attachAthleteToTeamAdmin(input: {
  teamName: string;
  athleteId: number;
  allowMoveFromOtherTeam?: boolean;
  isSponsored?: boolean;
  createdByUserId: number;
}) {
  const cleanTeamName = input.teamName.trim();
  const team = await ensureTeamExists({ name: cleanTeamName });
  if (!team) throw { status: 404, message: "Team not found." };

  const rows = await db
    .select({
      id: athleteTable.id,
      teamId: athleteTable.teamId,
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

  if (athlete.teamId === team.id) {
    return { ok: true, alreadyInTeam: true };
  }

  // Check team capacity
  const [{ count }] = await db
    .select({ count: sql<number>`count(${athleteTable.id})` })
    .from(athleteTable)
    .where(eq(athleteTable.teamId, team.id));

  const teamWithPlan = await db
    .select({ maxAthletes: teamTable.maxAthletes })
    .from(teamTable)
    .where(eq(teamTable.id, team.id))
    .limit(1);

  const limit = teamWithPlan[0]?.maxAthletes ?? 0;
  if (limit > 0 && count >= limit) {
    throw {
      status: 403,
      message: `Team "${team.name}" is full (${count}/${limit} slots). Please upgrade the plan to add more members.`,
    };
  }

  if (athlete.teamId) {
    if (!input.allowMoveFromOtherTeam) {
      throw {
        status: 400,
        message: `Athlete is already assigned to another team. An athlete can only belong to one team.`,
      };
    }
  }

  const athletePatch: Partial<typeof athleteTable.$inferInsert> = {
    teamId: team.id,
    updatedAt: new Date(),
  };
  if (input.isSponsored) {
    athletePatch.isSponsored = true;
    const [fullTeam] = await db
      .select({ sponsoredPlanId: teamTable.sponsoredPlanId })
      .from(teamTable)
      .where(eq(teamTable.id, team.id))
      .limit(1);
    if (fullTeam?.sponsoredPlanId) {
      const [sponsoredPlan] = await db
        .select({ tier: subscriptionPlanTable.tier, id: subscriptionPlanTable.id })
        .from(subscriptionPlanTable)
        .where(eq(subscriptionPlanTable.id, fullTeam.sponsoredPlanId))
        .limit(1);
      if (sponsoredPlan?.tier) {
        athletePatch.currentProgramTier = sponsoredPlan.tier;
        athletePatch.currentPlanId = sponsoredPlan.id;
      }
    }
  }
  await db
    .update(athleteTable)
    .set(athletePatch)
    .where(eq(athleteTable.id, athlete.id));

  await db.update(teamTable).set({ updatedAt: new Date() }).where(eq(teamTable.id, team.id));

  if (athlete.teamId) {
    await db.update(teamTable).set({ updatedAt: new Date() }).where(eq(teamTable.id, athlete.teamId));
  }

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
  };
}

export async function deleteTeamAdmin(teamId: number) {
  const rows = await db
    .select({ id: teamTable.id, name: teamTable.name })
    .from(teamTable)
    .where(eq(teamTable.id, teamId))
    .limit(1);
  const team = rows[0];
  if (!team) throw { status: 404, message: "Team not found." };

  // Detach athletes from this team (don't delete them — just unlink)
  await db
    .update(athleteTable)
    .set({ teamId: null, team: "", updatedAt: new Date() })
    .where(eq(athleteTable.teamId, teamId));

  // Remove team chat group
  const groups = await db
    .select({ id: chatGroupTable.id })
    .from(chatGroupTable)
    .where(and(eq(chatGroupTable.name, team.name), eq(chatGroupTable.category, "team")))
    .limit(1);
  if (groups[0]) {
    await db.delete(chatGroupMemberTable).where(eq(chatGroupMemberTable.groupId, groups[0].id));
    await db.delete(chatGroupTable).where(eq(chatGroupTable.id, groups[0].id));
  }

  await db.delete(teamTable).where(eq(teamTable.id, teamId));

  return { ok: true, teamId, teamName: team.name };
}

/** Adds a coach-provisioned athlete user to the team chat group (best-effort). */
export async function addTeamAthleteToTeamChat(teamName: string, athleteUserId: number, createdByUserId: number) {
  const group = await ensureTeamChatGroup(teamName.trim(), createdByUserId);
  if (!group?.id) return;
  await addUsersToGroup(group.id, [athleteUserId]);
}
