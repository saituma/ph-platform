import { and, desc, eq, sql, count, countDistinct, or } from "drizzle-orm";

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
  athleteTrainingSessionCompletionTable,
  trainingModuleSessionTable,
} from "../db/schema";
import { slugifySegment } from "../lib/slug";
import { getUserById } from "./user.service";
import { calculateAge, clampYouthAge, isBirthday, normalizeDate, parseISODate } from "../lib/age";
import { getGuardianAndAthlete, listGuardianAthletes, setActiveAthleteForGuardian } from "./user.service";
import { sendPushNotification } from "./push.service";
import { getActiveSubscriptionPlanByTier, isSubscriptionPlanFree } from "./billing.service";
import { normalizeStoredMediaUrl } from "./s3.service";
import { isAthleteUserRole, resolveAthleteUserRoleFromAthleteRow } from "../lib/user-roles";

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
  requiredDocuments: [{ id: "consent", label: "Guardian Consent Form", required: true }],
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
  const normalized = input.map((tab) => String(tab)).filter((tab) => PHP_PLUS_TABS.has(tab));
  return normalized;
};

export async function startYouthOnboarding(input: {
  userId: number;
  guardianName: string;
  athleteName: string;
  birthDate: string;
}) {
  // Update guardian (user) name
  await db
    .update(userTable)
    .set({
      name: input.guardianName,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, input.userId));

  // Get or create guardian record
  let guardianId: number;
  const guardians = await db.select().from(guardianTable).where(eq(guardianTable.userId, input.userId)).limit(1);

  if (guardians[0]) {
    guardianId = guardians[0].id;
  } else {
    const [user] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, input.userId))
      .limit(1);

    const [newGuardian] = await db
      .insert(guardianTable)
      .values({
        userId: input.userId,
        email: user?.email ?? "",
        relationToAthlete: "Parent",
      })
      .returning();
    guardianId = newGuardian.id;
  }

  const parsedBirthDate = parseISODate(input.birthDate);
  if (!parsedBirthDate) {
    throw new Error("Invalid birth date format.");
  }
  const age = calculateAge(parsedBirthDate, new Date());

  // Create or update athlete record
  const athletes = await db.select().from(athleteTable).where(eq(athleteTable.guardianId, guardianId)).limit(1);

  if (athletes[0]) {
    await db
      .update(athleteTable)
      .set({
        name: input.athleteName,
        birthDate: input.birthDate,
        age: age,
        athleteType: "youth",
        updatedAt: new Date(),
      })
      .where(eq(athleteTable.id, athletes[0].id));
  } else {
    await db.insert(athleteTable).values({
      guardianId: guardianId,
      userId: 3, // Placeholder Admin
      name: input.athleteName,
      birthDate: input.birthDate,
      age: age,
      athleteType: "youth",
      team: "",
      trainingPerWeek: 0,
    });
  }

  return { ok: true };
}

export async function startAdultOnboarding(input: { userId: number; name: string; birthDate: string }) {
  // Update user name
  await db
    .update(userTable)
    .set({
      name: input.name,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, input.userId));

  // Create or update athlete record
  const athletes = await db.select().from(athleteTable).where(eq(athleteTable.userId, input.userId)).limit(1);

  const parsedBirthDate = parseISODate(input.birthDate);
  if (!parsedBirthDate) {
    throw new Error("Invalid birth date format.");
  }
  const age = calculateAge(parsedBirthDate, new Date());

  if (athletes[0]) {
    await db
      .update(athleteTable)
      .set({
        name: input.name,
        birthDate: input.birthDate,
        age: age,
        athleteType: "adult",
        updatedAt: new Date(),
      })
      .where(eq(athleteTable.id, athletes[0].id));
  } else {
    await db.insert(athleteTable).values({
      userId: input.userId,
      guardianId: null,
      name: input.name,
      birthDate: input.birthDate,
      age: age,
      athleteType: "adult",
      team: "",
      trainingPerWeek: 0,
    });
  }

  return { ok: true };
}

