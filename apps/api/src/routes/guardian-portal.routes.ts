import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import * as crypto from "node:crypto";
import { z } from "zod";
import { db } from "../db";
import {
  guardianTable, athleteTable, userTable, teamTable, subscriptionPlanTable,
  programAssignmentTable, programTable, athleteTrainingSessionLogTable,
  sessionAttendanceTable, scheduledSessionTable,
  guardianFeedbackTable, guardianFeedbackReplyTable,
} from "../db/schema";
import { desc } from "drizzle-orm";
import { getSocketServer } from "../socket-hub";
import { requireAuth } from "../middlewares/auth";

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

const router = Router();

// All portal routes require auth
router.use("/portal", requireAuth);

// ─── GET /api/portal/me ────────────────────────────────────────────────────────
router.get("/portal/me", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [user] = await db
    .select({ id: userTable.id, name: userTable.name, email: userTable.email, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!user) return res.status(404).json({ error: "User not found" });

  const [guardian] = await db
    .select()
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  return res.json({ ...user, guardian: guardian ?? null });
});

// ─── PATCH /api/portal/me ─────────────────────────────────────────────────────
const patchMeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  onboardingComplete: z.boolean().optional(),
  preferences: z.object({
    updateFrequency: z.string().optional(),
    contactMethod: z.string().optional(),
    expectations: z.array(z.string()).optional(),
    expectationsText: z.string().max(500).optional(),
    heardFrom: z.string().optional(),
  }).optional(),
});

router.patch("/portal/me", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const parsed = patchMeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { name, phone, password, onboardingComplete, preferences } = parsed.data;

  // Update user name if provided
  if (name) {
    await db.update(userTable).set({ name, updatedAt: new Date() }).where(eq(userTable.id, userId));
  }

  // Hash and update password if provided
  if (password) {
    const { hash, salt } = hashPassword(password);
    await db.update(userTable).set({ passwordHash: hash, passwordSalt: salt, updatedAt: new Date() }).where(eq(userTable.id, userId));
  }

  // Ensure guardian row exists
  let [guardian] = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  if (!guardian) {
    const [created] = await db.insert(guardianTable).values({ userId, email: req.user!.email }).returning();
    guardian = created;
  }

  // Update phone on guardian
  if (phone !== undefined) {
    await db.update(guardianTable)
      .set({ phoneNumber: phone, updatedAt: new Date() })
      .where(eq(guardianTable.id, guardian.id));
  }

  // Store preferences + onboardingComplete in athlete extraResponses if we have one
  if (preferences || onboardingComplete !== undefined) {
    const [athlete] = await db.select().from(athleteTable)
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
      await db.update(athleteTable)
        .set({
          extraResponses: next,
          ...(onboardingComplete ? { onboardingCompleted: true, onboardingCompletedAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(athleteTable.id, athlete.id));
    } else if (onboardingComplete) {
      // No athlete yet — mark guardian user onboarding done via user table
      await db.update(userTable)
        .set({ updatedAt: new Date() })
        .where(eq(userTable.id, userId));
    }
  }

  return res.json({ ok: true });
});

// ─── GET /api/portal/guardian/children ────────────────────────────────────────
router.get("/portal/guardian/children", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [guardian] = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  if (!guardian) return res.json({ id: null, children: [] });

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
    .where(eq(athleteTable.guardianId, guardian.id));

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

  return res.json({ id: guardian.id, children });
});

// ─── POST /api/portal/guardian/children ───────────────────────────────────────
const addChildSchema = z.object({
  name: z.string().min(2),
  age: z.number().int().min(4).max(99).optional(),
  athleteType: z.enum(["youth", "adult"]).default("youth"),
  sport: z.string().optional(),
  injuries: z.string().optional(),
  performanceGoals: z.string().optional(),
});

router.post("/portal/guardian/children", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const parsed = addChildSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });

  // Ensure guardian row
  let [guardian] = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  if (!guardian) {
    const [created] = await db.insert(guardianTable).values({ userId, email: req.user!.email }).returning();
    guardian = created;
  }

  const { name, age, athleteType, sport, injuries, performanceGoals } = parsed.data;

  const [athlete] = await db.insert(athleteTable).values({
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
  }).returning();

  return res.status(201).json({ id: athlete.id, name: athlete.name, guardianId: guardian.id });
});

