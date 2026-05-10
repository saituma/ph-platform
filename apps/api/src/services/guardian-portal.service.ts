import { eq, and, desc, count, inArray } from "drizzle-orm";
import * as crypto from "node:crypto";
import { db } from "../db";
import {
  guardianTable,
  athleteTable,
  userTable,
  teamTable,
  subscriptionPlanTable,
  programAssignmentTable,
  programTable,
  athleteTrainingSessionLogTable,
  sessionAttendanceTable,
  scheduledSessionTable,
  guardianFeedbackTable,
  guardianFeedbackReplyTable,
  sessionTable,
  programSessionCompletionTable,
} from "../db/schema";
import { getSocketServer } from "../socket-hub";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PatchMeInput = {
  name?: string;
  phone?: string;
  password?: string;
  onboardingComplete?: boolean;
  preferences?: {
    updateFrequency?: string;
    contactMethod?: string;
    expectations?: string[];
    expectationsText?: string;
    heardFrom?: string;
  };
};

export type AddChildInput = {
  name: string;
  age?: number;
  athleteType: "youth" | "adult";
  sport?: string;
  injuries?: string;
  performanceGoals?: string;
};

// ── Private helpers ───────────────────────────────────────────────────────────

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

async function ensureGuardian(userId: number, email: string) {
  let [guardian] = await db
    .select()
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  if (!guardian) {
    const [created] = await db
      .insert(guardianTable)
      .values({ userId, email })
      .returning();
    guardian = created;
  }

  return guardian;
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function getGuardianMe(
  userId: number,
): Promise<{ id: number; name: string; email: string; role: string; guardian: unknown } | null> {
  const [user] = await db
    .select({ id: userTable.id, name: userTable.name, email: userTable.email, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!user) return null;

  const [guardian] = await db
    .select()
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  return { ...user, guardian: guardian ?? null };
}

export async function patchGuardianMe(
  userId: number,
  email: string,
  data: PatchMeInput,
): Promise<{ ok: true }> {
  const { name, phone, password, onboardingComplete, preferences } = data;

  if (name) {
    await db.update(userTable).set({ name, updatedAt: new Date() }).where(eq(userTable.id, userId));
  }

  if (password) {
    const { hash, salt } = hashPassword(password);
    await db
      .update(userTable)
      .set({ passwordHash: hash, passwordSalt: salt, updatedAt: new Date() })
      .where(eq(userTable.id, userId));
  }

  const guardian = await ensureGuardian(userId, email);

  if (phone !== undefined) {
    await db
      .update(guardianTable)
      .set({ phoneNumber: phone, updatedAt: new Date() })
      .where(eq(guardianTable.id, guardian.id));
  }

  if (preferences || onboardingComplete !== undefined) {
    const [athlete] = await db
      .select()
      .from(athleteTable)
      .where(eq(athleteTable.guardianId, guardian.id))
      .limit(1);

    if (athlete) {
      const existing = (athlete.extraResponses ?? {}) as Record<string, unknown>;
      const next = {
        ...existing,
        ...(preferences?.updateFrequency ? { updateFrequency: preferences.updateFrequency } : {}),
        ...(preferences?.contactMethod ? { contactMethod: preferences.contactMethod } : {}),
        ...(preferences?.expectations ? { expectations: preferences.expectations } : {}),
        ...(preferences?.expectationsText ? { expectationsText: preferences.expectationsText } : {}),
        ...(preferences?.heardFrom ? { heardFrom: preferences.heardFrom } : {}),
      };
      await db
        .update(athleteTable)
        .set({
          extraResponses: next,
          ...(onboardingComplete ? { onboardingCompleted: true, onboardingCompletedAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(athleteTable.id, athlete.id));
    } else if (onboardingComplete) {
      await db.update(userTable).set({ updatedAt: new Date() }).where(eq(userTable.id, userId));
    }
  }

  return { ok: true };
}

export async function getGuardianChildren(
  userId: number,
): Promise<{ id: number | null; children: unknown[] }> {
  const [guardian] = await db
    .select()
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  if (!guardian) return { id: null, children: [] };

  const athleteIdSet = new Set<number>();

  const byGuardianId = await db
    .select({ id: athleteTable.id })
    .from(athleteTable)
    .where(eq(athleteTable.guardianId, guardian.id));
  byGuardianId.forEach((r) => athleteIdSet.add(r.id));

  if (guardian.activeAthleteId) athleteIdSet.add(guardian.activeAthleteId);

  if (athleteIdSet.size === 0) return { id: guardian.id, children: [] };

  const athletes = await db
    .select({
      id: athleteTable.id,
      name: athleteTable.name,
      age: athleteTable.age,
      athleteType: athleteTable.athleteType,
      teamId: athleteTable.teamId,
      teamName: teamTable.name,
      currentProgramTier: athleteTable.currentProgramTier,
      currentPlanId: athleteTable.currentPlanId,
      performanceGoals: athleteTable.performanceGoals,
    })
    .from(athleteTable)
    .leftJoin(teamTable, eq(athleteTable.teamId, teamTable.id))
    .where(inArray(athleteTable.id, [...athleteIdSet]));

  const children = athletes.map((a) => ({
    id: a.id,
    name: a.name,
    age: a.age,
    athleteType: a.athleteType,
    team: a.teamName ? { name: a.teamName } : null,
    currentProgramTier: a.currentProgramTier ?? null,
    currentPlanId: a.currentPlanId ?? null,
    performanceGoals: a.performanceGoals ?? null,
  }));

  return { id: guardian.id, children };
}

export async function addGuardianChild(
  userId: number,
  email: string,
  data: AddChildInput,
): Promise<{ id: number; name: string; guardianId: number }> {
  const guardian = await ensureGuardian(userId, email);
  const { name, age, athleteType, sport, injuries, performanceGoals } = data;

  const [athlete] = await db
    .insert(athleteTable)
    .values({
      userId,
      guardianId: guardian.id,
      name,
      age: age ?? 0,
      athleteType,
      team: "",
      trainingPerWeek: 0,
      extraResponses: sport ? { sport } : null,
      injuries: injuries ? [injuries] : null,
      performanceGoals: performanceGoals ?? null,
    })
    .returning();

  return { id: athlete.id, name: athlete.name, guardianId: guardian.id };
}

export async function getGuardianChild(
  userId: number,
  athleteId: number,
): Promise<unknown | null | "forbidden"> {
  const [guardian] = await db
    .select()
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  if (!guardian) return null;

  const [athlete] = await db
    .select({
      id: athleteTable.id,
      name: athleteTable.name,
      age: athleteTable.age,
      athleteType: athleteTable.athleteType,
      teamName: teamTable.name,
      currentProgramTier: athleteTable.currentProgramTier,
      performanceGoals: athleteTable.performanceGoals,
      injuries: athleteTable.injuries,
    })
    .from(athleteTable)
    .leftJoin(teamTable, eq(athleteTable.teamId, teamTable.id))
    .where(eq(athleteTable.id, athleteId))
    .limit(1);

  if (!athlete) return null;

  const isOwned =
    athlete.id === guardian.activeAthleteId ||
    (
      await db
        .select({ id: athleteTable.id })
        .from(athleteTable)
        .where(and(eq(athleteTable.id, athleteId), eq(athleteTable.guardianId, guardian.id)))
        .limit(1)
    ).length > 0;

  if (!isOwned) return "forbidden";

  const assignments = await db
    .select({
      id: programAssignmentTable.id,
      status: programAssignmentTable.status,
      completedAt: programAssignmentTable.completedAt,
      programId: programTable.id,
      programName: programTable.name,
      programDescription: programTable.description,
      programType: programTable.type,
    })
    .from(programAssignmentTable)
    .leftJoin(programTable, eq(programAssignmentTable.programId, programTable.id))
    .where(eq(programAssignmentTable.athleteId, athleteId));

  const programIds = assignments.map((a) => a.programId).filter(Boolean) as number[];

  const sessionCounts = programIds.length
    ? await db
        .select({ programId: sessionTable.programId, total: count() })
        .from(sessionTable)
        .where(inArray(sessionTable.programId, programIds))
        .groupBy(sessionTable.programId)
    : [];

  const completedCounts = programIds.length
    ? await db
        .select({
          programId: sessionTable.programId,
          completed: count(),
        })
        .from(programSessionCompletionTable)
        .innerJoin(sessionTable, eq(programSessionCompletionTable.sessionId, sessionTable.id))
        .where(
          and(
            eq(programSessionCompletionTable.athleteId, athleteId),
            inArray(sessionTable.programId, programIds),
          ),
        )
        .groupBy(sessionTable.programId)
    : [];

  const totalMap = new Map(sessionCounts.map((r) => [r.programId, r.total]));
  const completedMap = new Map(completedCounts.map((r) => [r.programId, r.completed]));

  const programs = assignments.map((a) => ({
    id: String(a.programId),
    name: a.programName ?? "Unknown",
    description: a.programDescription ?? null,
    tier: a.programType ?? null,
    status: a.status,
    completedAt: a.completedAt,
    totalSessions: totalMap.get(a.programId!) ?? 0,
    completedSessions: completedMap.get(a.programId!) ?? 0,
  }));

  const logs = await db
    .select()
    .from(athleteTrainingSessionLogTable)
    .where(eq(athleteTrainingSessionLogTable.athleteId, athleteId))
    .orderBy(athleteTrainingSessionLogTable.createdAt)
    .limit(10);

  const recentSessions = logs.map((l) => ({
    id: String(l.id),
    date: l.createdAt.toISOString(),
    type: l.sessionLabel ?? `Week ${l.weekNumber ?? "?"} session`,
    completed: true,
    notes: null,
  }));

  return {
    id: athlete.id,
    name: athlete.name,
    age: athlete.age,
    athleteType: athlete.athleteType,
    team: athlete.teamName ? { name: athlete.teamName } : null,
    currentProgramTier: athlete.currentProgramTier ?? null,
    performanceGoals: athlete.performanceGoals ?? null,
    injuries: athlete.injuries ? String(athlete.injuries) : null,
    programs,
    recentSessions,
  };
}

export async function getGuardianChildAttendance(
  userId: number,
  athleteId: number,
): Promise<unknown | null | "forbidden"> {
  const [guardian] = await db
    .select()
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  if (!guardian) return "forbidden";

  const [athlete] = await db
    .select({ id: athleteTable.id, userId: athleteTable.userId, guardianId: athleteTable.guardianId })
    .from(athleteTable)
    .where(eq(athleteTable.id, athleteId))
    .limit(1);

  if (!athlete) return null;
  if (athlete.guardianId !== guardian.id && athlete.id !== guardian.activeAthleteId) return "forbidden";

  const rows = await db
    .select({
      id: sessionAttendanceTable.id,
      status: sessionAttendanceTable.status,
      checkInAt: sessionAttendanceTable.checkInAt,
      markedAt: sessionAttendanceTable.markedAt,
      sessionId: scheduledSessionTable.id,
      sessionName: scheduledSessionTable.name,
      sessionType: scheduledSessionTable.type,
      startsAt: scheduledSessionTable.startsAt,
      endsAt: scheduledSessionTable.endsAt,
      location: scheduledSessionTable.location,
    })
    .from(sessionAttendanceTable)
    .innerJoin(scheduledSessionTable, eq(sessionAttendanceTable.scheduledSessionId, scheduledSessionTable.id))
    .where(eq(sessionAttendanceTable.userId, athlete.userId!))
    .orderBy(scheduledSessionTable.startsAt);

  const attended = rows.filter((r) => r.status === "attended").length;
  const missed = rows.filter((r) => r.status === "missed").length;
  const total = rows.length;

  return {
    summary: { total, attended, missed, rate: total > 0 ? Math.round((attended / total) * 100) : 0 },
    sessions: rows.map((r) => ({
      id: r.id,
      sessionName: r.sessionName,
      sessionType: r.sessionType,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      location: r.location ?? null,
      status: r.status,
      checkInAt: r.checkInAt ?? null,
    })),
  };
}

export async function patchGuardianChildMedical(
  userId: number,
  athleteId: number,
  injuries: string,
): Promise<{ ok: true } | null | "forbidden"> {
  const [guardian] = await db
    .select()
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  if (!guardian) return "forbidden";

  const [athlete] = await db
    .select({ id: athleteTable.id, guardianId: athleteTable.guardianId })
    .from(athleteTable)
    .where(eq(athleteTable.id, athleteId))
    .limit(1);

  if (!athlete) return null;
  if (athlete.guardianId !== guardian.id && athlete.id !== guardian.activeAthleteId) return "forbidden";

  await db.update(athleteTable).set({ injuries, updatedAt: new Date() }).where(eq(athleteTable.id, athleteId));

  return { ok: true };
}

export async function listGuardianFeedback(userId: number): Promise<{ threads: unknown[] }> {
  const threads = await db
    .select({
      id: guardianFeedbackTable.id,
      subject: guardianFeedbackTable.subject,
      status: guardianFeedbackTable.status,
      createdAt: guardianFeedbackTable.createdAt,
      updatedAt: guardianFeedbackTable.updatedAt,
    })
    .from(guardianFeedbackTable)
    .where(eq(guardianFeedbackTable.guardianUserId, userId))
    .orderBy(desc(guardianFeedbackTable.updatedAt));

  return { threads };
}

export async function createFeedbackThread(
  userId: number,
  subject: string,
  message: string,
): Promise<unknown> {
  const [thread] = await db
    .insert(guardianFeedbackTable)
    .values({
      guardianUserId: userId,
      subject,
      status: "open",
    })
    .returning();

  const [reply] = await db
    .insert(guardianFeedbackReplyTable)
    .values({
      feedbackId: thread.id,
      senderId: userId,
      content: message,
    })
    .returning();

  getSocketServer()?.to("admin:all").emit("guardian:feedback:new", {
    feedbackId: thread.id,
    subject,
    guardianUserId: userId,
  });

  return { id: thread.id, subject: thread.subject, status: thread.status, replies: [reply] };
}

export async function getFeedbackThread(
  userId: number,
  feedbackId: number,
): Promise<unknown | null> {
  const [thread] = await db
    .select()
    .from(guardianFeedbackTable)
    .where(and(eq(guardianFeedbackTable.id, feedbackId), eq(guardianFeedbackTable.guardianUserId, userId)))
    .limit(1);

  if (!thread) return null;

  const replies = await db
    .select({
      id: guardianFeedbackReplyTable.id,
      content: guardianFeedbackReplyTable.content,
      createdAt: guardianFeedbackReplyTable.createdAt,
      senderId: guardianFeedbackReplyTable.senderId,
      senderName: userTable.name,
      senderRole: userTable.role,
    })
    .from(guardianFeedbackReplyTable)
    .innerJoin(userTable, eq(guardianFeedbackReplyTable.senderId, userTable.id))
    .where(eq(guardianFeedbackReplyTable.feedbackId, feedbackId))
    .orderBy(guardianFeedbackReplyTable.createdAt);

  return { ...thread, replies };
}

export async function replyToFeedback(
  userId: number,
  feedbackId: number,
  message: string,
): Promise<unknown | null> {
  const [thread] = await db
    .select({ id: guardianFeedbackTable.id })
    .from(guardianFeedbackTable)
    .where(and(eq(guardianFeedbackTable.id, feedbackId), eq(guardianFeedbackTable.guardianUserId, userId)))
    .limit(1);

  if (!thread) return null;

  const [reply] = await db
    .insert(guardianFeedbackReplyTable)
    .values({
      feedbackId,
      senderId: userId,
      content: message,
    })
    .returning();

  await db
    .update(guardianFeedbackTable)
    .set({ updatedAt: new Date() })
    .where(eq(guardianFeedbackTable.id, feedbackId));

  getSocketServer()?.to("admin:all").emit("guardian:feedback:reply", { feedbackId, reply });

  return reply;
}

export async function listAdminFeedback(): Promise<{ threads: unknown[] }> {
  const threads = await db
    .select({
      id: guardianFeedbackTable.id,
      subject: guardianFeedbackTable.subject,
      status: guardianFeedbackTable.status,
      createdAt: guardianFeedbackTable.createdAt,
      updatedAt: guardianFeedbackTable.updatedAt,
      guardianUserId: guardianFeedbackTable.guardianUserId,
      guardianName: userTable.name,
      guardianEmail: userTable.email,
    })
    .from(guardianFeedbackTable)
    .innerJoin(userTable, eq(guardianFeedbackTable.guardianUserId, userTable.id))
    .orderBy(desc(guardianFeedbackTable.updatedAt))
    .limit(200); // safety cap — admin inbox view; add pagination if this grows

  return { threads };
}

export async function getAdminFeedbackThread(feedbackId: number): Promise<unknown | null> {
  const [thread] = await db
    .select({
      id: guardianFeedbackTable.id,
      subject: guardianFeedbackTable.subject,
      status: guardianFeedbackTable.status,
      createdAt: guardianFeedbackTable.createdAt,
      guardianUserId: guardianFeedbackTable.guardianUserId,
      guardianName: userTable.name,
      guardianEmail: userTable.email,
    })
    .from(guardianFeedbackTable)
    .innerJoin(userTable, eq(guardianFeedbackTable.guardianUserId, userTable.id))
    .where(eq(guardianFeedbackTable.id, feedbackId))
    .limit(1);

  if (!thread) return null;

  const replies = await db
    .select({
      id: guardianFeedbackReplyTable.id,
      content: guardianFeedbackReplyTable.content,
      createdAt: guardianFeedbackReplyTable.createdAt,
      senderId: guardianFeedbackReplyTable.senderId,
      senderName: userTable.name,
      senderRole: userTable.role,
    })
    .from(guardianFeedbackReplyTable)
    .innerJoin(userTable, eq(guardianFeedbackReplyTable.senderId, userTable.id))
    .where(eq(guardianFeedbackReplyTable.feedbackId, feedbackId))
    .orderBy(guardianFeedbackReplyTable.createdAt);

  return { ...thread, replies };
}

export async function adminReplyToFeedback(
  adminUserId: number,
  feedbackId: number,
  message: string,
): Promise<unknown | null> {
  const [thread] = await db
    .select({ id: guardianFeedbackTable.id, guardianUserId: guardianFeedbackTable.guardianUserId })
    .from(guardianFeedbackTable)
    .where(eq(guardianFeedbackTable.id, feedbackId))
    .limit(1);

  if (!thread) return null;

  const [reply] = await db
    .insert(guardianFeedbackReplyTable)
    .values({
      feedbackId,
      senderId: adminUserId,
      content: message,
    })
    .returning();

  await db
    .update(guardianFeedbackTable)
    .set({ updatedAt: new Date() })
    .where(eq(guardianFeedbackTable.id, feedbackId));

  const io = getSocketServer();
  io?.to(`user:${thread.guardianUserId}`).emit("guardian:feedback:reply", { feedbackId, reply });

  return reply;
}

export async function updateFeedbackStatus(
  feedbackId: number,
  status: "open" | "resolved",
): Promise<{ ok: true }> {
  await db
    .update(guardianFeedbackTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(guardianFeedbackTable.id, feedbackId));

  return { ok: true };
}

export async function getGuardianBillingStatus(userId: number): Promise<{ children: unknown[] }> {
  const [guardian] = await db
    .select()
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  if (!guardian) return { children: [] };

  const athletes = await db
    .select({
      id: athleteTable.id,
      name: athleteTable.name,
      currentProgramTier: athleteTable.currentProgramTier,
      currentPlanId: athleteTable.currentPlanId,
      planExpiresAt: athleteTable.planExpiresAt,
    })
    .from(athleteTable)
    .where(eq(athleteTable.guardianId, guardian.id));

  const planIds = [...new Set(athletes.map((a) => a.currentPlanId).filter(Boolean) as number[])];
  const plans = planIds.length
    ? await db
        .select({
          id: subscriptionPlanTable.id,
          name: subscriptionPlanTable.name,
          tier: subscriptionPlanTable.tier,
          displayPrice: subscriptionPlanTable.displayPrice,
          monthlyPrice: subscriptionPlanTable.monthlyPrice,
          yearlyPrice: subscriptionPlanTable.yearlyPrice,
          billingInterval: subscriptionPlanTable.billingInterval,
          features: subscriptionPlanTable.features,
        })
        .from(subscriptionPlanTable)
        .where(
          planIds.length === 1
            ? eq(subscriptionPlanTable.id, planIds[0]!)
            : eq(subscriptionPlanTable.id, planIds[0]!),
        )
    : [];

  const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));

  const children = athletes.map((a) => ({
    id: a.id,
    name: a.name,
    currentProgramTier: a.currentProgramTier,
    planExpiresAt: a.planExpiresAt,
    plan: a.currentPlanId ? (planMap[a.currentPlanId] ?? null) : null,
  }));

  return { children };
}
