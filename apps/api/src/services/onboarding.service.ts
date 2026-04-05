import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../db";
import {
  athleteTable,
  enrollmentTable,
  guardianTable,
  legalAcceptanceTable,
  notificationTable,
  onboardingConfigTable,
  ProgramType,
  userTable,
} from "../db/schema";
import { getUserById } from "./user.service";
import { calculateAge, isBirthday, normalizeDate, parseISODate } from "../lib/age";
import { getGuardianAndAthlete, listGuardianAthletes, setActiveAthleteForGuardian } from "./user.service";
import { sendPushNotification } from "./push.service";
import { getActiveSubscriptionPlanByTier, isSubscriptionPlanFree } from "./billing.service";

const defaultPublicConfig = {
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
  /** DB default only; not exposed on public onboarding config API. */
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
  termsVersion: "1.0",
  privacyVersion: "1.0",
};

const PHP_PLUS_TABS = new Set(defaultPublicConfig.phpPlusProgramTabs);

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
      "updatedAt" timestamp DEFAULT now() NOT NULL,
      "termsVersion" varchar(50) DEFAULT '1.0' NOT NULL,
      "privacyVersion" varchar(50) DEFAULT '1.0' NOT NULL
    )
  `);
  await db.execute(sql`
    ALTER TABLE "onboarding_configs" ADD COLUMN IF NOT EXISTS "phpPlusProgramTabs" jsonb,
    ADD COLUMN IF NOT EXISTS "termsVersion" varchar(50) DEFAULT '1.0' NOT NULL,
    ADD COLUMN IF NOT EXISTS "privacyVersion" varchar(50) DEFAULT '1.0' NOT NULL
  `);
  await db.execute(sql`
    ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "extraResponses" jsonb
  `);
  await db.execute(sql`
    ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "birthDate" date
  `);
}

export async function getOnboardingByUser(userId: number) {
  const user = await getUserById(userId);
  if (!user) return null;
  if (user.role === "athlete") {
    const athletes = await db
      .select()
      .from(athleteTable)
      .where(eq(athleteTable.userId, userId))
      .orderBy(desc(athleteTable.createdAt))
      .limit(1);
    const athlete = athletes[0] ?? null;
    const decorated = decorateAthlete(athlete);
    try {
      await maybeSendBirthdayNotifications(decorated);
    } catch (error) {
      console.warn("[Onboarding] Failed birthday notification side effect for athlete onboarding status", error);
    }
    return decorated;
  }
  const guardians = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  const guardian = guardians[0];
  if (!guardian) return null;
  const athletes = await db
    .select()
    .from(athleteTable)
    .where(eq(athleteTable.guardianId, guardian.id))
    .orderBy(
      sql`CASE WHEN ${guardian.activeAthleteId} IS NOT NULL AND ${athleteTable.id} = ${guardian.activeAthleteId} THEN 0 ELSE 1 END`,
      desc(athleteTable.createdAt),
    )
    .limit(1);
  const athlete = athletes[0] ?? null;
  if (!athlete) return null;
  let ensured = athlete;
  try {
    ensured = await ensureAthleteUserRecord(athlete);
  } catch (error) {
    console.warn("[Onboarding] Failed to ensure athlete user record during status lookup", error);
  }
  const decorated = decorateAthlete(ensured);
  try {
    await maybeSendBirthdayNotifications(decorated);
  } catch (error) {
    console.warn("[Onboarding] Failed birthday notification side effect for guardian onboarding status", error);
  }
  return decorated;
}

export async function ensureAthleteUserRecord(athlete: typeof athleteTable.$inferSelect) {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'role' AND e.enumlabel = 'athlete'
      ) THEN
        ALTER TYPE "role" ADD VALUE 'athlete';
      END IF;
    END $$;
  `);
  const existing = await db.select().from(userTable).where(eq(userTable.id, athlete.userId)).limit(1);
  if (existing[0]?.role === "athlete") return athlete;

  const slug = athlete.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const cognitoSub = `local:athlete:${athlete.id}`;
  const email = `${slug || "athlete"}-${athlete.id}@athlete.local`;

  const already = await db.select().from(userTable).where(eq(userTable.cognitoSub, cognitoSub)).limit(1);
  const athleteUser = already[0]
    ? already[0]
    : (
        await db
          .insert(userTable)
          .values({
            cognitoSub,
            name: athlete.name,
            email,
            role: "athlete",
            emailVerified: true,
          })
          .returning()
      )[0];

  await db
    .update(athleteTable)
    .set({ userId: athleteUser.id, updatedAt: new Date() })
    .where(eq(athleteTable.id, athlete.id));

  return { ...athlete, userId: athleteUser.id };
}

