import { and, eq } from "drizzle-orm";

import { db } from "../db";
import {
  athleteTable,
  enrollmentTable,
  guardianTable,
  legalAcceptanceTable,
  onboardingConfigTable,
  ProgramType,
  userTable,
} from "../db/schema";
import { sql } from "drizzle-orm";
import { getUserById } from "./user.service";
import { calculateAge, isBirthday, normalizeDate, parseISODate } from "../lib/age";
import { getGuardianAndAthlete, listGuardianAthletes, setActiveAthleteForGuardian } from "./user.service";

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
    {
      id: "relationToAthlete",
      label: "Relation to Athlete",
      type: "dropdown",
      required: true,
      visible: true,
      options: ["Parent", "Guardian", "Coach"],
    },
    {
      id: "desiredProgramType",
      label: "Program Tier Selection",
      type: "dropdown",
      required: true,
      visible: true,
      options: ["PHP", "PHP_Plus", "PHP_Premium"],
    },
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
    const athletes = await db.select().from(athleteTable).where(eq(athleteTable.userId, userId)).limit(1);
    const athlete = athletes[0] ?? null;
    return decorateAthlete(athlete);
  }
  const guardians = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  const guardian = guardians[0];
  if (!guardian) return null;
  const athletes = await db.select().from(athleteTable).where(eq(athleteTable.guardianId, guardian.id)).limit(1);
  const athlete = athletes[0] ?? null;
  if (!athlete) return null;
  const ensured = await ensureAthleteUserRecord(athlete);
  return decorateAthlete(ensured);
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
  desiredProgramType: (typeof ProgramType.enumValues)[number];
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
        currentProgramTier: input.desiredProgramType === "PHP" ? "PHP" : null,
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

  const status = input.desiredProgramType === "PHP" ? "active" : "pending";

  const existingEnrollment = await db
    .select()
    .from(enrollmentTable)
    .where(and(eq(enrollmentTable.athleteId, athleteId), eq(enrollmentTable.programType, input.desiredProgramType)))
    .limit(1);

  if (!existingEnrollment[0]) {
    await db.insert(enrollmentTable).values({
      athleteId,
      programType: input.desiredProgramType,
      status,
      assignedByCoach: input.desiredProgramType === "PHP" ? input.userId : null,
    });
  }

  return { athleteId, athleteUserId: updatedAthlete.userId, status };
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
  const ensured = await Promise.all(athletes.map((athlete) => ensureAthleteUserRecord(athlete)));
  const decorated = ensured.map((athlete) => decorateAthlete(athlete)).filter(Boolean) as typeof ensured;
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

function normalizeConfigFields(fields: any[] | null | undefined) {
  if (!Array.isArray(fields)) return [];
  const hasBirthDate = fields.some((field) => field?.id === "birthDate");
  return fields.map((field) => {
    if (field?.id === "age" && !hasBirthDate) {
      return { ...field, id: "birthDate", label: field.label || "Birth Date", type: "date" };
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
