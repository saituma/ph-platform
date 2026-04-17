import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../db";
import {
  AthleteType,
  athleteTable,
  enrollmentTable,
  guardianTable,
  legalAcceptanceTable,
  notificationTable,
  onboardingConfigTable,
  ProgramType,
  userTable,
  teamTable,
} from "../db/schema";
import { getUserById } from "./user.service";
import { calculateAge, clampYouthAge, isBirthday, normalizeDate, parseISODate } from "../lib/age";
import { getGuardianAndAthlete, listGuardianAthletes, setActiveAthleteForGuardian } from "./user.service";
import { sendPushNotification } from "./push.service";
import { getActiveSubscriptionPlanByTier, isSubscriptionPlanFree } from "./billing.service";
import { normalizeStoredMediaUrl } from "./s3.service";

const defaultPublicConfig = {
  version: 1,
  fields: [
    { id: "athleteName", label: "Athlete Name", type: "text", required: true, visible: true },
    {
      id: "athleteType",
      label: "Athlete type",
      type: "dropdown",
      required: true,
      visible: true,
      options: ["youth", "adult"],
    },
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
  const athletes = guardian.activeAthleteId
    ? await db
        .select()
        .from(athleteTable)
        .where(eq(athleteTable.guardianId, guardian.id))
        .orderBy(
          sql`CASE WHEN ${athleteTable.id} = ${guardian.activeAthleteId} THEN 0 ELSE 1 END`,
          desc(athleteTable.createdAt),
        )
        .limit(1)
    : await db
        .select()
        .from(athleteTable)
        .where(eq(athleteTable.guardianId, guardian.id))
        .orderBy(desc(athleteTable.createdAt))
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
            profilePicture: athlete.profilePicture ?? null,
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
  athleteType?: (typeof AthleteType.enumValues)[number];
  team?: string | null;
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
  const computedAge = parsedBirthDate ? calculateAge(parsedBirthDate, now) : null;
  const baseAge = computedAge ?? input.age ?? null;
  const inferredAthleteType: (typeof AthleteType.enumValues)[number] =
    input.athleteType ?? ((baseAge ?? 0) >= 18 ? "adult" : "youth");
  const resolvedAge = clampYouthAge(baseAge, inferredAthleteType);
  if (!resolvedAge) {
    throw new Error("Birth date is required.");
  }
  if (inferredAthleteType === "adult" && resolvedAge < 18) {
    throw new Error("Adult athletes must be 18 or older.");
  }
  if (inferredAthleteType === "youth" && resolvedAge >= 18) {
    throw new Error("Youth athletes must be under 18.");
  }
  const birthDateValue = input.birthDate ?? null;
  const resolvedTeam = input.team?.trim() || "";
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
        athleteType: inferredAthleteType,
        name: input.athleteName,
        age: resolvedAge,
        birthDate: birthDateValue,
        team: resolvedTeam,
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
        athleteType: inferredAthleteType,
        name: input.athleteName,
        age: resolvedAge,
        birthDate: birthDateValue,
        team: resolvedTeam,
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
  let ensured = athlete;
  try {
    ensured = await ensureAthleteUserRecord(athlete);
  } catch (error) {
    console.warn("[Onboarding] Failed to ensure athlete user record during profile picture update", error);
  }
  const [updated] = await db
    .update(athleteTable)
    .set({
      profilePicture: input.profilePicture,
      updatedAt: new Date(),
    })
    .where(eq(athleteTable.id, ensured.id))
    .returning();

  if (ensured.userId) {
    await db
      .update(userTable)
      .set({ profilePicture: input.profilePicture, updatedAt: new Date() })
      .where(eq(userTable.id, ensured.userId));
  }
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

export async function getGuardianAthleteProfileFields(input: {
  userId: number;
  athleteId: number;
}) {
  const { guardian } = await getGuardianAndAthlete(input.userId);
  if (!guardian) return null;

  const [athlete] = await db
    .select({ extraResponses: athleteTable.extraResponses })
    .from(athleteTable)
    .where(and(eq(athleteTable.guardianId, guardian.id), eq(athleteTable.id, input.athleteId)))
    .limit(1);

  if (!athlete) return null;
  const extra = athlete.extraResponses;
  const extraObj = typeof extra === "object" && extra !== null ? (extra as Record<string, unknown>) : {};

  const normalizeField = (value: unknown) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return null;
  };

  return {
    height: normalizeField(extraObj.height),
    weight: normalizeField(extraObj.weight),
    position: normalizeField(extraObj.position),
  };
}

export async function updateGuardianAthleteProfileFields(input: {
  userId: number;
  athleteId: number;
  height?: string | null;
  weight?: string | null;
  position?: string | null;
}) {
  const { guardian } = await getGuardianAndAthlete(input.userId);
  if (!guardian) return null;

  const [existing] = await db
    .select({ extraResponses: athleteTable.extraResponses })
    .from(athleteTable)
    .where(and(eq(athleteTable.guardianId, guardian.id), eq(athleteTable.id, input.athleteId)))
    .limit(1);

  if (!existing) return null;
  const currentExtra =
    typeof existing.extraResponses === "object" && existing.extraResponses !== null
      ? (existing.extraResponses as Record<string, unknown>)
      : {};

  const nextExtra: Record<string, unknown> = {
    ...currentExtra,
    ...(input.height !== undefined ? { height: input.height } : {}),
    ...(input.weight !== undefined ? { weight: input.weight } : {}),
    ...(input.position !== undefined ? { position: input.position } : {}),
  };

  const [updated] = await db
    .update(athleteTable)
    .set({ extraResponses: nextExtra, updatedAt: new Date() })
    .where(and(eq(athleteTable.guardianId, guardian.id), eq(athleteTable.id, input.athleteId)))
    .returning({ id: athleteTable.id });

  return updated ?? null;
}

export async function getGuardianAthleteOnboardingData(input: {
  userId: number;
  athleteId: number;
}) {
  const { guardian } = await getGuardianAndAthlete(input.userId);
  if (!guardian) return null;

  const [athlete] = await db
    .select({
      id: athleteTable.id,
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
      extraResponses: athleteTable.extraResponses,
    })
    .from(athleteTable)
    .leftJoin(teamTable, eq(athleteTable.teamId, teamTable.id))
    .where(and(eq(athleteTable.guardianId, guardian.id), eq(athleteTable.id, input.athleteId)))
    .limit(1);

  if (!athlete) return null;
  const extra = athlete.extraResponses;
  const extraObj = typeof extra === "object" && extra !== null ? (extra as Record<string, unknown>) : {};

  const birthDateValue = athlete.birthDate as unknown;
  const birthDate =
    typeof birthDateValue === "string"
      ? birthDateValue
      : birthDateValue instanceof Date
        ? `${birthDateValue.getFullYear()}-${String(birthDateValue.getMonth() + 1).padStart(2, "0")}-${String(
            birthDateValue.getDate(),
          ).padStart(2, "0")}`
        : null;

  return {
    id: athlete.id,
    athleteType: athlete.athleteType,
    name: athlete.name,
    age: athlete.age,
    birthDate,
    team: athlete.team,
    trainingPerWeek: athlete.trainingPerWeek,
    injuries: athlete.injuries ?? null,
    growthNotes: athlete.growthNotes ?? null,
    performanceGoals: athlete.performanceGoals ?? null,
    equipmentAccess: athlete.equipmentAccess ?? null,
    extraResponses: extraObj,
  };
}

export async function updateGuardianAthleteOnboardingData(input: {
  userId: number;
  athleteId: number;
  name?: string;
  birthDate?: string;
  team?: string | null;
  trainingPerWeek?: number;
  injuries?: unknown;
  growthNotes?: string | null;
  performanceGoals?: string | null;
  equipmentAccess?: string | null;
  extraResponses?: Record<string, unknown>;
  height?: string | null;
  weight?: string | null;
  position?: string | null;
}) {
  const { guardian } = await getGuardianAndAthlete(input.userId);
  if (!guardian) return null;

  const [existing] = await db
    .select({
      athleteType: athleteTable.athleteType,
      extraResponses: athleteTable.extraResponses,
      birthDate: athleteTable.birthDate,
      age: athleteTable.age,
    })
    .from(athleteTable)
    .where(and(eq(athleteTable.guardianId, guardian.id), eq(athleteTable.id, input.athleteId)))
    .limit(1);

  if (!existing) return null;
  const currentExtra =
    typeof existing.extraResponses === "object" && existing.extraResponses !== null
      ? (existing.extraResponses as Record<string, unknown>)
      : {};

  const patchExtra: Record<string, unknown> = {
    ...(input.extraResponses ?? {}),
    ...(input.height !== undefined ? { height: input.height } : {}),
    ...(input.weight !== undefined ? { weight: input.weight } : {}),
    ...(input.position !== undefined ? { position: input.position } : {}),
  };

  const nextExtra = Object.keys(patchExtra).length ? { ...currentExtra, ...patchExtra } : currentExtra;

  const updatePayload: Partial<typeof athleteTable.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.team !== undefined ? { team: (input.team ?? "").trim() } : {}),
    ...(input.trainingPerWeek !== undefined ? { trainingPerWeek: input.trainingPerWeek } : {}),
    ...(input.injuries !== undefined ? { injuries: input.injuries ?? null } : {}),
    ...(input.growthNotes !== undefined ? { growthNotes: input.growthNotes } : {}),
    ...(input.performanceGoals !== undefined ? { performanceGoals: input.performanceGoals } : {}),
    ...(input.equipmentAccess !== undefined ? { equipmentAccess: input.equipmentAccess } : {}),
    ...(nextExtra !== currentExtra ? { extraResponses: nextExtra } : {}),
  };

  if (input.birthDate !== undefined) {
    const parsedBirthDate = parseISODate(input.birthDate);
    if (!parsedBirthDate) {
      throw new Error("Birth date must be in YYYY-MM-DD format.");
    }
    const computedAge = calculateAge(parsedBirthDate, new Date());
    const resolvedAge = clampYouthAge(computedAge, existing.athleteType) ?? computedAge;
    if (!resolvedAge) {
      throw new Error("Birth date is invalid.");
    }

    (updatePayload as any).birthDate = input.birthDate;
    (updatePayload as any).age = resolvedAge;
  }

  const [updated] = await db
    .update(athleteTable)
    .set(updatePayload)
    .where(and(eq(athleteTable.guardianId, guardian.id), eq(athleteTable.id, input.athleteId)))
    .returning({ id: athleteTable.id });

  return updated ?? null;
}

function decorateAthlete(athlete: typeof athleteTable.$inferSelect | null) {
  if (!athlete) return null;
  const birthDate = normalizeDate(athlete.birthDate as any);
  if (!birthDate) {
    return { ...athlete, profilePicture: normalizeStoredMediaUrl(athlete.profilePicture ?? null), isBirthday: false };
  }
  const now = new Date();
  return {
    ...athlete,
    profilePicture: normalizeStoredMediaUrl(athlete.profilePicture ?? null),
    age: clampYouthAge(calculateAge(birthDate, now), athlete.athleteType) ?? athlete.age,
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
  const normalized = fields
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
  const hasAthleteType = normalized.some((field) => field?.id === "athleteType");
  if (hasAthleteType) return normalized;
  return [
    { id: "athleteType", label: "Athlete type", type: "dropdown", required: true, visible: true, options: ["youth", "adult"] },
    ...normalized,
  ];
}

export async function getPublicOnboardingConfig() {
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