export async function submitOnboarding(input: {
  userId: number;
  athleteName: string;
  birthDate?: string | null;
  age?: number | null;
  team: string;
  trainingPerWeek: number;
  injuries?: unknown;
  growthNotes?: string | null;
  performanceGoals?: string | null;
  equipmentAccess?: string | null;
  parentEmail: string;
  parentPhone?: string | null;
  relationToAthlete?: string | null;
  desiredProgramType?: (typeof ProgramType.enumValues)[number];
  termsVersion: string;
  privacyVersion: string;
  appVersion: string;
  extraResponses?: Record<string, unknown>;
  createNew?: boolean;
  athleteId?: number | null;
}) {
  const now = new Date();
  const parsedBirthDate = input.birthDate ? parseISODate(input.birthDate) : null;
  const derivedAge = parsedBirthDate ? calculateAge(parsedBirthDate, now) : null;
  const resolvedAge = derivedAge ?? input.age ?? null;
  if (!resolvedAge || resolvedAge < 5) {
    throw new Error("Birth date must result in an age of 5 or older.");
  }
  const birthDateValue = input.birthDate ?? null;
  const desiredTier =
    input.desiredProgramType ??
    ("PHP" as (typeof ProgramType.enumValues)[number]);
  const starterPlan = await getActiveSubscriptionPlanByTier(desiredTier);
  const shouldAutoAssignStarterTier =
    desiredTier === "PHP" && Boolean(starterPlan) && isSubscriptionPlanFree(starterPlan);

  let guardianId: number;
  const guardians = await db.select().from(guardianTable).where(eq(guardianTable.userId, input.userId)).limit(1);
  const guardian = guardians[0] ?? null;
  const shouldCreateNew = Boolean(input.createNew);
  const existingAthlete = guardian && !shouldCreateNew
    ? (
        input.athleteId
          ? await db
              .select()
              .from(athleteTable)
              .where(and(eq(athleteTable.guardianId, guardian.id), eq(athleteTable.id, input.athleteId)))
              .limit(1)
          : await db
              .select()
              .from(athleteTable)
              .where(eq(athleteTable.guardianId, guardian.id))
              .orderBy(athleteTable.createdAt)
              .limit(1)
      )[0]
    : null;

  let athleteRow: typeof athleteTable.$inferSelect | null = null;

  if (existingAthlete) {
    if (!existingAthlete.guardianId) {
      throw new Error("Youth onboarding requires a guardian.");
    }
    guardianId = existingAthlete.guardianId;
    await db
      .update(guardianTable)
      .set({ email: input.parentEmail, phoneNumber: input.parentPhone ?? null, relationToAthlete: input.relationToAthlete ?? null })
      .where(eq(guardianTable.id, guardianId));
    const updated = await db
      .update(athleteTable)
      .set({
        name: input.athleteName,
        age: resolvedAge,
        birthDate: birthDateValue,
        team: input.team,
        trainingPerWeek: input.trainingPerWeek,
        injuries: input.injuries ?? null,
        growthNotes: input.growthNotes ?? null,
        performanceGoals: input.performanceGoals ?? null,
        equipmentAccess: input.equipmentAccess ?? null,
        extraResponses: input.extraResponses ?? null,
        onboardingCompleted: true,
        onboardingCompletedAt: now,
      })
      .where(eq(athleteTable.id, existingAthlete.id))
      .returning();
    athleteRow = updated[0] ?? existingAthlete;
  } else {
    if (guardian) {
      guardianId = guardian.id;
      await db
        .update(guardianTable)
        .set({ email: input.parentEmail, phoneNumber: input.parentPhone ?? null, relationToAthlete: input.relationToAthlete ?? null })
        .where(eq(guardianTable.id, guardianId));
    } else {
      const guardianResult = (await db
        .insert(guardianTable)
        .values({
          userId: input.userId,
          email: input.parentEmail,
          phoneNumber: input.parentPhone ?? null,
          relationToAthlete: input.relationToAthlete ?? null,
        })
        .returning()) as (typeof guardianTable.$inferSelect)[];
      const guardianRow = guardianResult[0];
      if (!guardianRow) {
        throw new Error("Guardian record not created.");
      }
      guardianId = guardianRow.id;
    }

    const inserted = (await db
      .insert(athleteTable)
      .values({
        userId: input.userId,
        guardianId,
        name: input.athleteName,
        age: resolvedAge,
        birthDate: birthDateValue,
        team: input.team,
        trainingPerWeek: input.trainingPerWeek,
        injuries: input.injuries ?? null,
        growthNotes: input.growthNotes ?? null,
        performanceGoals: input.performanceGoals ?? null,
        equipmentAccess: input.equipmentAccess ?? null,
        extraResponses: input.extraResponses ?? null,
        onboardingCompleted: true,
        onboardingCompletedAt: now,
        currentProgramTier: shouldAutoAssignStarterTier ? "PHP" : null,
      })
      .returning()) as (typeof athleteTable.$inferSelect)[];
    athleteRow = inserted[0] ?? null;
  }

  if (!athleteRow) {
    throw new Error("Athlete record not found.");
  }
  await db
    .update(guardianTable)
    .set({ activeAthleteId: athleteRow.id, updatedAt: new Date() })
    .where(eq(guardianTable.id, guardianId));

  const updatedAthlete = await ensureAthleteUserRecord(athleteRow);
  const athleteId = updatedAthlete.id;

  await db.insert(legalAcceptanceTable).values({
    athleteId,
    termsAcceptedAt: now,
    termsVersion: input.termsVersion,
    privacyAcceptedAt: now,
    privacyVersion: input.privacyVersion,
    appVersion: input.appVersion,
  });

  let responseStatus: string = "completed";
  if (desiredTier) {
    const enrollmentStatus =
      desiredTier === "PHP" && shouldAutoAssignStarterTier ? "active" : desiredTier === "PHP" ? "active" : "pending";
    responseStatus = enrollmentStatus;

    const existingEnrollment = await db
      .select()
      .from(enrollmentTable)
      .where(and(eq(enrollmentTable.athleteId, athleteId), eq(enrollmentTable.programType, desiredTier)))
      .limit(1);

    if (!existingEnrollment[0]) {
      await db.insert(enrollmentTable).values({
        athleteId,
        programType: desiredTier,
        status: enrollmentStatus,
        assignedByCoach: desiredTier === "PHP" ? input.userId : null,
      });
    }
  }

  return { athleteId, athleteUserId: updatedAthlete.userId, status: responseStatus };
}