export async function startTeamOnboarding(input: {
  userId: number;
  name: string;
  athleteType?: "youth" | "adult";
  minAge?: number | null;
  maxAge?: number | null;
  maxAthletes: number;
}) {
  const athleteType = input.athleteType ?? "youth";

  // Get or create team record.
  //
  // Select only what we need (id) to avoid failing when the database is behind on
  // newer optional columns added to `teams` via migrations.
  const teams = await db
    .select({ id: teamTable.id, emailSlug: teamTable.emailSlug })
    .from(teamTable)
    .where(eq(teamTable.adminId, input.userId))
    .limit(1);

  if (teams[0]) {
    const slugDefault = `${slugifySegment(input.name)}-${teams[0].id}`;
    await db
      .update(teamTable)
      .set({
        name: input.name,
        athleteType,
        minAge: input.minAge ?? null,
        maxAge: input.maxAge ?? null,
        maxAthletes: input.maxAthletes,
        emailSlug: teams[0].emailSlug ?? slugDefault,
        updatedAt: new Date(),
      })
      .where(eq(teamTable.id, teams[0].id));
  } else {
    const inserted = await db
      .insert(teamTable)
      .values({
        name: input.name,
        athleteType,
        adminId: input.userId,
        minAge: input.minAge ?? null,
        maxAge: input.maxAge ?? null,
        maxAthletes: input.maxAthletes,
      })
      .returning({ id: teamTable.id });
    const newId = inserted[0]?.id;
    if (newId) {
      const slugDefault = `${slugifySegment(input.name)}-${newId}`;
      await db
        .update(teamTable)
        .set({ emailSlug: slugDefault, updatedAt: new Date() })
        .where(eq(teamTable.id, newId));
    }
    return { ok: true, teamId: newId ?? null };
  }

  return { ok: true, teamId: teams[0].id };
}

export async function startPerformanceOnboarding(input: {
  userId: number;
  trainingPerWeek: number;
  performanceGoals: string;
  equipmentAccess: string;
}) {
  // Find the athlete record for this user (or guardian's active athlete)
  const user = await db.select().from(userTable).where(eq(userTable.id, input.userId)).limit(1);

  if (!user[0]) {
    throw new Error("User not found.");
  }

  let athleteId: number | null = null;

  if (user[0].role === "guardian") {
    const guardian = await db.select().from(guardianTable).where(eq(guardianTable.userId, input.userId)).limit(1);

    if (guardian[0]) {
      const athlete = await db.select().from(athleteTable).where(eq(athleteTable.guardianId, guardian[0].id)).limit(1);
      athleteId = athlete[0]?.id ?? null;
    }
  } else {
    const athlete = await db.select().from(athleteTable).where(eq(athleteTable.userId, input.userId)).limit(1);
    athleteId = athlete[0]?.id ?? null;
  }

  if (!athleteId) {
    throw new Error("Athlete profile not found. Please complete basic information first.");
  }

  await db
    .update(athleteTable)
    .set({
      trainingPerWeek: input.trainingPerWeek,
      performanceGoals: input.performanceGoals,
      equipmentAccess: input.equipmentAccess,
      updatedAt: new Date(),
    })
    .where(eq(athleteTable.id, athleteId));

  return { ok: true };
}

export async function saveOnboardingGoals(input: {
  userId: number;
  trainingPerWeek: number;
  performanceGoals: string;
  injuries?: any;
  equipmentAccess?: string;
  growthNotes?: string;
  phone: string;
}) {
  const user = await db.select().from(userTable).where(eq(userTable.id, input.userId)).limit(1);

  if (!user[0]) throw new Error("User not found");

  // Update phone on user table
  // Since userTable doesn't have phone, we'll check if guardian exists
  const guardian = await db.select().from(guardianTable).where(eq(guardianTable.userId, input.userId)).limit(1);

  if (guardian[0]) {
    await db
      .update(guardianTable)
      .set({
        phoneNumber: input.phone,
        updatedAt: new Date(),
      })
      .where(eq(guardianTable.id, guardian[0].id));
	} else if (isAthleteUserRole(user[0].role)) {
    // For adult athletes, we can store phone in extraResponses or similar if no column exists
    // Actually, let's check if we can add it to user table if needed, but for now we'll use extraResponses on athleteTable
  }

  let athleteId: number | null = null;

	if (isAthleteUserRole(user[0].role)) {
		const athlete = await db.select().from(athleteTable).where(eq(athleteTable.userId, input.userId)).limit(1);
    athleteId = athlete[0]?.id ?? null;
  } else {
    // For guardians/coaches, update their active/primary athlete
    if (guardian[0]) {
      const athlete = await db.select().from(athleteTable).where(eq(athleteTable.guardianId, guardian[0].id)).limit(1);
      athleteId = athlete[0]?.id ?? null;
    }
  }

  if (!athleteId) throw new Error("Athlete profile not found. Please complete basic info first.");

  await db
    .update(athleteTable)
    .set({
      trainingPerWeek: input.trainingPerWeek,
      performanceGoals: input.performanceGoals,
      injuries: input.injuries ?? null,
      equipmentAccess: input.equipmentAccess ?? null,
      growthNotes: input.growthNotes ?? null,
      extraResponses:
        isAthleteUserRole(user[0].role)
          ? sql`COALESCE(${athleteTable.extraResponses}, '{}'::jsonb) || ${JSON.stringify({ phone: input.phone })}::jsonb`
          : undefined,
      updatedAt: new Date(),
    })
    .where(eq(athleteTable.id, athleteId));

  return { ok: true };
}