// ─── GET /api/portal/guardian/children/:athleteId ─────────────────────────────
router.get("/portal/guardian/children/:athleteId", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);

  const [guardian] = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  if (!guardian) return res.status(404).json({ error: "Not found" });

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
    .where(and(eq(athleteTable.id, athleteId), eq(athleteTable.guardianId, guardian.id)))
    .limit(1);

  if (!athlete) return res.status(404).json({ error: "Child not found" });

  // Assigned programs
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

  const programs = assignments.map((a) => ({
    id: String(a.programId),
    name: a.programName ?? "Unknown",
    description: a.programDescription ?? null,
    tier: a.programType ?? null,
    status: a.status,
    completedAt: a.completedAt,
    totalSessions: 0,
    completedSessions: a.completedAt ? 1 : 0,
  }));

  // Recent session logs (last 10)
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

  return res.json({
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
  });
});

// ─── GET /api/portal/guardian/children/:athleteId/attendance ──────────────────
router.get("/portal/guardian/children/:athleteId/attendance", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);

  const [guardian] = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  if (!guardian) return res.status(403).json({ error: "Forbidden" });

  const [athlete] = await db.select({ id: athleteTable.id, userId: athleteTable.userId })
    .from(athleteTable)
    .where(and(eq(athleteTable.id, athleteId), eq(athleteTable.guardianId, guardian.id)))
    .limit(1);
  if (!athlete) return res.status(404).json({ error: "Not found" });

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

  return res.json({
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
  });
});

// ─── PATCH /api/portal/guardian/children/:athleteId/medical ───────────────────
router.patch("/portal/guardian/children/:athleteId/medical", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);

  const [guardian] = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  if (!guardian) return res.status(403).json({ error: "Forbidden" });

  const [athlete] = await db.select({ id: athleteTable.id })
    .from(athleteTable)
    .where(and(eq(athleteTable.id, athleteId), eq(athleteTable.guardianId, guardian.id)))
    .limit(1);
  if (!athlete) return res.status(404).json({ error: "Not found" });

  const { injuries } = z.object({ injuries: z.string().max(1000) }).parse(req.body);
  await db.update(athleteTable).set({ injuries, updatedAt: new Date() }).where(eq(athleteTable.id, athleteId));

  return res.json({ ok: true });
});

// ─── Feedback ─────────────────────────────────────────────────────────────────

// GET /api/portal/guardian/feedback — list threads for this guardian
router.get("/portal/guardian/feedback", async (req: Request, res: Response) => {
  const userId = req.user!.id;
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
  return res.json({ threads });
});

// POST /api/portal/guardian/feedback — open new thread
router.post("/portal/guardian/feedback", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { subject, message } = z.object({
    subject: z.string().min(2).max(255),
    message: z.string().min(1).max(2000),
  }).parse(req.body);

  const [thread] = await db.insert(guardianFeedbackTable).values({
    guardianUserId: userId,
    subject,
    status: "open",
  }).returning();

  const [reply] = await db.insert(guardianFeedbackReplyTable).values({
    feedbackId: thread.id,
    senderId: userId,
    content: message,
  }).returning();

  // Notify all admins/coaches via socket
  getSocketServer()?.to("admin:all").emit("guardian:feedback:new", {
    feedbackId: thread.id,
    subject,
    guardianUserId: userId,
  });

  return res.status(201).json({ id: thread.id, subject: thread.subject, status: thread.status, replies: [reply] });
});

// GET /api/portal/guardian/feedback/:id — thread + replies
router.get("/portal/guardian/feedback/:id", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const feedbackId = z.coerce.number().int().min(1).parse(req.params.id);

  const [thread] = await db.select().from(guardianFeedbackTable)
    .where(and(eq(guardianFeedbackTable.id, feedbackId), eq(guardianFeedbackTable.guardianUserId, userId)))
    .limit(1);
  if (!thread) return res.status(404).json({ error: "Not found" });

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

  return res.json({ ...thread, replies });
});