export async function updateAthleteProfilePicture(input: {
  userId: number;
  profilePicture: string | null;
}) {
  const { athlete } = await getGuardianAndAthlete(input.userId);
  if (!athlete) return null;
  const [updated] = await db
    .update(athleteTable)
    .set({
      profilePicture: input.profilePicture,
      updatedAt: new Date(),
    })
    .where(eq(athleteTable.id, athlete.id))
    .returning();
  return updated ?? null;
}

export async function listGuardianAthletesWithUsers(userId: number) {
  const { guardian, athletes } = await listGuardianAthletes(userId);
  if (!guardian) {
    return { guardian: null, athletes: [] as (typeof athleteTable.$inferSelect)[] };
  }
  const ensured = await Promise.all(
    athletes.map(async (athlete) => {
      try {
        return await ensureAthleteUserRecord(athlete);
      } catch (error) {
        console.warn("[Onboarding] Failed to ensure athlete user record while listing guardian athletes", error);
        return athlete;
      }
    })
  );
  const decorated = ensured.map((athlete) => decorateAthlete(athlete)).filter(Boolean) as typeof ensured;
  await Promise.all(
    decorated.map(async (athlete) => {
      try {
        await maybeSendBirthdayNotifications(athlete);
      } catch (error) {
        console.warn("[Onboarding] Failed birthday notification side effect while listing guardian athletes", error);
      }
    })
  );
  return { guardian, athletes: decorated };
}

export async function setActiveGuardianAthlete(input: { userId: number; athleteId: number }) {
  return setActiveAthleteForGuardian(input);
}

function decorateAthlete(athlete: typeof athleteTable.$inferSelect | null) {
  if (!athlete) return null;
  const birthDate = normalizeDate(athlete.birthDate as any);
  if (!birthDate) {
    return { ...athlete, isBirthday: false };
  }
  const now = new Date();
  return {
    ...athlete,
    age: calculateAge(birthDate, now),
    isBirthday: isBirthday(birthDate, now),
  };
}