export async function getOnboardingByUser(userId: number) {
  const user = await getUserById(userId);
  if (!user) return null;

	if (isAthleteUserRole(user.role)) {
		const athletes = await db
      .select()
      .from(athleteTable)
      .where(eq(athleteTable.userId, userId))
      .orderBy(desc(athleteTable.createdAt))
      .limit(1);
    const athlete = athletes[0] ?? null;
    if (!athlete) return null;

    // Get training stats for single athlete
    const stats = await db
      .select({
        finishedSessions: count(athleteTrainingSessionCompletionTable.id),
        finishedModules: countDistinct(trainingModuleSessionTable.moduleId),
      })
      .from(athleteTrainingSessionCompletionTable)
      .leftJoin(
        trainingModuleSessionTable,
        eq(athleteTrainingSessionCompletionTable.sessionId, trainingModuleSessionTable.id),
      )
      .where(eq(athleteTrainingSessionCompletionTable.athleteId, athlete.id));

    const decorated = decorateAthlete(athlete);
    if (decorated) {
      (decorated as any).trainingStats = stats[0] || { finishedSessions: 0, finishedModules: 0 };
      (decorated as any).planPaymentType = athlete.planPaymentType;
      (decorated as any).planCreatedAt = athlete.createdAt;
    }

    try {
      await maybeSendBirthdayNotifications(decorated);
    } catch (error) {
      console.warn("[Onboarding] Failed birthday notification side effect for athlete onboarding status", error);
    }
    return decorated;
  }

  const guardians = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  const guardian = guardians[0];

  const athletesRows = await db
    .select({
      athlete: athleteTable,
      guardianName: userTable.name,
      guardianPhone: guardianTable.phoneNumber,
      planPaymentType: athleteTable.planPaymentType,
      planCreatedAt: athleteTable.createdAt,
    })
    .from(athleteTable)
    .leftJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .leftJoin(userTable, eq(guardianTable.userId, userTable.id))
    .where(
      guardian
        ? or(eq(athleteTable.guardianId, guardian.id), eq(athleteTable.userId, userId))
        : eq(athleteTable.userId, userId),
    )
    .orderBy(
      guardian?.activeAthleteId
        ? sql`CASE WHEN ${athleteTable.id} = ${guardian.activeAthleteId} THEN 0 ELSE 1 END`
        : desc(athleteTable.createdAt),
    );

  if (athletesRows.length === 0) return null;

  const decoratedAthletes = await Promise.all(
    athletesRows.map(async (row) => {
      let ensured = row.athlete;
      try {
        ensured = await ensureAthleteUserRecord(row.athlete);
      } catch (error) {
        console.warn("[Onboarding] Failed to ensure athlete user record during status lookup", error);
      }

      // Get training stats for each athlete
      const stats = await db
        .select({
          finishedSessions: count(athleteTrainingSessionCompletionTable.id),
          finishedModules: countDistinct(trainingModuleSessionTable.moduleId),
        })
        .from(athleteTrainingSessionCompletionTable)
        .leftJoin(
          trainingModuleSessionTable,
          eq(athleteTrainingSessionCompletionTable.sessionId, trainingModuleSessionTable.id),
        )
        .where(eq(athleteTrainingSessionCompletionTable.athleteId, ensured.id));

      const decorated = decorateAthlete(ensured);
      if (decorated) {
        (decorated as any).guardianName = row.guardianName;
        (decorated as any).phoneNumber = row.guardianPhone;
        (decorated as any).planPaymentType = row.planPaymentType;
        (decorated as any).planCreatedAt = row.planCreatedAt;
        (decorated as any).trainingStats = stats[0] || { finishedSessions: 0, finishedModules: 0 };
      }
      return decorated;
    }),
  );

  try {
    const primary = decoratedAthletes[0];
    if (primary) {
      await maybeSendBirthdayNotifications(primary);
    }
  } catch (error) {
    console.warn("[Onboarding] Failed birthday notification side effect for guardian onboarding status", error);
  }

  // Return the first athlete as primary for backward compatibility, but include allAthletes.
  // Surface the guardian's own tier so auth can prefer it over the managed athlete's tier.
  return {
    ...decoratedAthletes[0],
    guardianProgramTier: guardian?.currentProgramTier ?? null,
    allAthletes: decoratedAthletes,
  };
}