// POST /api/portal/guardian/feedback/:id/reply — guardian replies to thread
router.post("/portal/guardian/feedback/:id/reply", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const feedbackId = z.coerce.number().int().min(1).parse(req.params.id);

  const [thread] = await db.select({ id: guardianFeedbackTable.id })
    .from(guardianFeedbackTable)
    .where(and(eq(guardianFeedbackTable.id, feedbackId), eq(guardianFeedbackTable.guardianUserId, userId)))
    .limit(1);
  if (!thread) return res.status(404).json({ error: "Not found" });

  const { message } = z.object({ message: z.string().min(1).max(2000) }).parse(req.body);
  const [reply] = await db.insert(guardianFeedbackReplyTable).values({
    feedbackId,
    senderId: userId,
    content: message,
  }).returning();

  await db.update(guardianFeedbackTable).set({ updatedAt: new Date() }).where(eq(guardianFeedbackTable.id, feedbackId));

  getSocketServer()?.to("admin:all").emit("guardian:feedback:reply", { feedbackId, reply });

  return res.status(201).json(reply);
});

// ── Admin/coach: GET all feedback (for apps/web) ───────────────────────────────
router.get("/portal/admin/feedback", async (req: Request, res: Response) => {
  const role = req.user!.role;
  if (!["admin", "superAdmin", "coach", "team_coach", "program_coach"].includes(role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

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
    .orderBy(desc(guardianFeedbackTable.updatedAt));

  return res.json({ threads });
});

// GET /api/portal/admin/feedback/:id — full thread for admin/coach
router.get("/portal/admin/feedback/:id", async (req: Request, res: Response) => {
  const role = req.user!.role;
  if (!["admin", "superAdmin", "coach", "team_coach", "program_coach"].includes(role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const feedbackId = z.coerce.number().int().min(1).parse(req.params.id);

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
  if (!thread) return res.status(404).json({ error: "Not found" });

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

  return res.json({ ...thread, replies });
});

// POST /api/portal/admin/feedback/:id/reply — coach/admin replies
router.post("/portal/admin/feedback/:id/reply", async (req: Request, res: Response) => {
  const role = req.user!.role;
  if (!["admin", "superAdmin", "coach", "team_coach", "program_coach"].includes(role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const feedbackId = z.coerce.number().int().min(1).parse(req.params.id);

  const [thread] = await db.select({ id: guardianFeedbackTable.id, guardianUserId: guardianFeedbackTable.guardianUserId })
    .from(guardianFeedbackTable).where(eq(guardianFeedbackTable.id, feedbackId)).limit(1);
  if (!thread) return res.status(404).json({ error: "Not found" });

  const { message } = z.object({ message: z.string().min(1).max(2000) }).parse(req.body);
  const [reply] = await db.insert(guardianFeedbackReplyTable).values({
    feedbackId,
    senderId: req.user!.id,
    content: message,
  }).returning();

  await db.update(guardianFeedbackTable).set({ updatedAt: new Date() }).where(eq(guardianFeedbackTable.id, feedbackId));

  // Notify the guardian
  const io = getSocketServer();
  io?.to(`user:${thread.guardianUserId}`).emit("guardian:feedback:reply", { feedbackId, reply });

  return res.status(201).json(reply);
});

// PATCH /api/portal/admin/feedback/:id/status — mark resolved/open
router.patch("/portal/admin/feedback/:id/status", async (req: Request, res: Response) => {
  const role = req.user!.role;
  if (!["admin", "superAdmin", "coach", "team_coach", "program_coach"].includes(role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const feedbackId = z.coerce.number().int().min(1).parse(req.params.id);
  const { status } = z.object({ status: z.enum(["open", "resolved"]) }).parse(req.body);

  await db.update(guardianFeedbackTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(guardianFeedbackTable.id, feedbackId));

  return res.json({ ok: true });
});

// ─── GET /api/portal/guardian/billing-status ──────────────────────────────────
router.get("/portal/guardian/billing-status", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [guardian] = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  if (!guardian) return res.json({ currentPlan: null, children: [] });

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
    ? await db.select({
        id: subscriptionPlanTable.id,
        name: subscriptionPlanTable.name,
        tier: subscriptionPlanTable.tier,
        displayPrice: subscriptionPlanTable.displayPrice,
        monthlyPrice: subscriptionPlanTable.monthlyPrice,
        yearlyPrice: subscriptionPlanTable.yearlyPrice,
        billingInterval: subscriptionPlanTable.billingInterval,
        features: subscriptionPlanTable.features,
      }).from(subscriptionPlanTable).where(
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

  return res.json({ children });
});

export default router;