async function maybeSendBirthdayNotifications(athlete: (typeof athleteTable.$inferSelect & { isBirthday?: boolean }) | null) {
  if (!athlete?.isBirthday) return;

  const recipientIds = new Set<number>();
  if (athlete.userId) {
    recipientIds.add(athlete.userId);
  }

  if (athlete.guardianId) {
    const [guardian] = await db
      .select({ userId: guardianTable.userId })
      .from(guardianTable)
      .where(eq(guardianTable.id, athlete.guardianId))
      .limit(1);
    if (guardian?.userId) {
      recipientIds.add(guardian.userId);
    }
  }

  if (!recipientIds.size) return;

  const athleteName = athlete.name?.trim() || "your athlete";
  const birthdayLink = `/?birthdayAthleteId=${athlete.id}`;
  await Promise.all(
    [...recipientIds].map(async (userId) => {
      const alreadySentToday = await db
        .select({ id: notificationTable.id })
        .from(notificationTable)
        .where(
          and(
            eq(notificationTable.userId, userId),
            eq(notificationTable.type, "birthday"),
            eq(notificationTable.link, birthdayLink),
            sql`DATE(${notificationTable.createdAt}) = CURRENT_DATE`
          )
        )
        .limit(1);

      if (alreadySentToday[0]) return;

      const title = `Happy Birthday${athlete.name ? `, ${athlete.name}` : ""}!`;
      const content =
        userId === athlete.userId
          ? "A new year of training starts today. Your age-based content is ready."
          : `${athleteName} has a birthday today. Their age-based training content is ready.`;

      await db.insert(notificationTable).values({
        userId,
        type: "birthday",
        content,
        link: birthdayLink,
        read: false,
      });

      await sendPushNotification(userId, title, content, {
        type: "birthday",
        url: birthdayLink,
        athleteId: athlete.id,
      });
    })
  );
}

const LEGACY_ONBOARDING_FIELD_IDS = new Set(["relationToAthlete", "desiredProgramType"]);

function normalizeConfigFields(fields: any[] | null | undefined) {
  if (!Array.isArray(fields)) return [];
  const hasBirthDate = fields.some((field) => field?.id === "birthDate");
  return fields
    .filter((field) => field?.id && !LEGACY_ONBOARDING_FIELD_IDS.has(String(field.id)))
    .map((field) => {
      if (field?.id === "age" && !hasBirthDate) {
        return { ...field, id: "birthDate", label: field.label || "Birth Date", type: "date" };
      }
      if (field?.id === "growthNotes") {
        return { ...field, required: false };
      }
      return field;
    });
}

export async function getPublicOnboardingConfig() {
  try {
    const configs = await db.select().from(onboardingConfigTable).limit(1);
    if (configs[0]) {
      const config = configs[0];
      const normalizedTabs = normalizePhpPlusTabs(config.phpPlusProgramTabs);
      return {
        ...config,
        fields: normalizeConfigFields(config.fields as any),
        phpPlusProgramTabs: normalizedTabs ?? defaultPublicConfig.phpPlusProgramTabs,
      };
    }
  } catch {
    await ensureOnboardingConfigTable();
  }

  const created = await db
    .insert(onboardingConfigTable)
    .values({
      version: defaultPublicConfig.version,
      fields: normalizeConfigFields(defaultPublicConfig.fields as any),
      requiredDocuments: defaultPublicConfig.requiredDocuments,
      welcomeMessage: defaultPublicConfig.welcomeMessage,
      coachMessage: defaultPublicConfig.coachMessage,
      defaultProgramTier: defaultPublicConfig.defaultProgramTier,
      approvalWorkflow: defaultPublicConfig.approvalWorkflow,
      notes: defaultPublicConfig.notes,
      phpPlusProgramTabs: defaultPublicConfig.phpPlusProgramTabs,
      termsVersion: defaultPublicConfig.termsVersion,
      privacyVersion: defaultPublicConfig.privacyVersion,
    } as any)
    .returning();

  return created[0];
}

export async function getPhpPlusProgramTabs() {
  const config = await getPublicOnboardingConfig();
  const tabs = Array.isArray(config?.phpPlusProgramTabs)
    ? config.phpPlusProgramTabs
    : defaultPublicConfig.phpPlusProgramTabs;
  return tabs;
}
