import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql, ne } from "drizzle-orm";

import { cognitoClient } from "../lib/aws";
import { db } from "../db";
import {
  adminSettingsTable,
  AthleteType,
  athleteTable,
  onboardingConfigTable,
  availabilityBlockTable,
  bookingTable,
  contentTable,
  enrollmentTable,
  exerciseTable,
  guardianTable,
  legalAcceptanceTable,
  messageTable,
  physioRefferalsTable,
  programTable,
  PlanPaymentType,
  serviceTypeTable,
  sessionExerciseTable,
  sessionTable,
  userTable,
  ProgramType,
  videoUploadTable,
  notificationTable,
  programSectionContentTable,
} from "../db/schema";
import { env } from "../config/env";
import { sendAdminWelcomeCredentialsEmail, sendBookingApprovedEmail, sendBookingDeclinedEmail } from "../lib/mailer";
import { ensureAthleteUserRecord, submitOnboarding } from "./onboarding.service";
import { createUserFromCognito, getAthleteForUser, getUserByEmail } from "./user.service";
import { getAdminCoachIds, sendMessage } from "./message.service";
import { attachDirectMessageReactions } from "./reaction.service";
import { calculateAge, parseISODate } from "../lib/age";

const defaultOnboardingConfig = {
  version: 1,
  fields: [
    { id: "athleteName", label: "Athlete Name", type: "text", required: true, visible: true },
    { id: "birthDate", label: "Birth Date", type: "date", required: true, visible: true },
    {
      id: "team",
      label: "Team",
      type: "dropdown",
      required: true,
      visible: true,
      options: ["Team A", "Team B"],
    },
    {
      id: "level",
      label: "Level",
      type: "dropdown",
      required: true,
      visible: true,
      options: ["U12", "U14", "U16", "U18"],
      optionsByTeam: {
        "Team A": ["U12", "U14"],
        "Team B": ["U16", "U18"],
      },
    },
    { id: "trainingPerWeek", label: "Training Days / Week", type: "number", required: true, visible: true },
    { id: "injuries", label: "Injuries / History", type: "text", required: true, visible: true },
    { id: "growthNotes", label: "Growth Notes", type: "text", required: false, visible: true },
    { id: "performanceGoals", label: "Performance Goals", type: "text", required: true, visible: true },
    { id: "equipmentAccess", label: "Equipment Access", type: "text", required: true, visible: true },
    { id: "parentEmail", label: "Guardian Email", type: "text", required: true, visible: true },
    { id: "parentPhone", label: "Guardian Phone", type: "text", required: false, visible: true },
  ],
  requiredDocuments: [
    { id: "consent", label: "Guardian Consent Form", required: true },
  ],
  welcomeMessage: "Welcome to PH Performance. Let's get your athlete set up.",
  coachMessage: "Need help? Your coach is ready to support you.",
  defaultProgramTier: "PHP" as (typeof ProgramType.enumValues)[number],
  approvalWorkflow: "manual",
  notes: "",
  phpPlusProgramTabs: [
    "Program",
    "Warmups",
    "Cool Downs",
    "Mobility",
    "Recovery",
    "In-Season Program",
    "Off-Season Program",
    "Video Upload",
    "Submit Diary",
    "Bookings",
  ],
};

const PHP_PLUS_TABS = new Set(defaultOnboardingConfig.phpPlusProgramTabs);

const normalizePhpPlusTabs = (input: unknown) => {
  if (!Array.isArray(input)) return null;
  const normalized = input
    .map((tab) => String(tab))
    .filter((tab) => PHP_PLUS_TABS.has(tab));
  return normalized;
};