export async function ensureAthleteUserRecord(athlete: typeof athleteTable.$inferSelect) {
  const existing = await db.select().from(userTable).where(eq(userTable.id, athlete.userId)).limit(1);
  if (existing[0] && isAthleteUserRole(existing[0].role)) return athlete;

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
            role: resolveAthleteUserRoleFromAthleteRow({
              teamId: athlete.teamId,
              athleteType: athlete.athleteType,
            }),
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
  const desiredTier = input.desiredProgramType ?? ("PHP" as (typeof ProgramType.enumValues)[number]);
  const starterPlan = await getActiveSubscriptionPlanByTier(desiredTier);
  const shouldAutoAssignStarterTier =
    desiredTier === "PHP" && Boolean(starterPlan) && isSubscriptionPlanFree(starterPlan);

  let guardianId: number;
  const guardians = await db.select().from(guardianTable).where(eq(guardianTable.userId, input.userId)).limit(1);
  const guardian = guardians[0] ?? null;
  const shouldCreateNew = Boolean(input.createNew);
  const existingAthlete =
    guardian && !shouldCreateNew
      ? (input.athleteId
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
              .limit(1))[0]
      : null;

  let athleteRow: typeof athleteTable.$inferSelect | null = null;

  if (existingAthlete) {
    if (!existingAthlete.guardianId) {
      throw new Error("Youth onboarding requires a guardian.");
    }
    guardianId = existingAthlete.guardianId;
    await db
      .update(guardianTable)
      .set({
        email: input.parentEmail,
        phoneNumber: input.parentPhone ?? null,
        relationToAthlete: input.relationToAthlete ?? null,
      })
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
        .set({
          email: input.parentEmail,
          phoneNumber: input.parentPhone ?? null,
          relationToAthlete: input.relationToAthlete ?? null,
        })
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

export async function updateAthleteProfilePicture(input: { userId: number; profilePicture: string | null }) {
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
    }),
  );
  const decorated = ensured.map((athlete) => decorateAthlete(athlete)).filter(Boolean) as typeof ensured;
  await Promise.all(
    decorated.map(async (athlete) => {
      try {
        await maybeSendBirthdayNotifications(athlete);
      } catch (error) {
        console.warn("[Onboarding] Failed birthday notification side effect while listing guardian athletes", error);
      }
    }),
  );
  return { guardian, athletes: decorated };
}

export async function setActiveGuardianAthlete(input: { userId: number; athleteId: number }) {
  return setActiveAthleteForGuardian(input);
}

export async function getGuardianAthleteProfileFields(input: { userId: number; athleteId: number }) {
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

export async function getGuardianAthleteOnboardingData(input: { userId: number; athleteId: number }) {
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
      guardianName: userTable.name,
    })
    .from(athleteTable)
    .leftJoin(teamTable, eq(athleteTable.teamId, teamTable.id))
    .leftJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .leftJoin(userTable, eq(guardianTable.userId, userTable.id))
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
    guardianName: athlete.guardianName,
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

async function maybeSendBirthdayNotifications(
  athlete: (typeof athleteTable.$inferSelect & { isBirthday?: boolean }) | null,
) {
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
            sql`DATE(${notificationTable.createdAt}) = CURRENT_DATE`,
          ),
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
    }),
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
    {
      id: "athleteType",
      label: "Athlete type",
      type: "dropdown",
      required: true,
      visible: true,
      options: ["youth", "adult"],
    },
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
