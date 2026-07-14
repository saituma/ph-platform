import { and, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";

import { db } from "../../db";
import {
  athleteAchievementUnlockTable,
  athleteTable,
  athleteTrainingSessionCompletionTable,
  bookingTable,
  enrollmentTable,
  foodDiaryTable,
  guardianTable,
  legalAcceptanceTable,
  nutritionLogsTable,
  nutritionOnboardingProfileTable,
  nutritionTargetsTable,
  physioRefferalsTable,
  programAssignmentTable,
  programSectionCompletionTable,
  programSectionContentTable,
  programSessionCompletionTable,
  programTable,
  runLogTable,
  sessionTable,
  sleepLogsTable,
  subscriptionRequestTable,
  teamTable,
  trainingModuleSessionTable,
  userStreakTable,
  userTable,
  videoUploadTable,
  wellbeingLogsTable,
} from "../../db/schema";

export const CLIENT_DATA_SECTIONS = [
  "runs",
  "nutrition",
  "foodDiary",
  "training",
  "moduleCompletions",
  "videos",
  "sleep",
  "wellbeing",
  "bookings",
  "attendance",
  "achievements",
  "plans",
  "physio",
  "legal",
] as const;

export type ClientDataSection = (typeof CLIENT_DATA_SECTIONS)[number];

type ClientDataAccess = {
  managedByTeamAdminId?: number | null;
};

type PageInput = {
  section: ClientDataSection;
  athleteId: number;
  athleteUserId: number;
  limit?: number | null;
  cursor?: string | null;
  from?: Date | null;
  to?: Date | null;
};

function clampLimit(limit?: number | null) {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return 30;
  return Math.max(1, Math.min(100, Math.floor(limit)));
}

function parseOffset(cursor?: string | null) {
  if (!cursor) return 0;
  const parsed = Number(cursor);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function pageResult<T>(items: T[], limit: number, offset: number, totalCount: number) {
  const hasMore = offset + items.length < totalCount;
  return {
    items,
    pageInfo: {
      totalCount,
      hasMore,
      nextCursor: hasMore ? String(offset + items.length) : null,
    },
  };
}

function dateRangeFilters(input: { from?: Date | null; to?: Date | null }, column: any) {
  const filters = [];
  if (input.from) filters.push(gte(column, input.from));
  if (input.to) filters.push(lte(column, input.to));
  return filters;
}

function dateKeyFromDate(date?: Date | null) {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

function dateKeyRangeFilters(input: { from?: Date | null; to?: Date | null }, column: any) {
  const filters = [];
  const fromKey = dateKeyFromDate(input.from);
  const toKey = dateKeyFromDate(input.to);
  if (fromKey) filters.push(gte(column, fromKey));
  if (toKey) filters.push(lte(column, toKey));
  return filters;
}

async function getAthleteBase(athleteId: number, access?: ClientDataAccess) {
  const filters = [eq(athleteTable.id, athleteId), eq(userTable.isDeleted, false)];
  if (typeof access?.managedByTeamAdminId === "number") {
    filters.push(eq(teamTable.adminId, access.managedByTeamAdminId));
  }

  const [athlete] = await db
    .select({
      athleteId: athleteTable.id,
      athleteUserId: athleteTable.userId,
      userId: userTable.id,
      userName: userTable.name,
      email: userTable.email,
      isBlocked: userTable.isBlocked,
      accountCreatedAt: userTable.createdAt,
      accountUpdatedAt: userTable.updatedAt,
      name: athleteTable.name,
      athleteType: athleteTable.athleteType,
      age: athleteTable.age,
      birthDate: athleteTable.birthDate,
      teamId: athleteTable.teamId,
      team: teamTable.name,
      teamFallback: athleteTable.team,
      trainingPerWeek: athleteTable.trainingPerWeek,
      preferredTrainingDays: athleteTable.preferredTrainingDays,
      phoneNumber: athleteTable.phoneNumber,
      injuries: athleteTable.injuries,
      growthNotes: athleteTable.growthNotes,
      performanceGoals: athleteTable.performanceGoals,
      equipmentAccess: athleteTable.equipmentAccess,
      profilePicture: athleteTable.profilePicture,
      extraResponses: athleteTable.extraResponses,
      currentProgramTier: athleteTable.currentProgramTier,
      currentPlanId: athleteTable.currentPlanId,
      planPaymentType: athleteTable.planPaymentType,
      planCommitmentMonths: athleteTable.planCommitmentMonths,
      planExpiresAt: athleteTable.planExpiresAt,
      isSponsored: athleteTable.isSponsored,
      youthTrackingEnabled: athleteTable.youthTrackingEnabled,
      onboardingCompleted: athleteTable.onboardingCompleted,
      onboardingCompletedAt: athleteTable.onboardingCompletedAt,
      athleteCreatedAt: athleteTable.createdAt,
      athleteUpdatedAt: athleteTable.updatedAt,
      guardianId: guardianTable.id,
      guardianUserId: guardianTable.userId,
      guardianEmail: guardianTable.email,
      guardianPhoneNumber: guardianTable.phoneNumber,
      guardianRelationToAthlete: guardianTable.relationToAthlete,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(userTable.id, athleteTable.userId))
    .leftJoin(teamTable, eq(teamTable.id, athleteTable.teamId))
    .leftJoin(guardianTable, eq(guardianTable.id, athleteTable.guardianId))
    .where(and(...filters))
    .limit(1);

  return athlete ?? null;
}

export async function listClientDataAthletes(input?: {
  q?: string | null;
  type?: "youth" | "adult" | "team" | "all" | null;
  limit?: number | null;
  cursor?: string | null;
  managedByTeamAdminId?: number | null;
}) {
  const limit = clampLimit(input?.limit ?? 80);
  const offset = parseOffset(input?.cursor);
  const filters = [eq(userTable.isDeleted, false)];

  const q = input?.q?.trim();
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      or(
        ilike(athleteTable.name, pattern),
        ilike(userTable.email, pattern),
        ilike(teamTable.name, pattern),
        ilike(athleteTable.team, pattern),
      )!,
    );
  }

  if (input?.type && input.type !== "all") {
    if (input.type === "team") {
      filters.push(sql`${athleteTable.teamId} is not null`);
    } else {
      filters.push(eq(athleteTable.athleteType, input.type));
    }
  }

  if (typeof input?.managedByTeamAdminId === "number") {
    filters.push(eq(teamTable.adminId, input.managedByTeamAdminId));
  }

  const where = and(...filters);
  const [{ value: totalCount } = { value: 0 }] = await db
    .select({ value: count() })
    .from(athleteTable)
    .innerJoin(userTable, eq(userTable.id, athleteTable.userId))
    .leftJoin(teamTable, eq(teamTable.id, athleteTable.teamId))
    .where(where);

  const rows = await db
    .select({
      athleteId: athleteTable.id,
      athleteUserId: athleteTable.userId,
      name: athleteTable.name,
      email: userTable.email,
      athleteType: athleteTable.athleteType,
      team: teamTable.name,
      teamFallback: athleteTable.team,
      age: athleteTable.age,
      profilePicture: athleteTable.profilePicture,
      programTier: athleteTable.currentProgramTier,
      isBlocked: userTable.isBlocked,
      onboardingCompleted: athleteTable.onboardingCompleted,
      lastActivityAt: sql<Date | null>`greatest(
        coalesce(${athleteTable.updatedAt}, timestamp 'epoch'),
        coalesce(${userTable.updatedAt}, timestamp 'epoch')
      )`,
      runsCount: sql<number>`coalesce((select count(*)::int from ${runLogTable} where ${runLogTable.userId} = ${athleteTable.userId}), 0)`,
      nutritionCount: sql<number>`coalesce((select count(*)::int from ${nutritionLogsTable} where ${nutritionLogsTable.userId} = ${athleteTable.userId}), 0)`,
      trainingCount: sql<number>`coalesce((select count(*)::int from ${programSectionCompletionTable} where ${programSectionCompletionTable.athleteId} = ${athleteTable.id}), 0)`,
      videoCount: sql<number>`coalesce((select count(*)::int from ${videoUploadTable} where ${videoUploadTable.athleteId} = ${athleteTable.id}), 0)`,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(userTable.id, athleteTable.userId))
    .leftJoin(teamTable, eq(teamTable.id, athleteTable.teamId))
    .where(where)
    .orderBy(athleteTable.name, athleteTable.id)
    .limit(limit)
    .offset(offset);

  return pageResult(
    rows.map((row) => ({
      ...row,
      team: row.team ?? row.teamFallback ?? null,
      status: row.isBlocked ? "blocked" : row.onboardingCompleted ? "active" : "onboarding",
    })),
    limit,
    offset,
    Number(totalCount ?? 0),
  );
}

async function pageBySection(input: PageInput) {
  const limit = clampLimit(input.limit);
  const offset = parseOffset(input.cursor);

  if (input.section === "runs") {
    const filters = [eq(runLogTable.userId, input.athleteUserId), ...dateRangeFilters(input, runLogTable.date)];
    const [{ value = 0 } = { value: 0 }] = await db.select({ value: count() }).from(runLogTable).where(and(...filters));
    const items = await db
      .select()
      .from(runLogTable)
      .where(and(...filters))
      .orderBy(desc(runLogTable.date), desc(runLogTable.id))
      .limit(limit)
      .offset(offset);
    return pageResult(items, limit, offset, Number(value));
  }

  if (input.section === "nutrition") {
    const filters = [eq(nutritionLogsTable.userId, input.athleteUserId), ...dateKeyRangeFilters(input, nutritionLogsTable.dateKey)];
    const [{ value = 0 } = { value: 0 }] = await db.select({ value: count() }).from(nutritionLogsTable).where(and(...filters));
    const items = await db
      .select()
      .from(nutritionLogsTable)
      .where(and(...filters))
      .orderBy(desc(nutritionLogsTable.dateKey), desc(nutritionLogsTable.id))
      .limit(limit)
      .offset(offset);
    return pageResult(items, limit, offset, Number(value));
  }

  if (input.section === "foodDiary") {
    const filters = [eq(foodDiaryTable.athleteId, input.athleteId), ...dateRangeFilters(input, foodDiaryTable.createdAt)];
    const [{ value = 0 } = { value: 0 }] = await db.select({ value: count() }).from(foodDiaryTable).where(and(...filters));
    const items = await db
      .select()
      .from(foodDiaryTable)
      .where(and(...filters))
      .orderBy(desc(foodDiaryTable.createdAt), desc(foodDiaryTable.id))
      .limit(limit)
      .offset(offset);
    return pageResult(items, limit, offset, Number(value));
  }

  if (input.section === "training") {
    const completionFilters = [
      eq(programSectionCompletionTable.athleteId, input.athleteId),
      ...dateRangeFilters(input, programSectionCompletionTable.completedAt),
    ];
    const sessionFilters = [
      eq(athleteTrainingSessionCompletionTable.athleteId, input.athleteId),
      ...dateRangeFilters(input, athleteTrainingSessionCompletionTable.completedAt),
    ];

    const [[{ cCount = 0 } = {}], [{ sCount = 0 } = {}]] = await Promise.all([
      db.select({ cCount: count() }).from(programSectionCompletionTable).where(and(...completionFilters)),
      db.select({ sCount: count() }).from(athleteTrainingSessionCompletionTable).where(and(...sessionFilters)),
    ]);

    const totalCount = Number(cCount) + Number(sCount);

    const [completions, sessions] = await Promise.all([
      db
        .select({
          id: programSectionCompletionTable.id,
          athleteId: programSectionCompletionTable.athleteId,
          sessionTitle: programSectionContentTable.title,
          sectionType: programSectionContentTable.sectionType,
          rpe: programSectionCompletionTable.rpe,
          soreness: programSectionCompletionTable.soreness,
          fatigue: programSectionCompletionTable.fatigue,
          notes: programSectionCompletionTable.notes,
          completedAt: programSectionCompletionTable.completedAt,
          _source: sql<string>`'completion'`,
        })
        .from(programSectionCompletionTable)
        .leftJoin(programSectionContentTable, eq(programSectionContentTable.id, programSectionCompletionTable.programSectionContentId))
        .where(and(...completionFilters))
        .orderBy(desc(programSectionCompletionTable.completedAt)),
      db
        .select({
          id: athleteTrainingSessionCompletionTable.id,
          athleteId: athleteTrainingSessionCompletionTable.athleteId,
          sessionId: athleteTrainingSessionCompletionTable.sessionId,
          sessionTitle: trainingModuleSessionTable.title,
          completedAt: athleteTrainingSessionCompletionTable.completedAt,
          _source: sql<string>`'session_completion'`,
        })
        .from(athleteTrainingSessionCompletionTable)
        .leftJoin(trainingModuleSessionTable, eq(trainingModuleSessionTable.id, athleteTrainingSessionCompletionTable.sessionId))
        .where(and(...sessionFilters))
        .orderBy(desc(athleteTrainingSessionCompletionTable.completedAt)),
    ]);

    const merged = [...completions, ...sessions].sort((a, b) => {
      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bTime - aTime;
    });

    const pageItems = merged.slice(offset, offset + limit);
    return pageResult(pageItems, limit, offset, totalCount);
  }

  if (input.section === "moduleCompletions") {
    const filters = [eq(programSectionCompletionTable.athleteId, input.athleteId), ...dateRangeFilters(input, programSectionCompletionTable.completedAt)];
    const [{ value = 0 } = { value: 0 }] = await db.select({ value: count() }).from(programSectionCompletionTable).where(and(...filters));
    const items = await db
      .select({
        id: programSectionCompletionTable.id,
        athleteId: programSectionCompletionTable.athleteId,
        programSectionContentId: programSectionCompletionTable.programSectionContentId,
        title: programSectionContentTable.title,
        sectionType: programSectionContentTable.sectionType,
        rpe: programSectionCompletionTable.rpe,
        soreness: programSectionCompletionTable.soreness,
        fatigue: programSectionCompletionTable.fatigue,
        notes: programSectionCompletionTable.notes,
        completedAt: programSectionCompletionTable.completedAt,
      })
      .from(programSectionCompletionTable)
      .leftJoin(programSectionContentTable, eq(programSectionContentTable.id, programSectionCompletionTable.programSectionContentId))
      .where(and(...filters))
      .orderBy(desc(programSectionCompletionTable.completedAt), desc(programSectionCompletionTable.id))
      .limit(limit)
      .offset(offset);
    return pageResult(items, limit, offset, Number(value));
  }

  if (input.section === "videos") {
    const filters = [eq(videoUploadTable.athleteId, input.athleteId), ...dateRangeFilters(input, videoUploadTable.createdAt)];
    const [{ value = 0 } = { value: 0 }] = await db.select({ value: count() }).from(videoUploadTable).where(and(...filters));
    const items = await db
      .select()
      .from(videoUploadTable)
      .where(and(...filters))
      .orderBy(desc(videoUploadTable.createdAt), desc(videoUploadTable.id))
      .limit(limit)
      .offset(offset);
    return pageResult(items, limit, offset, Number(value));
  }

  if (input.section === "sleep") {
    const filters = [eq(sleepLogsTable.userId, input.athleteUserId), ...dateKeyRangeFilters(input, sleepLogsTable.dateKey)];
    const [{ value = 0 } = { value: 0 }] = await db.select({ value: count() }).from(sleepLogsTable).where(and(...filters));
    const items = await db
      .select()
      .from(sleepLogsTable)
      .where(and(...filters))
      .orderBy(desc(sleepLogsTable.dateKey), desc(sleepLogsTable.id))
      .limit(limit)
      .offset(offset);
    return pageResult(items, limit, offset, Number(value));
  }

  if (input.section === "wellbeing") {
    const filters = [eq(wellbeingLogsTable.userId, input.athleteUserId), ...dateKeyRangeFilters(input, wellbeingLogsTable.dateKey)];
    const [{ value = 0 } = { value: 0 }] = await db.select({ value: count() }).from(wellbeingLogsTable).where(and(...filters));
    const items = await db
      .select()
      .from(wellbeingLogsTable)
      .where(and(...filters))
      .orderBy(desc(wellbeingLogsTable.dateKey), desc(wellbeingLogsTable.id))
      .limit(limit)
      .offset(offset);
    return pageResult(items, limit, offset, Number(value));
  }

  if (input.section === "bookings") {
    const filters = [eq(bookingTable.athleteId, input.athleteId), ...dateRangeFilters(input, bookingTable.startsAt)];
    const [{ value = 0 } = { value: 0 }] = await db.select({ value: count() }).from(bookingTable).where(and(...filters));
    const items = await db
      .select()
      .from(bookingTable)
      .where(and(...filters))
      .orderBy(desc(bookingTable.startsAt), desc(bookingTable.id))
      .limit(limit)
      .offset(offset);
    return pageResult(items, limit, offset, Number(value));
  }

  if (input.section === "attendance") {
    const filters = [eq(athleteTrainingSessionCompletionTable.athleteId, input.athleteId), ...dateRangeFilters(input, athleteTrainingSessionCompletionTable.completedAt)];
    const [{ value = 0 } = { value: 0 }] = await db
      .select({ value: count() })
      .from(athleteTrainingSessionCompletionTable)
      .where(and(...filters));
    const items = await db
      .select({
        id: athleteTrainingSessionCompletionTable.id,
        athleteId: athleteTrainingSessionCompletionTable.athleteId,
        sessionId: athleteTrainingSessionCompletionTable.sessionId,
        sessionTitle: trainingModuleSessionTable.title,
        completedAt: athleteTrainingSessionCompletionTable.completedAt,
        createdAt: athleteTrainingSessionCompletionTable.createdAt,
      })
      .from(athleteTrainingSessionCompletionTable)
      .leftJoin(trainingModuleSessionTable, eq(trainingModuleSessionTable.id, athleteTrainingSessionCompletionTable.sessionId))
      .where(and(...filters))
      .orderBy(desc(athleteTrainingSessionCompletionTable.completedAt), desc(athleteTrainingSessionCompletionTable.id))
      .limit(limit)
      .offset(offset);
    return pageResult(items, limit, offset, Number(value));
  }

  if (input.section === "achievements") {
    const filters = [eq(athleteAchievementUnlockTable.athleteId, input.athleteId), ...dateRangeFilters(input, athleteAchievementUnlockTable.unlockedAt)];
    const [{ value = 0 } = { value: 0 }] = await db.select({ value: count() }).from(athleteAchievementUnlockTable).where(and(...filters));
    const items = await db
      .select()
      .from(athleteAchievementUnlockTable)
      .where(and(...filters))
      .orderBy(desc(athleteAchievementUnlockTable.unlockedAt), desc(athleteAchievementUnlockTable.id))
      .limit(limit)
      .offset(offset);
    return pageResult(items, limit, offset, Number(value));
  }

  if (input.section === "plans") {
    const filters = [eq(subscriptionRequestTable.athleteId, input.athleteId), ...dateRangeFilters(input, subscriptionRequestTable.createdAt)];
    const [{ value = 0 } = { value: 0 }] = await db.select({ value: count() }).from(subscriptionRequestTable).where(and(...filters));
    const items = await db
      .select()
      .from(subscriptionRequestTable)
      .where(and(...filters))
      .orderBy(desc(subscriptionRequestTable.createdAt), desc(subscriptionRequestTable.id))
      .limit(limit)
      .offset(offset);
    return pageResult(items, limit, offset, Number(value));
  }

  if (input.section === "physio") {
    const filters = [eq(physioRefferalsTable.athleteId, input.athleteId), ...dateRangeFilters(input, physioRefferalsTable.createdAt)];
    const [{ value = 0 } = { value: 0 }] = await db.select({ value: count() }).from(physioRefferalsTable).where(and(...filters));
    const items = await db
      .select()
      .from(physioRefferalsTable)
      .where(and(...filters))
      .orderBy(desc(physioRefferalsTable.createdAt), desc(physioRefferalsTable.id))
      .limit(limit)
      .offset(offset);
    return pageResult(items, limit, offset, Number(value));
  }

  if (input.section === "legal") {
    const filters = [eq(legalAcceptanceTable.athleteId, input.athleteId), ...dateRangeFilters(input, legalAcceptanceTable.createdAt)];
    const [{ value = 0 } = { value: 0 }] = await db.select({ value: count() }).from(legalAcceptanceTable).where(and(...filters));
    const items = await db
      .select()
      .from(legalAcceptanceTable)
      .where(and(...filters))
      .orderBy(desc(legalAcceptanceTable.createdAt), desc(legalAcceptanceTable.id))
      .limit(limit)
      .offset(offset);
    return pageResult(items, limit, offset, Number(value));
  }

  return pageResult([], limit, offset, 0);
}

async function getCounts(athleteId: number, athleteUserId: number) {
  const [
    runs,
    nutrition,
    foodDiary,
    training,
    moduleCompletions,
    videos,
    sleep,
    wellbeing,
    bookings,
    attendance,
    achievements,
    plans,
    physio,
    legal,
    enrollments,
  ] = await Promise.all([
    db.select({ value: count() }).from(runLogTable).where(eq(runLogTable.userId, athleteUserId)),
    db.select({ value: count() }).from(nutritionLogsTable).where(eq(nutritionLogsTable.userId, athleteUserId)),
    db.select({ value: count() }).from(foodDiaryTable).where(eq(foodDiaryTable.athleteId, athleteId)),
    db.select({ value: count() }).from(athleteTrainingSessionCompletionTable).where(eq(athleteTrainingSessionCompletionTable.athleteId, athleteId)),
    db.select({ value: count() }).from(programSectionCompletionTable).where(eq(programSectionCompletionTable.athleteId, athleteId)),
    db.select({ value: count() }).from(videoUploadTable).where(eq(videoUploadTable.athleteId, athleteId)),
    db.select({ value: count() }).from(sleepLogsTable).where(eq(sleepLogsTable.userId, athleteUserId)),
    db.select({ value: count() }).from(wellbeingLogsTable).where(eq(wellbeingLogsTable.userId, athleteUserId)),
    db.select({ value: count() }).from(bookingTable).where(eq(bookingTable.athleteId, athleteId)),
    db.select({ value: count() }).from(athleteTrainingSessionCompletionTable).where(eq(athleteTrainingSessionCompletionTable.athleteId, athleteId)),
    db.select({ value: count() }).from(athleteAchievementUnlockTable).where(eq(athleteAchievementUnlockTable.athleteId, athleteId)),
    db.select({ value: count() }).from(subscriptionRequestTable).where(eq(subscriptionRequestTable.athleteId, athleteId)),
    db.select({ value: count() }).from(physioRefferalsTable).where(eq(physioRefferalsTable.athleteId, athleteId)),
    db.select({ value: count() }).from(legalAcceptanceTable).where(eq(legalAcceptanceTable.athleteId, athleteId)),
    db.select({ value: count() }).from(enrollmentTable).where(eq(enrollmentTable.athleteId, athleteId)),
  ]);

  return {
    runs: Number(runs[0]?.value ?? 0),
    nutrition: Number(nutrition[0]?.value ?? 0),
    foodDiary: Number(foodDiary[0]?.value ?? 0),
    training: Number(training[0]?.value ?? 0),
    moduleCompletions: Number(moduleCompletions[0]?.value ?? 0),
    videos: Number(videos[0]?.value ?? 0),
    sleep: Number(sleep[0]?.value ?? 0),
    wellbeing: Number(wellbeing[0]?.value ?? 0),
    bookings: Number(bookings[0]?.value ?? 0),
    attendance: Number(attendance[0]?.value ?? 0),
    achievements: Number(achievements[0]?.value ?? 0),
    plans: Number(plans[0]?.value ?? 0),
    physio: Number(physio[0]?.value ?? 0),
    legal: Number(legal[0]?.value ?? 0),
    enrollments: Number(enrollments[0]?.value ?? 0),
  };
}

async function getProgramProgress(athleteId: number) {
  const rows = await db
    .select({
      programId: programAssignmentTable.programId,
      programName: programTable.name,
      totalSessions: sql<number>`count(distinct ${sessionTable.id})::int`,
      completedSessions: sql<number>`count(distinct ${programSessionCompletionTable.sessionId})::int`,
    })
    .from(programAssignmentTable)
    .innerJoin(programTable, eq(programTable.id, programAssignmentTable.programId))
    .leftJoin(sessionTable, eq(sessionTable.programId, programAssignmentTable.programId))
    .leftJoin(
      programSessionCompletionTable,
      and(
        eq(programSessionCompletionTable.sessionId, sessionTable.id),
        eq(programSessionCompletionTable.athleteId, athleteId),
      ),
    )
    .where(eq(programAssignmentTable.athleteId, athleteId))
    .groupBy(programAssignmentTable.programId, programTable.name);

  return rows.map((row) => ({
    ...row,
    percentComplete: row.totalSessions > 0 ? Math.round((row.completedSessions / row.totalSessions) * 100) : 0,
  }));
}

export async function getClientDataAthleteDetail(
  athleteId: number,
  input?: { limit?: number | null } & ClientDataAccess,
) {
  const athlete = await getAthleteBase(athleteId, input);
  if (!athlete) return null;

  const [nutritionTargets, nutritionOnboarding, streak, programProgress, counts, ...sectionPages] = await Promise.all([
    db.select().from(nutritionTargetsTable).where(eq(nutritionTargetsTable.userId, athlete.athleteUserId)).limit(1),
    db.select().from(nutritionOnboardingProfileTable).where(eq(nutritionOnboardingProfileTable.userId, athlete.athleteUserId)).limit(1),
    db.select().from(userStreakTable).where(eq(userStreakTable.userId, athlete.athleteUserId)).limit(1),
    getProgramProgress(athlete.athleteId),
    getCounts(athlete.athleteId, athlete.athleteUserId),
    ...CLIENT_DATA_SECTIONS.map((section) =>
      pageBySection({
        section,
        athleteId: athlete.athleteId,
        athleteUserId: athlete.athleteUserId,
        limit: input?.limit ?? 10,
      }),
    ),
  ]);

  const sections = Object.fromEntries(CLIENT_DATA_SECTIONS.map((section, index) => [section, sectionPages[index]]));

  return {
    athlete: {
      ...athlete,
      team: athlete.team ?? athlete.teamFallback ?? null,
      status: athlete.isBlocked ? "blocked" : athlete.onboardingCompleted ? "active" : "onboarding",
    },
    profile: {
      nutritionTargets: nutritionTargets[0] ?? null,
      nutritionOnboarding: nutritionOnboarding[0] ?? null,
      streak: streak[0] ?? null,
      programProgress,
      counts,
    },
    sections,
  };
}

export async function getClientDataAthleteSection(
  athleteId: number,
  input: {
    section: ClientDataSection;
    cursor?: string | null;
    limit?: number | null;
    from?: Date | null;
    to?: Date | null;
  } & ClientDataAccess,
) {
  const athlete = await getAthleteBase(athleteId, input);
  if (!athlete) return null;
  return pageBySection({
    section: input.section,
    athleteId: athlete.athleteId,
    athleteUserId: athlete.athleteUserId,
    limit: input.limit,
    cursor: input.cursor,
    from: input.from,
    to: input.to,
  });
}

export function isClientDataSection(value: string): value is ClientDataSection {
  return (CLIENT_DATA_SECTIONS as readonly string[]).includes(value);
}