async function ensureOnboardingConfigTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "onboarding_configs" (
      "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      "version" integer DEFAULT 1 NOT NULL,
      "fields" jsonb NOT NULL,
      "requiredDocuments" jsonb NOT NULL,
      "welcomeMessage" varchar(500),
      "coachMessage" varchar(500),
      "defaultProgramTier" program_type NOT NULL DEFAULT 'PHP',
      "approvalWorkflow" varchar(50) NOT NULL DEFAULT 'manual',
      "notes" varchar(1000),
      "phpPlusProgramTabs" jsonb,
      "createdBy" integer REFERENCES "users"("id"),
      "updatedBy" integer REFERENCES "users"("id"),
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    ALTER TABLE "onboarding_configs" ADD COLUMN IF NOT EXISTS "phpPlusProgramTabs" jsonb
  `);
  await db.execute(sql`
    ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "extraResponses" jsonb
  `);
}

async function getOrCreateAdminSettings(userId: number) {
  const existing = await db
    .select()
    .from(adminSettingsTable)
    .where(eq(adminSettingsTable.userId, userId))
    .limit(1);

  if (existing[0]) return existing[0];

  const created = await db
    .insert(adminSettingsTable)
    .values({ userId })
    .returning();

  return created[0];
}

export async function getAdminProfile(userId: number) {
  const users = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
  const user = users[0];
  if (!user) return null;
  const settings = await getOrCreateAdminSettings(userId);
  return { user, settings };
}

export async function updateAdminProfile(
  userId: number,
  input: {
    name: string;
    email: string;
    profilePicture?: string | null;
    title?: string | null;
    bio?: string | null;
  }
) {
  await db
    .update(userTable)
    .set({
      name: input.name,
      email: input.email,
      profilePicture: input.profilePicture ?? null,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId));

  const existing = await getOrCreateAdminSettings(userId);

  await db
    .update(adminSettingsTable)
    .set({
      title: input.title ?? existing.title ?? null,
      bio: input.bio ?? existing.bio ?? null,
      updatedAt: new Date(),
    })
    .where(eq(adminSettingsTable.id, existing.id));

  return getAdminProfile(userId);
}

export async function updateAdminPreferences(
  userId: number,
  input: {
    timezone: string;
    notificationSummary: string;
    workStartHour: number;
    workStartMinute: number;
    workEndHour: number;
    workEndMinute: number;
  }
) {
  const existing = await getOrCreateAdminSettings(userId);

  await db
    .update(adminSettingsTable)
    .set({
      timezone: input.timezone,
      notificationSummary: input.notificationSummary,
      workStartHour: input.workStartHour,
      workStartMinute: input.workStartMinute,
      workEndHour: input.workEndHour,
      workEndMinute: input.workEndMinute,
      updatedAt: new Date(),
    })
    .where(eq(adminSettingsTable.id, existing.id));

  return getAdminProfile(userId);
}

export async function updateAdminMessagingAccess(
  coachUserId: number,
  tiers: (typeof ProgramType.enumValues)[number][]
) {
  const allowed = new Set(ProgramType.enumValues);
  const cleaned = tiers.filter((t) => allowed.has(t));
  const existing = await getOrCreateAdminSettings(coachUserId);
  await db
    .update(adminSettingsTable)
    .set({
      messagingEnabledTiers: cleaned,
      updatedAt: new Date(),
    })
    .where(eq(adminSettingsTable.id, existing.id));
  return cleaned;
}

export async function getOnboardingConfig() {
  try {
    const configs = await db.select().from(onboardingConfigTable).limit(1);
    if (configs[0]) return configs[0];
  } catch (error: any) {
    await ensureOnboardingConfigTable();
  }

  const created = await db
    .insert(onboardingConfigTable)
    .values({
      version: defaultOnboardingConfig.version,
      fields: defaultOnboardingConfig.fields,
      requiredDocuments: defaultOnboardingConfig.requiredDocuments,
      welcomeMessage: defaultOnboardingConfig.welcomeMessage,
      coachMessage: defaultOnboardingConfig.coachMessage,
      defaultProgramTier: defaultOnboardingConfig.defaultProgramTier,
      approvalWorkflow: defaultOnboardingConfig.approvalWorkflow,
      notes: defaultOnboardingConfig.notes,
      phpPlusProgramTabs: defaultOnboardingConfig.phpPlusProgramTabs,
    } as any)
    .returning();

  return created[0];
}

export async function getPhpPlusProgramTabsAdmin() {
  const config = await getOnboardingConfig();
  const normalized = normalizePhpPlusTabs(config?.phpPlusProgramTabs);
  return normalized ?? defaultOnboardingConfig.phpPlusProgramTabs;
}

export async function setPhpPlusProgramTabsAdmin(
  userId: number,
  tabs: unknown
) {
  await ensureOnboardingConfigTable();
  const normalized = normalizePhpPlusTabs(tabs);
  const existing = await db.select().from(onboardingConfigTable).limit(1);
  if (existing[0]) {
    const updated = await db
      .update(onboardingConfigTable)
      .set({
        phpPlusProgramTabs: normalized,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(onboardingConfigTable.id, existing[0].id))
      .returning();
    return updated[0];
  }
  const created = await db
    .insert(onboardingConfigTable)
    .values({
      version: defaultOnboardingConfig.version,
      fields: defaultOnboardingConfig.fields,
      requiredDocuments: defaultOnboardingConfig.requiredDocuments,
      welcomeMessage: defaultOnboardingConfig.welcomeMessage,
      coachMessage: defaultOnboardingConfig.coachMessage,
      defaultProgramTier: defaultOnboardingConfig.defaultProgramTier,
      approvalWorkflow: defaultOnboardingConfig.approvalWorkflow,
      notes: defaultOnboardingConfig.notes,
      phpPlusProgramTabs: normalized,
      createdBy: userId,
      updatedBy: userId,
    } as any)
    .returning();
  return created[0];
}

export async function clearPhpPlusProgramTabsAdmin(userId: number) {
  return setPhpPlusProgramTabsAdmin(userId, []);
}

export async function updateOnboardingConfig(
  userId: number,
  input: {
    version: number;
    fields: any;
    requiredDocuments: any;
    welcomeMessage?: string | null;
    coachMessage?: string | null;
    defaultProgramTier?: (typeof ProgramType.enumValues)[number];
    approvalWorkflow: string;
    notes?: string | null;
    phpPlusProgramTabs?: string[] | null;
  }
) {
  await ensureOnboardingConfigTable();
  const normalizedPhpPlusTabs = normalizePhpPlusTabs(input.phpPlusProgramTabs);
  const existing = await db.select().from(onboardingConfigTable).limit(1);
  const resolvedDefaultTier =
    input.defaultProgramTier ?? existing[0]?.defaultProgramTier ?? ("PHP" as (typeof ProgramType.enumValues)[number]);
  if (existing[0]) {
    const updated = await db
      .update(onboardingConfigTable)
      .set({
        version: input.version,
        fields: input.fields,
        requiredDocuments: input.requiredDocuments,
        welcomeMessage: input.welcomeMessage ?? null,
        coachMessage: input.coachMessage ?? null,
        defaultProgramTier: resolvedDefaultTier,
        approvalWorkflow: input.approvalWorkflow,
        notes: input.notes ?? null,
        phpPlusProgramTabs: normalizedPhpPlusTabs,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(onboardingConfigTable.id, existing[0].id))
      .returning();
    return updated[0];
  }

  const created = await db
    .insert(onboardingConfigTable)
    .values({
      version: input.version,
      fields: input.fields,
      requiredDocuments: input.requiredDocuments,
      welcomeMessage: input.welcomeMessage ?? null,
      coachMessage: input.coachMessage ?? null,
      defaultProgramTier: resolvedDefaultTier,
      approvalWorkflow: input.approvalWorkflow,
      notes: input.notes ?? null,
      phpPlusProgramTabs: normalizedPhpPlusTabs,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  return created[0];
}

export async function listUsers(options?: { q?: string; limit?: number }) {
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
      // Avoid enum comparison issues by comparing text
      .where(sql`${userTable.role}::text <> 'athlete'`);
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
        ilike(athleteTable.team, pattern),
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
  const guardianIds: number[] = [];
  for (const guardian of guardians) {
    guardianById.set(guardian.guardianId, {
      userId: guardian.userId,
      activeAthleteId: guardian.activeAthleteId ?? null,
    });
    guardianIds.push(guardian.guardianId);
  }

  const tierByUserId = new Map<number, string | null>();
  for (const guardian of guardians) {
    if (guardian.guardianProgramTier) {
      tierByUserId.set(guardian.userId, guardian.guardianProgramTier);
    }
  }
  const activeAthleteIds = guardians
    .map((guardian) => guardian.activeAthleteId)
    .filter((id): id is number => typeof id === "number");

  if (activeAthleteIds.length) {
    const activeAthletes = await db
      .select({
        id: athleteTable.id,
        guardianId: athleteTable.guardianId,
        programTier: athleteTable.currentProgramTier,
      })
      .from(athleteTable)
      .where(inArray(athleteTable.id, activeAthleteIds));

    for (const athlete of activeAthletes) {
      if (!athlete.guardianId) continue;
      const guardian = guardianById.get(athlete.guardianId);
      if (!guardian || !athlete.programTier) continue;
      if (tierByUserId.has(guardian.userId)) continue;
      tierByUserId.set(guardian.userId, athlete.programTier);
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
      if (athlete.programTier) {
        tierByUserId.set(guardian.userId, athlete.programTier);
      }
    }
  }

  return users.map((user) => {
    if (user.role !== "guardian") return user;
    const resolvedTier = tierByUserId.get(user.id);
    if (!resolvedTier) return user;
    return { ...user, programTier: resolvedTier };
  });
}

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

export async function setUserBlocked(userId: number, blocked: boolean) {
  const result = await db
    .update(userTable)
    .set({ isBlocked: blocked, updatedAt: new Date() })
    .where(eq(userTable.id, userId))
    .returning();
  return result[0] ?? null;
}

export async function softDeleteUser(userId: number) {
  const result = await db
    .update(userTable)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(userTable.id, userId))
    .returning();
  return result[0] ?? null;
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

export async function updateGuardianProgramTier(userId: number, tier: (typeof ProgramType.enumValues)[number]) {
  const guardians = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  const guardian = guardians[0] ?? null;
  if (!guardian) return null;
  const result = await db
    .update(guardianTable)
    .set({ currentProgramTier: tier, updatedAt: new Date() })
    .where(eq(guardianTable.id, guardian.id))
    .returning();
  return result[0] ?? null;
}

export async function assignEnrollment(input: {
  athleteId: number;
  programType: (typeof ProgramType.enumValues)[number];
  programTemplateId?: number | null;
  assignedByCoach: number;
}) {
  const result = await db
    .insert(enrollmentTable)
    .values({
      athleteId: input.athleteId,
      programType: input.programType,
      status: "active",
      programTemplateId: input.programTemplateId ?? null,
      assignedByCoach: input.assignedByCoach,
    })
    .returning();

  return result[0];
}

export async function createProgramTemplate(input: {
  name: string;
  type: (typeof ProgramType.enumValues)[number];
  description?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  createdBy: number;
}) {
  const result = await db
    .insert(programTable)
    .values({
      name: input.name,
      type: input.type,
      description: input.description ?? null,
      minAge: input.minAge ?? null,
      maxAge: input.maxAge ?? null,
      isTemplate: true,
      createdBy: input.createdBy,
    })
    .returning();

  return result[0];
}

export async function listProgramTemplates(options?: { q?: string; limit?: number }) {
  const q = options?.q?.trim() ?? "";
  const requestedLimit = options?.limit;
  const limit =
    typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
      : 50;
  const conditions = [eq(programTable.isTemplate, true)];
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(programTable.name, pattern),
        sql`${programTable.type}::text ILIKE ${pattern}`,
        ilike(programTable.description, pattern),
        sql`${programTable.id}::text ILIKE ${pattern}`,
      )!,
    );
  }

  return db
    .select()
    .from(programTable)
    .where(and(...conditions))
    .orderBy(desc(programTable.createdAt))
    .limit(limit);
}

export async function updateProgramTemplate(input: {
  programId: number;
  name?: string | null;
  type?: (typeof ProgramType.enumValues)[number] | null;
  description?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
}) {
  const existing = await db.select().from(programTable).where(eq(programTable.id, input.programId)).limit(1);
  if (!existing[0]) {
    throw new Error("Program template not found");
  }
  const [updated] = await db
    .update(programTable)
    .set({
      name: input.name ?? existing[0].name,
      type: input.type ?? existing[0].type,
      description: input.description ?? existing[0].description ?? null,
      minAge: input.minAge ?? existing[0].minAge ?? null,
      maxAge: input.maxAge ?? existing[0].maxAge ?? null,
      updatedAt: new Date(),
    })
    .where(eq(programTable.id, input.programId))
    .returning();
  return updated;
}

export async function createExercise(input: {
  name: string;
  category?: string | null;
  cues?: string | null;
  howTo?: string | null;
  progression?: string | null;
  regression?: string | null;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
  videoUrl?: string | null;
}) {
  const result = await db
    .insert(exerciseTable)
    .values({
      name: input.name,
      category: input.category ?? null,
      cues: input.cues ?? null,
      howTo: input.howTo ?? null,
      progression: input.progression ?? null,
      regression: input.regression ?? null,
      sets: input.sets ?? null,
      reps: input.reps ?? null,
      duration: input.duration ?? null,
      restSeconds: input.restSeconds ?? null,
      notes: input.notes ?? null,
      videoUrl: input.videoUrl ?? null,
    })
    .returning();

  return result[0];
}

export async function listExercises() {
  return db
    .select()
    .from(exerciseTable)
    .orderBy(desc(exerciseTable.createdAt));
}

export async function updateExercise(
  exerciseId: number,
  input: {
    name?: string;
    category?: string | null;
    cues?: string | null;
    howTo?: string | null;
    progression?: string | null;
    regression?: string | null;
    sets?: number | null;
    reps?: number | null;
    duration?: number | null;
    restSeconds?: number | null;
    notes?: string | null;
    videoUrl?: string | null;
  }
) {
  const updatePayload: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.category !== undefined) updatePayload.category = input.category;
  if (input.cues !== undefined) updatePayload.cues = input.cues;
  if (input.howTo !== undefined) updatePayload.howTo = input.howTo;
  if (input.progression !== undefined) updatePayload.progression = input.progression;
  if (input.regression !== undefined) updatePayload.regression = input.regression;
  if (input.sets !== undefined) updatePayload.sets = input.sets;
  if (input.reps !== undefined) updatePayload.reps = input.reps;
  if (input.duration !== undefined) updatePayload.duration = input.duration;
  if (input.restSeconds !== undefined) updatePayload.restSeconds = input.restSeconds;
  if (input.notes !== undefined) updatePayload.notes = input.notes;
  if (input.videoUrl !== undefined) updatePayload.videoUrl = input.videoUrl;

  const updated = await db
    .update(exerciseTable)
    .set(updatePayload)
    .where(eq(exerciseTable.id, exerciseId))
    .returning();

  return updated[0] ?? null;
}

export async function deleteExercise(exerciseId: number) {
  const deleted = await db
    .delete(exerciseTable)
    .where(eq(exerciseTable.id, exerciseId))
    .returning();

  return deleted[0] ?? null;
}

export async function createSession(input: {
  programId: number;
  weekNumber: number;
  sessionNumber: number;
  type: string;
}) {
  const result = await db
    .insert(sessionTable)
    .values({
      programId: input.programId,
      weekNumber: input.weekNumber,
      sessionNumber: input.sessionNumber,
      type: input.type as any,
    })
    .returning();

  return result[0];
}

export async function addExerciseToSession(input: {
  sessionId: number;
  exerciseId: number;
  order: number;
  coachingNotes?: string | null;
  progressionNotes?: string | null;
  regressionNotes?: string | null;
}) {
  const result = await db
    .insert(sessionExerciseTable)
    .values({
      sessionId: input.sessionId,
      exerciseId: input.exerciseId,
      order: input.order,
      coachingNotes: input.coachingNotes ?? null,
      progressionNotes: input.progressionNotes ?? null,
      regressionNotes: input.regressionNotes ?? null,
    })
    .returning();

  return result[0];
}

export async function deleteSessionExercise(sessionExerciseId: number) {
  const result = await db
    .delete(sessionExerciseTable)
    .where(eq(sessionExerciseTable.id, sessionExerciseId))
    .returning();

  return result[0] ?? null;
}

export async function listBookingsAdmin(options?: { q?: string; limit?: number }) {
  const q = options?.q?.trim() ?? "";
  const requestedLimit = options?.limit;
  const limit =
    typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
      : 50;
  const filters = [];
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      or(
        ilike(serviceTypeTable.name, pattern),
        ilike(athleteTable.name, pattern),
        sql`${bookingTable.type}::text ILIKE ${pattern}`,
        sql`${bookingTable.status}::text ILIKE ${pattern}`,
        sql`${bookingTable.id}::text ILIKE ${pattern}`,
      ),
    );
  }

  const rows = await db
    .select({
      id: bookingTable.id,
      startsAt: bookingTable.startsAt,
      endTime: bookingTable.endTime,
      type: bookingTable.type,
      status: bookingTable.status,
      location: bookingTable.location,
      meetingLink: bookingTable.meetingLink,
      serviceName: serviceTypeTable.name,
      athleteName: athleteTable.name,
    })
    .from(bookingTable)
    .leftJoin(serviceTypeTable, eq(bookingTable.serviceTypeId, serviceTypeTable.id))
    .leftJoin(athleteTable, eq(bookingTable.athleteId, athleteTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(bookingTable.startsAt))
    .limit(limit);

  return rows;
}

export async function getBookingByIdAdmin(bookingId: number) {
  const [row] = await db
    .select({
      id: bookingTable.id,
      startsAt: bookingTable.startsAt,
      endTime: bookingTable.endTime,
      type: bookingTable.type,
      status: bookingTable.status,
      location: bookingTable.location,
      meetingLink: bookingTable.meetingLink,
      serviceTypeId: bookingTable.serviceTypeId,
      serviceName: serviceTypeTable.name,
      serviceCapacity: serviceTypeTable.capacity,
      athleteName: athleteTable.name,
      guardianName: userTable.name,
      guardianEmail: userTable.email,
      createdAt: bookingTable.createdAt,
    })
    .from(bookingTable)
    .leftJoin(serviceTypeTable, eq(bookingTable.serviceTypeId, serviceTypeTable.id))
    .leftJoin(athleteTable, eq(bookingTable.athleteId, athleteTable.id))
    .leftJoin(guardianTable, eq(bookingTable.guardianId, guardianTable.id))
    .leftJoin(userTable, eq(guardianTable.userId, userTable.id))
    .where(eq(bookingTable.id, bookingId))
    .limit(1);

  if (!row) return null;

  let slotsUsed = 0;
  if (row.serviceCapacity && row.serviceTypeId && row.startsAt) {
    const booked = await db
      .select({ id: bookingTable.id })
      .from(bookingTable)
      .where(
        and(
          eq(bookingTable.serviceTypeId, row.serviceTypeId),
          eq(bookingTable.startsAt, row.startsAt),
          inArray(bookingTable.status, ["pending", "confirmed"]),
        ),
      );
    slotsUsed = booked.length;
  }

  return {
    ...row,
    slotsUsed,
    slotsTotal: row.serviceCapacity ?? null,
  };
}

export async function updateBookingStatusAdmin(input: {
  bookingId: number;
  status: "pending" | "confirmed" | "declined" | "cancelled";
}) {
  const [existing] = await db
    .select({ status: bookingTable.status })
    .from(bookingTable)
    .where(eq(bookingTable.id, input.bookingId))
    .limit(1);

  const result = await db
    .update(bookingTable)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(bookingTable.id, input.bookingId))
    .returning();

  const updated = result[0] ?? null;
  if (!updated) return null;

  if (input.status === "confirmed" && existing?.status !== "confirmed") {
    const [detail] = await db
      .select({
        startsAt: bookingTable.startsAt,
        location: bookingTable.location,
        meetingLink: bookingTable.meetingLink,
        serviceName: serviceTypeTable.name,
        guardianUserId: guardianTable.userId,
        guardianEmail: userTable.email,
        guardianName: userTable.name,
      })
      .from(bookingTable)
      .leftJoin(serviceTypeTable, eq(bookingTable.serviceTypeId, serviceTypeTable.id))
      .leftJoin(guardianTable, eq(bookingTable.guardianId, guardianTable.id))
      .leftJoin(userTable, eq(guardianTable.userId, userTable.id))
      .where(eq(bookingTable.id, input.bookingId))
      .limit(1);

    if (detail?.guardianUserId) {
      await db.insert(notificationTable).values({
        userId: detail.guardianUserId,
        type: "booking_confirmed",
        content: `Booking confirmed for ${detail.serviceName ?? "session"} at ${detail.startsAt?.toISOString?.() ?? ""}`,
        link: "/schedule",
      });

      if (detail.guardianEmail) {
        try {
          await sendBookingApprovedEmail({
            to: detail.guardianEmail,
            name: detail.guardianName ?? "there",
            serviceName: detail.serviceName ?? "Session",
            startsAt: detail.startsAt ?? new Date(),
            location: detail.location ?? undefined,
            meetingLink: detail.meetingLink ?? undefined,
          });
        } catch (error) {
          console.error("Failed to send booking confirmation email", error);
        }
      }

      if (env.pushWebhookUrl) {
        try {
          await fetch(env.pushWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: detail.guardianUserId,
              title: "Booking confirmed",
              body: `${detail.serviceName ?? "Session"} confirmed`,
              link: "/schedule",
            }),
          });
        } catch (error) {
          console.error("Failed to send booking confirmation push", error);
        }
      }
    }
  }

  if (input.status === "declined" && existing?.status !== "declined") {
    const [detail] = await db
      .select({
        startsAt: bookingTable.startsAt,
        location: bookingTable.location,
        meetingLink: bookingTable.meetingLink,
        serviceName: serviceTypeTable.name,
        guardianUserId: guardianTable.userId,
        guardianEmail: userTable.email,
        guardianName: userTable.name,
      })
      .from(bookingTable)
      .leftJoin(serviceTypeTable, eq(bookingTable.serviceTypeId, serviceTypeTable.id))
      .leftJoin(guardianTable, eq(bookingTable.guardianId, guardianTable.id))
      .leftJoin(userTable, eq(guardianTable.userId, userTable.id))
      .where(eq(bookingTable.id, input.bookingId))
      .limit(1);

    if (detail?.guardianUserId) {
      await db.insert(notificationTable).values({
        userId: detail.guardianUserId,
        type: "booking_declined",
        content: `Booking declined for ${detail.serviceName ?? "session"} at ${detail.startsAt?.toISOString?.() ?? ""}`,
        link: "/schedule",
      });

      if (detail.guardianEmail) {
        try {
          await sendBookingDeclinedEmail({
            to: detail.guardianEmail,
            name: detail.guardianName ?? "there",
            serviceName: detail.serviceName ?? "Session",
            startsAt: detail.startsAt ?? new Date(),
            location: detail.location ?? undefined,
            meetingLink: detail.meetingLink ?? undefined,
          });
        } catch (error) {
          console.error("Failed to send booking decline email", error);
        }
      }

      if (env.pushWebhookUrl) {
        try {
          await fetch(env.pushWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: detail.guardianUserId,
              title: "Booking declined",
              body: `${detail.serviceName ?? "Session"} declined`,
              link: "/schedule",
            }),
          });
        } catch (error) {
          console.error("Failed to send booking declined push", error);
        }
      }
    }
  }

  return updated;
}

export async function listAvailabilityAdmin() {
  return db
    .select({
      id: availabilityBlockTable.id,
      startsAt: availabilityBlockTable.startsAt,
      endsAt: availabilityBlockTable.endsAt,
      createdAt: availabilityBlockTable.createdAt,
      serviceName: serviceTypeTable.name,
    })
    .from(availabilityBlockTable)
    .leftJoin(serviceTypeTable, eq(availabilityBlockTable.serviceTypeId, serviceTypeTable.id))
    .orderBy(desc(availabilityBlockTable.startsAt))
    .limit(20);
}

export async function listVideoUploadsAdmin(options?: { q?: string; limit?: number }) {
  const q = options?.q?.trim() ?? "";
  const requestedLimit = options?.limit;
  const limit =
    typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
      : 50;
  const filters = [];
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      or(
        ilike(athleteTable.name, pattern),
        ilike(videoUploadTable.notes, pattern),
        ilike(videoUploadTable.feedback, pattern),
        sql`${videoUploadTable.id}::text ILIKE ${pattern}`,
      ),
    );
  }

  return db
    .select({
      id: videoUploadTable.id,
      athleteId: videoUploadTable.athleteId,
      athleteUserId: athleteTable.userId,
      athleteName: athleteTable.name,
      videoUrl: videoUploadTable.videoUrl,
      notes: videoUploadTable.notes,
      feedback: videoUploadTable.feedback,
      reviewedAt: videoUploadTable.reviewedAt,
      createdAt: videoUploadTable.createdAt,
      programSectionContentId: videoUploadTable.programSectionContentId,
      programSectionTitle: programSectionContentTable.title,
      programSectionType: programSectionContentTable.sectionType,
    })
    .from(videoUploadTable)
    .leftJoin(athleteTable, eq(videoUploadTable.athleteId, athleteTable.id))
    .leftJoin(programSectionContentTable, eq(videoUploadTable.programSectionContentId, programSectionContentTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(videoUploadTable.createdAt))
    .limit(limit);
}

export async function listMessageThreadsAdmin(
  coachId: number,
  options?: { q?: string; limit?: number },
) {
  const q = options?.q?.trim().toLowerCase() ?? "";
  const requestedLimit = options?.limit;
  const limit =
    typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
      : 50;
  const adminIds = await getAdminCoachIds();
  if (!adminIds.length) return [];
  if (!adminIds.includes(coachId)) return [];
  const adminSet = new Set(adminIds);

  const athleteRows = await db
    .select({
      athleteUserId: athleteTable.userId,
      guardianUserId: guardianTable.userId,
    })
    .from(athleteTable)
    .leftJoin(guardianTable, eq(guardianTable.id, athleteTable.guardianId));

  const athleteToGuardian = new Map<number, number>();
  for (const row of athleteRows) {
    if (row.athleteUserId && row.guardianUserId) {
      athleteToGuardian.set(row.athleteUserId, row.guardianUserId);
    }
  }

  const rawThreadStats = await db
    .select({
      rawOtherId: sql<number>`CASE WHEN ${inArray(messageTable.senderId, adminIds)} THEN ${messageTable.receiverId} ELSE ${messageTable.senderId} END`,
      latestAt: sql<Date>`max(${messageTable.createdAt})`,
      unread: sql<number>`
        sum(
          CASE
            WHEN ${inArray(messageTable.senderId, adminIds)} THEN 0
            WHEN ${messageTable.read} = false THEN 1
            ELSE 0
          END
        )
      `,
    })
    .from(messageTable)
    .where(
      and(
        or(inArray(messageTable.senderId, adminIds), inArray(messageTable.receiverId, adminIds)),
        sql`NOT (${inArray(messageTable.senderId, adminIds)} AND ${inArray(messageTable.receiverId, adminIds)})`,
      ),
    )
    .groupBy(
      sql`CASE WHEN ${inArray(messageTable.senderId, adminIds)} THEN ${messageTable.receiverId} ELSE ${messageTable.senderId} END`,
    )
    .orderBy(desc(sql`max(${messageTable.createdAt})`))
    .limit(limit * 8);

  const rawOtherUserIds = rawThreadStats.map((row) => Number(row.rawOtherId)).filter((id) => Number.isFinite(id));
  if (!rawOtherUserIds.length) return [];

  const latestMessageCandidates = await db
    .select({
      senderId: messageTable.senderId,
      receiverId: messageTable.receiverId,
      content: messageTable.content,
      createdAt: messageTable.createdAt,
    })
    .from(messageTable)
    .where(
      or(
        and(inArray(messageTable.senderId, adminIds), inArray(messageTable.receiverId, rawOtherUserIds)),
        and(inArray(messageTable.senderId, rawOtherUserIds), inArray(messageTable.receiverId, adminIds)),
      ),
    )
    .orderBy(desc(messageTable.createdAt))
    .limit(Math.max(limit * 20, 200));

  const latestByRawUserId = new Map<number, { content: string; createdAt: Date | string }>();
  for (const row of latestMessageCandidates) {
    const rawOtherId = adminSet.has(row.senderId) ? row.receiverId : row.senderId;
    if (!latestByRawUserId.has(rawOtherId)) {
      latestByRawUserId.set(rawOtherId, {
        content: row.content,
        createdAt: row.createdAt,
      });
    }
  }

  const threads = new Map<number, { latestAt: Date | string; preview: string; unread: number }>();
  for (const stat of rawThreadStats) {
    const rawOtherId = Number(stat.rawOtherId);
    if (!Number.isFinite(rawOtherId)) continue;
    const otherId = athleteToGuardian.get(rawOtherId) ?? rawOtherId;
    const latest = latestByRawUserId.get(rawOtherId);
    const preview = latest?.content ?? "Start the conversation";
    const latestAt = latest?.createdAt ?? stat.latestAt;
    const unread = Number(stat.unread ?? 0);
    const current = threads.get(otherId);
    if (!current) {
      threads.set(otherId, { latestAt, preview, unread });
      continue;
    }
    current.unread += unread;
    if (new Date(latestAt).getTime() > new Date(current.latestAt).getTime()) {
      current.latestAt = latestAt;
      current.preview = preview;
    }
  }

  const userIds = Array.from(threads.keys()).sort((a, b) => {
    const timeA = new Date(threads.get(a)!.latestAt).getTime();
    const timeB = new Date(threads.get(b)!.latestAt).getTime();
    return timeB - timeA;
  });
  
  const users = userIds.length
    ? await db.select().from(userTable).where(inArray(userTable.id, userIds))
    : [];

  const guardianNameByAthleteUserId = new Map<number, string>();
  if (userIds.length) {
    const athleteRows = await db
      .select({
        athleteUserId: athleteTable.userId,
        guardianId: athleteTable.guardianId,
      })
      .from(athleteTable)
      .where(inArray(athleteTable.userId, userIds));

    const guardianIds = Array.from(new Set(athleteRows.map((row) => row.guardianId).filter((id): id is number => id != null)));
    if (guardianIds.length) {
      const guardianRows = await db
        .select({
          guardianId: guardianTable.id,
          guardianUserId: guardianTable.userId,
          guardianName: userTable.name,
          guardianEmail: userTable.email,
        })
        .from(guardianTable)
        .leftJoin(userTable, eq(guardianTable.userId, userTable.id))
        .where(inArray(guardianTable.id, guardianIds));

      const guardianNameById = new Map<number, string>();
      for (const row of guardianRows) {
        guardianNameById.set(
          row.guardianId,
          row.guardianName ?? row.guardianEmail ?? "Guardian"
        );
      }

      for (const row of athleteRows) {
        if (!row.guardianId) continue;
        const guardianName = guardianNameById.get(row.guardianId);
        if (guardianName) {
          guardianNameByAthleteUserId.set(row.athleteUserId, guardianName);
        }
      }
    }
  }

  const tierMap = new Map<number, string | null>();
  if (userIds.length) {
    const athleteRows = await db
      .select({
        userId: userTable.id,
        programTier: sql`${athleteTable.currentProgramTier}::text`.as("programTier"),
      })
      .from(userTable)
      .leftJoin(athleteTable, eq(athleteTable.userId, userTable.id))
      .where(inArray(userTable.id, userIds));

    const guardianRows = await db
      .select({
        userId: userTable.id,
        guardianTier: sql`${athleteTable.currentProgramTier}::text`.as("guardianTier"),
      })
      .from(userTable)
      .leftJoin(guardianTable, eq(guardianTable.userId, userTable.id))
      .leftJoin(athleteTable, eq(athleteTable.guardianId, guardianTable.id))
      .where(inArray(userTable.id, userIds));

    for (const row of guardianRows) {
      if (row.guardianTier) {
        tierMap.set(row.userId, row.guardianTier as string);
      }
    }
    for (const row of athleteRows) {
      if (row.programTier) {
        tierMap.set(row.userId, row.programTier as string);
      }
    }
  }

  const mapped = userIds.map((id) => {
    const info = threads.get(id)!;
    const user = users.find((u) => u.id === id);
    const guardianName = guardianNameByAthleteUserId.get(id);
    const programTier = tierMap.get(id) ?? null;
    return {
      userId: id,
      name: guardianName ?? user?.name ?? user?.email ?? "Unknown",
      preview: info.preview,
      time: info.latestAt,
      unread: info.unread,
      programTier,
      premium: programTier === "PHP_Premium",
    };
  });

  const filtered = q
    ? mapped.filter((item) =>
        [item.name, item.preview, item.programTier, item.userId]
          .map((value) => String(value ?? "").toLowerCase())
          .some((value) => value.includes(q)),
      )
    : mapped;
  return filtered.slice(0, limit);
}

export async function listThreadMessagesAdmin(coachId: number, userId: number) {
  const adminIds = await getAdminCoachIds();
  if (!adminIds.length) return [];
  if (!adminIds.includes(coachId)) return [];
  const [guardian] = await db
    .select({ id: guardianTable.id })
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  let otherUserIds: number[] = [userId];
  if (guardian?.id) {
    const athleteRows = await db
      .select({ userId: athleteTable.userId })
      .from(athleteTable)
      .where(eq(athleteTable.guardianId, guardian.id));
    const athleteUserIds = athleteRows.map((row) => row.userId);
    otherUserIds = Array.from(new Set([userId, ...athleteUserIds]));
  }

  const messages = await db
    .select()
    .from(messageTable)
    .where(
      or(
        and(inArray(messageTable.senderId, adminIds), inArray(messageTable.receiverId, otherUserIds)),
        and(inArray(messageTable.senderId, otherUserIds), inArray(messageTable.receiverId, adminIds))
      )
    )
    .orderBy(messageTable.createdAt);
  return attachDirectMessageReactions(messages);
}

export async function deleteThreadMessagesAdmin(coachId: number, userId: number) {
  const adminIds = await getAdminCoachIds();
  if (!adminIds.length) return 0;
  if (!adminIds.includes(coachId)) return 0;

  const [guardian] = await db
    .select({ id: guardianTable.id })
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  let otherUserIds: number[] = [userId];
  if (guardian?.id) {
    const athleteRows = await db
      .select({ userId: athleteTable.userId })
      .from(athleteTable)
      .where(eq(athleteTable.guardianId, guardian.id));
    const athleteUserIds = athleteRows.map((row) => row.userId);
    otherUserIds = Array.from(new Set([userId, ...athleteUserIds]));
  }

  const result = await db
    .delete(messageTable)
    .where(
      or(
        and(inArray(messageTable.senderId, adminIds), inArray(messageTable.receiverId, otherUserIds)),
        and(inArray(messageTable.senderId, otherUserIds), inArray(messageTable.receiverId, adminIds))
      )
    );
  return result.rowCount ?? 0;
}

const resolveGuardianThreadUsers = async (userId: number) => {
  const [guardian] = await db
    .select({ id: guardianTable.id })
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  if (!guardian?.id) {
    return [userId];
  }

  const athleteRows = await db
    .select({ userId: athleteTable.userId })
    .from(athleteTable)
    .where(eq(athleteTable.guardianId, guardian.id));
  const athleteUserIds = athleteRows.map((row) => row.userId);
  return Array.from(new Set([userId, ...athleteUserIds]));
};

export async function markThreadReadAdmin(coachId: number, userId: number) {
  const adminIds = await getAdminCoachIds();
  if (!adminIds.length) return 0;
  if (!adminIds.includes(coachId)) return 0;

  const otherUserIds = await resolveGuardianThreadUsers(userId);
  const result = await db
    .update(messageTable)
    .set({ read: true })
    .where(
      and(inArray(messageTable.receiverId, adminIds), inArray(messageTable.senderId, otherUserIds), eq(messageTable.read, false))
    );

  return result.rowCount ?? 0;
}

export async function sendMessageAdmin(input: {
  coachId: number;
  userId: number;
  content: string;
  contentType?: "text" | "image" | "video";
  mediaUrl?: string;
  videoUploadId?: number;
  replyToMessageId?: number;
  replyPreview?: string;
}) {
  return sendMessage({
    senderId: input.coachId,
    receiverId: input.userId,
    content: input.content,
    contentType: input.contentType ?? "text",
    mediaUrl: input.mediaUrl,
    videoUploadId: input.videoUploadId,
    replyToMessageId: input.replyToMessageId,
    replyPreview: input.replyPreview,
  });
}

export async function getDashboardMetrics(coachId: number) {
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);

  const startWeek = new Date(now);
  startWeek.setDate(startWeek.getDate() - 6);
  startWeek.setHours(0, 0, 0, 0);

  const startMonth = new Date(now);
  startMonth.setDate(startMonth.getDate() - 29);
  startMonth.setHours(0, 0, 0, 0);

  const [athleteCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(athleteTable);
  const totalAthletes = Number(athleteCountRow?.count ?? 0);

  const [premiumCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(athleteTable)
    .where(eq(athleteTable.currentProgramTier, "PHP_Premium"));
  const premiumClients = Number(premiumCountRow?.count ?? 0);

  const [unreadCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messageTable)
    .where(and(eq(messageTable.receiverId, coachId), eq(messageTable.read, false)));
  const unreadMessages = Number(unreadCountRow?.count ?? 0);

  const [bookingsTodayRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookingTable)
    .where(and(gte(bookingTable.startsAt, startToday), lte(bookingTable.startsAt, endToday)));
  const bookingsToday = Number(bookingsTodayRow?.count ?? 0);

  const bookingsTodayList = await db
    .select({
      id: bookingTable.id,
      startsAt: bookingTable.startsAt,
      type: bookingTable.type,
      serviceName: serviceTypeTable.name,
      athleteName: athleteTable.name,
    })
    .from(bookingTable)
    .leftJoin(serviceTypeTable, eq(bookingTable.serviceTypeId, serviceTypeTable.id))
    .leftJoin(athleteTable, eq(bookingTable.athleteId, athleteTable.id))
    .where(and(gte(bookingTable.startsAt, startToday), lte(bookingTable.startsAt, endToday)))
    .orderBy(bookingTable.startsAt);

  const unreadMessagesList = await db
    .select({
      id: messageTable.id,
      createdAt: messageTable.createdAt,
      senderName: userTable.name,
      content: messageTable.content,
    })
    .from(messageTable)
    .leftJoin(userTable, eq(messageTable.senderId, userTable.id))
    .where(and(eq(messageTable.receiverId, coachId), eq(messageTable.read, false)))
    .orderBy(desc(messageTable.createdAt))
    .limit(2);

  const pendingOnboardings = await db
    .select({
      id: athleteTable.id,
      name: athleteTable.name,
      createdAt: athleteTable.createdAt,
    })
    .from(athleteTable)
    .where(eq(athleteTable.onboardingCompleted, false))
    .orderBy(desc(athleteTable.createdAt))
    .limit(2);

  const pendingVideos = await db
    .select({
      id: videoUploadTable.id,
      athleteName: athleteTable.name,
      createdAt: videoUploadTable.createdAt,
      notes: videoUploadTable.notes,
    })
    .from(videoUploadTable)
    .leftJoin(athleteTable, eq(videoUploadTable.athleteId, athleteTable.id))
    .where(sql`${videoUploadTable.reviewedAt} is null`)
    .orderBy(desc(videoUploadTable.createdAt))
    .limit(2);

  const priorityQueue = [
    ...pendingVideos.map((item) => ({
      title: "Video Review",
      detail: `${item.athleteName ?? "Athlete"} • ${item.notes ?? "Feedback pending"}`,
      status: "Priority Feedback",
    })),
    ...pendingOnboardings.map((item) => ({
      title: "Onboarding Review",
      detail: `${item.name ?? "Athlete"} • Application submitted`,
      status: "Assign Program",
    })),
    ...unreadMessagesList.map((item) => ({
      title: "Priority Message",
      detail: `${item.senderName ?? "Athlete"} • ${item.content.slice(0, 32)}`,
      status: "Reply Needed",
    })),
  ].slice(0, 6);

  const topByBookings = await db
    .select({
      athleteId: bookingTable.athleteId,
      count: sql<number>`count(*)`,
    })
    .from(bookingTable)
    .where(gte(bookingTable.startsAt, startMonth))
    .groupBy(bookingTable.athleteId)
    .orderBy(desc(sql`count(*)`))
    .limit(50);

  const topAthleteIds = topByBookings.map((row) => row.athleteId);
  const topAthletesRaw = topAthleteIds.length
    ? await db.select().from(athleteTable).where(inArray(athleteTable.id, topAthleteIds))
    : await db.select().from(athleteTable).orderBy(desc(athleteTable.createdAt)).limit(50);

  const topAthletes = topAthleteIds.length
    ? topByBookings.map((row) => {
        const athlete = topAthletesRaw.find((item) => item.id === row.athleteId);
        return {
          name: athlete?.name ?? "Athlete",
          team: athlete?.team ?? null,
          tier: athlete?.currentProgramTier ?? "PHP",
          score: `${row.count} sessions last 30d`,
        };
      })
    : topAthletesRaw.map((athlete) => ({
        name: athlete.name,
        team: athlete.team ?? null,
        tier: athlete.currentProgramTier ?? "PHP",
        score: "New athlete",
      }));

  const tierRows = await db
    .select({
      tier: athleteTable.currentProgramTier,
      count: sql<number>`count(*)`,
    })
    .from(athleteTable)
    .groupBy(athleteTable.currentProgramTier);

  const tierCounts = { PHP: 0, PHP_Premium: 0, PHP_Premium_Plus: 0, PHP_Pro: 0 };
  for (const row of tierRows) {
    const key = row.tier ?? "PHP";
    tierCounts[key as keyof typeof tierCounts] += Number(row.count ?? 0);
  }

  const messagesWeek = await db
    .select({
      createdAt: messageTable.createdAt,
      senderId: messageTable.senderId,
    })
    .from(messageTable)
    .where(gte(messageTable.createdAt, startWeek));

  const bookingsWeek = await db
    .select({ startsAt: bookingTable.startsAt })
    .from(bookingTable)
    .where(gte(bookingTable.startsAt, startWeek));

  const uploadsWeek = await db
    .select({ createdAt: videoUploadTable.createdAt })
    .from(videoUploadTable)
    .where(gte(videoUploadTable.createdAt, startWeek));

  const availabilityWeek = await db
    .select({ createdAt: availabilityBlockTable.createdAt })
    .from(availabilityBlockTable)
    .where(gte(availabilityBlockTable.createdAt, startWeek));

  const contentWeek = await db
    .select({ createdAt: contentTable.createdAt })
    .from(contentTable)
    .where(gte(contentTable.createdAt, startWeek));

  const referralsWeek = await db
    .select({ createdAt: physioRefferalsTable.createdAt })
    .from(physioRefferalsTable)
    .where(gte(physioRefferalsTable.createdAt, startWeek));

  const onboardingsWeek = await db
    .select({ completedAt: athleteTable.onboardingCompletedAt })
    .from(athleteTable)
    .where(gte(athleteTable.onboardingCompletedAt, startWeek));

  const dayKeys = Array.from({ length: 7 }).map((_, idx) => {
    const day = new Date(startWeek);
    day.setDate(startWeek.getDate() + idx);
    return day.toISOString().slice(0, 10);
  });

  const bucket = (value?: Date | null) => (value ? value.toISOString().slice(0, 10) : null);
  const sumByDay = (values: (Date | null | undefined)[]) => {
    const counts = dayKeys.reduce<Record<string, number>>((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});
    for (const value of values) {
      const key = bucket(value);
      if (key && key in counts) counts[key] += 1;
    }
    return dayKeys.map((key) => counts[key]);
  };

  const messageCounts = sumByDay(messagesWeek.map((item) => item.createdAt));
  const bookingCounts = sumByDay(bookingsWeek.map((item) => item.startsAt));
  const uploadCounts = sumByDay(uploadsWeek.map((item) => item.createdAt));
  const availabilityCounts = sumByDay(availabilityWeek.map((item) => item.createdAt));

  const weeklyTotals = {
    messages: messageCounts.reduce((sum, value) => sum + value, 0),
    bookings: bookingCounts.reduce((sum, value) => sum + value, 0),
    uploads: uploadCounts.reduce((sum, value) => sum + value, 0),
  };

  const messageCoachCount = messagesWeek.filter((msg) => msg.senderId === coachId).length;
  const messagingResponseRate = weeklyTotals.messages
    ? Math.min(100, Math.round((messageCoachCount / weeklyTotals.messages) * 100))
    : 0;
  const trainingLoad = totalAthletes
    ? Math.min(100, Math.round((weeklyTotals.bookings / totalAthletes) * 100))
    : 0;
  const availabilityTotal = availabilityCounts.reduce((sum, value) => sum + value, 0);
  const bookingsUtilization = availabilityTotal
    ? Math.min(100, Math.round((weeklyTotals.bookings / availabilityTotal) * 100))
    : 0;

  const weeklyProgress = dayKeys.map((_, index) => {
    return messageCounts[index] + bookingCounts[index] + uploadCounts[index];
  });

  const labels = dayKeys.map((key) => {
    const date = new Date(key);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  });

  const programOps = [
    {
      title: "Program Templates",
      detail: `${(await db.select({ count: sql<number>`count(*)` }).from(programTable))[0]?.count ?? 0} total templates`,
    },
    {
      title: "Premium Plan Drafts",
      detail: `${premiumClients} premium athletes assigned`,
    },
    {
      title: "Exercise Library",
      detail: `${(await db.select({ count: sql<number>`count(*)` }).from(exerciseTable))[0]?.count ?? 0} exercises in library`,
    },
  ];

  const highlights = [
    {
      label: "New Onboardings",
      value: onboardingsWeek.length,
      detail: `${pendingOnboardings.length} pending review`,
    },
    {
      label: "Videos Uploaded",
      value: uploadsWeek.length,
      detail: `${pendingVideos.length} pending feedback`,
    },
    {
      label: "Content Updates",
      value: contentWeek.length,
      detail: `${contentWeek.length} published this week`,
    },
    {
      label: "Referrals",
      value: referralsWeek.length,
      detail: `${referralsWeek.length} issued this week`,
    },
  ];

  return {
    kpis: {
      totalAthletes,
      premiumClients,
      unreadMessages,
      bookingsToday,
    },
    bookingsToday: bookingsTodayList,
    priorityQueue,
    topAthletes,
    tierDistribution: {
      program: tierCounts.PHP,
      premium: tierCounts.PHP_Premium,
      premiumPlus: tierCounts.PHP_Premium_Plus,
      pro: tierCounts.PHP_Pro,
      total: tierCounts.PHP + tierCounts.PHP_Premium + tierCounts.PHP_Premium_Plus + tierCounts.PHP_Pro,
    },
    weeklyVolume: {
      totals: weeklyTotals,
      bars: weeklyProgress,
      labels,
    },
    weeklyProgress: {
      series: weeklyProgress,
      labels,
    },
    trends: {
      trainingLoad,
      messagingResponseRate,
      bookingsUtilization,
      trainingSeries: bookingCounts,
      messagingSeries: messageCounts,
      bookingSeries: bookingCounts,
    },
    highlights,
    programOps,
    priorityMessageCount: unreadMessages,
  };
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

async function deleteCognitoUserByEmail(email: string) {
  if (!env.cognitoUserPoolId) return;
  try {
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: env.cognitoUserPoolId,
        Username: email,
      })
    );
  } catch (error: any) {
    if (error?.name !== "UserNotFoundException") {
      console.warn("[admin] Cognito delete during rollback failed", error);
    }
  }
}

export type CreateGuardianWithOnboardingAdminInput = {
  email: string;
  guardianDisplayName: string;
  athleteName: string;
  birthDate: string;
  team: string;
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

/**
 * Creates a guardian login (Cognito or local auth), completes onboarding as that user, and emails a temporary password.
 */
export async function createGuardianWithOnboardingAdmin(input: CreateGuardianWithOnboardingAdminInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await getUserByEmail(email);
  if (existing) {
    throw { status: 409, message: "An account with this email already exists." };
  }

  const tempPassword = resolveProvisionPassword(input.initialPassword);
  let userId: number | null = null;
  const createdEmail = email;
  let cognitoProvisioned = false;

  try {
    if (env.authMode === "local") {
      const { hash, salt } = hashLocalProvisionPassword(tempPassword);
      const inserted = await db
        .insert(userTable)
        .values({
          cognitoSub: `local:${uuidv4()}`,
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
    } else {
      if (!env.cognitoUserPoolId) {
        throw { status: 500, message: "Authentication is not configured for provisioning." };
      }
      try {
        await cognitoClient.send(
          new AdminCreateUserCommand({
            UserPoolId: env.cognitoUserPoolId,
            Username: email,
            UserAttributes: [
              { Name: "email", Value: email },
              { Name: "email_verified", Value: "true" },
              { Name: "name", Value: input.guardianDisplayName.trim() },
            ],
            TemporaryPassword: tempPassword,
            MessageAction: "SUPPRESS",
          })
        );
      } catch (error: any) {
        if (error?.name === "UsernameExistsException") {
          throw { status: 409, message: "An account with this email already exists in Cognito." };
        }
        if (error?.name === "InvalidPasswordException") {
          throw {
            status: 400,
            message: "Temporary password did not meet your Cognito password policy. Try again or contact support.",
          };
        }
        throw error;
      }
      cognitoProvisioned = true;

      const cognitoUser = await cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: env.cognitoUserPoolId,
          Username: email,
        })
      );
      const sub = cognitoUser.UserAttributes?.find((attr) => attr.Name === "sub")?.Value;
      if (!sub) {
        await deleteCognitoUserByEmail(createdEmail);
        throw new Error("Missing Cognito sub after user creation");
      }

      const cognitoRow = await createUserFromCognito({
        sub,
        email,
        name: input.guardianDisplayName.trim(),
        role: "guardian",
      });
      userId = cognitoRow.id;
      await db
        .update(userTable)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(userTable.id, userId));
    }

    const onboardingResult = await submitOnboarding({
      userId: userId!,
      athleteName: input.athleteName.trim(),
      birthDate: input.birthDate,
      team: input.team.trim(),
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
    if (env.authMode !== "local" && cognitoProvisioned) {
      await deleteCognitoUserByEmail(createdEmail);
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
  const resolvedTeam = input.team?.trim() || "Adult";
  const planExpiresAt = computePlanExpiryFromCommitment(input.planCommitmentMonths);

  const tempPassword = resolveProvisionPassword(input.initialPassword);
  let userId: number | null = null;
  const createdEmail = email;
  let cognitoProvisioned = false;

  try {
    if (env.authMode === "local") {
      const { hash, salt } = hashLocalProvisionPassword(tempPassword);
      const inserted = await db
        .insert(userTable)
        .values({
          cognitoSub: `local:${uuidv4()}`,
          name: athleteName,
          email,
          role: "athlete",
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
    } else {
      if (!env.cognitoUserPoolId) {
        throw { status: 500, message: "Authentication is not configured for provisioning." };
      }
      try {
        await cognitoClient.send(
          new AdminCreateUserCommand({
            UserPoolId: env.cognitoUserPoolId,
            Username: email,
            UserAttributes: [
              { Name: "email", Value: email },
              { Name: "email_verified", Value: "true" },
              { Name: "name", Value: athleteName },
            ],
            TemporaryPassword: tempPassword,
            MessageAction: "SUPPRESS",
          })
        );
      } catch (error: any) {
        if (error?.name === "UsernameExistsException") {
          throw { status: 409, message: "An account with this email already exists in Cognito." };
        }
        if (error?.name === "InvalidPasswordException") {
          throw {
            status: 400,
            message: "Temporary password did not meet your Cognito password policy. Try again or contact support.",
          };
        }
        throw error;
      }
      cognitoProvisioned = true;

      const cognitoUser = await cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: env.cognitoUserPoolId,
          Username: email,
        })
      );
      const sub = cognitoUser.UserAttributes?.find((attr) => attr.Name === "sub")?.Value;
      if (!sub) {
        await deleteCognitoUserByEmail(createdEmail);
        throw new Error("Missing Cognito sub after user creation");
      }

      const cognitoRow = await createUserFromCognito({
        sub,
        email,
        name: athleteName,
        role: "athlete",
      });
      userId = cognitoRow.id;
      await db
        .update(userTable)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(userTable.id, userId));
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
    if (env.authMode !== "local" && cognitoProvisioned) {
      await deleteCognitoUserByEmail(createdEmail);
    }
    throw error;
  }
}
