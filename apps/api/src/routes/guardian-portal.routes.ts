import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import {
  getGuardianMe,
  patchGuardianMe,
  getGuardianChildren,
  addGuardianChild,
  getGuardianChild,
  getGuardianChildAttendance,
  patchGuardianChildMedical,
  listGuardianFeedback,
  createFeedbackThread,
  getFeedbackThread,
  replyToFeedback,
  listAdminFeedback,
  getAdminFeedbackThread,
  adminReplyToFeedback,
  updateFeedbackStatus,
  getGuardianBillingStatus,
  listInjuryLogs,
  addInjuryLog,
  resolveInjuryLog,
  deleteInjuryLog,
  listAdminInjuryLogs,
} from "../services/guardian-portal.service";
import { eq } from "drizzle-orm";
import { createChildCredentialsToken, verifyChildCredentialsToken } from "../lib/jwt";
import { createCheckoutSession } from "../services/billing/request.service";
import { sendChildCredentialsEmail } from "../lib/mailer/auth.mailer";
import { logger } from "../lib/logger";
import { db } from "../db";
import { userTable } from "../db/schema";

const router = Router();

const ADMIN_ROLES = ["admin", "superAdmin", "coach", "team_coach", "program_coach"];

// All portal routes require auth
router.use("/portal", requireAuth);

// ── Zod schemas ───────────────────────────────────────────────────────────────

const patchMeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  onboardingComplete: z.boolean().optional(),
  preferences: z
    .object({
      updateFrequency: z.string().optional(),
      contactMethod: z.string().optional(),
      expectations: z.array(z.string()).optional(),
      expectationsText: z.string().max(500).optional(),
      heardFrom: z.string().optional(),
    })
    .optional(),
});

const addChildSchema = z.object({
  name: z.string().min(2),
  age: z.number().int().min(4).max(99).optional(),
  athleteType: z.enum(["youth", "adult"]).default("youth"),
  sport: z.string().optional(),
  injuries: z.string().optional(),
  performanceGoals: z.string().optional(),
});

// ── GET /api/portal/me ────────────────────────────────────────────────────────
router.get("/portal/me", async (req: Request, res: Response) => {
  const result = await getGuardianMe(req.user!.id);
  if (!result) return res.status(404).json({ error: "User not found" });
  return res.json(result);
});

// ── PATCH /api/portal/me ──────────────────────────────────────────────────────
router.patch("/portal/me", async (req: Request, res: Response) => {
  const parsed = patchMeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const result = await patchGuardianMe(req.user!.id, req.user!.email, parsed.data);
  return res.json(result);
});

// ── GET /api/portal/guardian/children ─────────────────────────────────────────
router.get("/portal/guardian/children", async (req: Request, res: Response) => {
  const result = await getGuardianChildren(req.user!.id);
  return res.json(result);
});

// ── POST /api/portal/guardian/children ────────────────────────────────────────
router.post("/portal/guardian/children", async (req: Request, res: Response) => {
  const parsed = addChildSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });

  const result = await addGuardianChild(req.user!.id, req.user!.email, parsed.data);
  return res.status(201).json(result);
});

// ── POST /api/portal/guardian/children/checkout ──────────────────────────────
const checkoutChildSchema = z.object({
  name: z.string().min(2),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sport: z.string().optional(),
  injuries: z.string().optional(),
  performanceGoals: z.string().optional(),
  planId: z.number().int().min(1),
  billingCycle: z.enum(["weekly", "monthly", "six_months", "yearly"]).default("monthly"),
});

router.post("/portal/guardian/children/checkout", async (req: Request, res: Response) => {
  try {
    const parsed = checkoutChildSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
    }

    const { name, birthDate, sport, injuries, performanceGoals, planId, billingCycle } = parsed.data;

    // 1. Create the child user + athlete record
    const child = await addGuardianChild(req.user!.id, req.user!.email, {
      name,
      birthDate,
      athleteType: "youth",
      sport,
      injuries,
      performanceGoals,
    });

    // 2. Create a credentials token so the success page can retrieve them
    const credentialsToken = await createChildCredentialsToken({
      childEmail: child.childEmail,
      tempPassword: child.tempPassword,
      childName: child.name,
      athleteId: child.id,
    });

    // 3. Create a Stripe checkout session for the child's plan
    const successUrl = `https://phperformance.uk/portal/add-child-success?session_id={CHECKOUT_SESSION_ID}&child_id=${child.id}&cred=${encodeURIComponent(credentialsToken)}`;

    const { session } = await createCheckoutSession({
      userId: req.user!.id,
      userEmail: req.user!.email,
      athleteId: child.id,
      planId,
      billingCycle,
      successUrl,
    });

    // 4. Send credentials email to the guardian
    try {
      const [parentUser] = await db
        .select({ name: userTable.name })
        .from(userTable)
        .where(eq(userTable.id, req.user!.id))
        .limit(1);
      await sendChildCredentialsEmail({
        to: req.user!.email,
        guardianName: parentUser?.name ?? "Parent",
        childName: child.name,
        childEmail: child.childEmail,
        tempPassword: child.tempPassword,
      });
    } catch (mailErr) {
      logger.error({ err: mailErr }, "[guardian] Child credentials email failed");
    }

    return res.status(201).json({
      checkoutUrl: session.url,
      childEmail: child.childEmail,
      childName: child.name,
    });
  } catch (error: any) {
    logger.error({ err: error }, "[guardian] children/checkout failed");
    const status = error?.statusCode ?? error?.status ?? 500;
    const message = typeof error?.message === "string" ? error.message : "Failed to create checkout";
    return res.status(status).json({ error: message });
  }
});

// ── GET /api/portal/guardian/children/credentials/:token ────────────────────
router.get("/portal/guardian/children/credentials/:token", async (req: Request, res: Response) => {
  try {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const { childEmail, tempPassword, childName, athleteId } = await verifyChildCredentialsToken(token);
    return res.json({ email: childEmail, temporaryPassword: tempPassword, childName, athleteId });
  } catch {
    return res.status(401).json({ error: "Invalid or expired credentials token" });
  }
});

// ── GET /api/portal/guardian/children/:athleteId ──────────────────────────────
router.get("/portal/guardian/children/:athleteId", async (req: Request, res: Response) => {
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const result = await getGuardianChild(req.user!.id, athleteId);

  if (result === "forbidden") return res.status(403).json({ error: "Forbidden" });
  if (result === null) return res.status(404).json({ error: "Child not found" });
  return res.json(result);
});

// ── GET /api/portal/guardian/children/:athleteId/attendance ───────────────────
router.get("/portal/guardian/children/:athleteId/attendance", async (req: Request, res: Response) => {
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const result = await getGuardianChildAttendance(req.user!.id, athleteId);

  if (result === "forbidden") return res.status(403).json({ error: "Forbidden" });
  if (result === null) return res.status(404).json({ error: "Not found" });
  return res.json(result);
});

// ── PATCH /api/portal/guardian/children/:athleteId/medical ───────────────────
router.patch("/portal/guardian/children/:athleteId/medical", async (req: Request, res: Response) => {
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const { injuries } = z.object({ injuries: z.string().max(1000) }).parse(req.body);

  const result = await patchGuardianChildMedical(req.user!.id, athleteId, injuries);

  if (result === "forbidden") return res.status(403).json({ error: "Forbidden" });
  if (result === null) return res.status(404).json({ error: "Not found" });
  return res.json(result);
});

// ── GET /api/portal/guardian/feedback ─────────────────────────────────────────
router.get("/portal/guardian/feedback", async (req: Request, res: Response) => {
  const result = await listGuardianFeedback(req.user!.id);
  return res.json(result);
});

// ── POST /api/portal/guardian/feedback ────────────────────────────────────────
router.post("/portal/guardian/feedback", async (req: Request, res: Response) => {
  const { subject, message } = z
    .object({
      subject: z.string().min(2).max(255),
      message: z.string().min(1).max(2000),
    })
    .parse(req.body);

  const result = await createFeedbackThread(req.user!.id, subject, message);
  return res.status(201).json(result);
});

// ── GET /api/portal/guardian/feedback/:id ────────────────────────────────────
router.get("/portal/guardian/feedback/:id", async (req: Request, res: Response) => {
  const feedbackId = z.coerce.number().int().min(1).parse(req.params.id);
  const result = await getFeedbackThread(req.user!.id, feedbackId);

  if (!result) return res.status(404).json({ error: "Not found" });
  return res.json(result);
});

// ── POST /api/portal/guardian/feedback/:id/reply ──────────────────────────────
router.post("/portal/guardian/feedback/:id/reply", async (req: Request, res: Response) => {
  const feedbackId = z.coerce.number().int().min(1).parse(req.params.id);
  const { message } = z.object({ message: z.string().min(1).max(2000) }).parse(req.body);

  const result = await replyToFeedback(req.user!.id, feedbackId, message);

  if (!result) return res.status(404).json({ error: "Not found" });
  return res.status(201).json(result);
});

// ── GET /api/portal/admin/feedback ───────────────────────────────────────────
router.get("/portal/admin/feedback", async (req: Request, res: Response) => {
  if (!ADMIN_ROLES.includes(req.user!.role)) return res.status(403).json({ error: "Forbidden" });
  const result = await listAdminFeedback();
  return res.json(result);
});

// ── GET /api/portal/admin/feedback/:id ───────────────────────────────────────
router.get("/portal/admin/feedback/:id", async (req: Request, res: Response) => {
  if (!ADMIN_ROLES.includes(req.user!.role)) return res.status(403).json({ error: "Forbidden" });

  const feedbackId = z.coerce.number().int().min(1).parse(req.params.id);
  const result = await getAdminFeedbackThread(feedbackId);

  if (!result) return res.status(404).json({ error: "Not found" });
  return res.json(result);
});

// ── POST /api/portal/admin/feedback/:id/reply ────────────────────────────────
router.post("/portal/admin/feedback/:id/reply", async (req: Request, res: Response) => {
  if (!ADMIN_ROLES.includes(req.user!.role)) return res.status(403).json({ error: "Forbidden" });

  const feedbackId = z.coerce.number().int().min(1).parse(req.params.id);
  const { message } = z.object({ message: z.string().min(1).max(2000) }).parse(req.body);

  const result = await adminReplyToFeedback(req.user!.id, feedbackId, message);

  if (!result) return res.status(404).json({ error: "Not found" });
  return res.status(201).json(result);
});

// ── PATCH /api/portal/admin/feedback/:id/status ──────────────────────────────
router.patch("/portal/admin/feedback/:id/status", async (req: Request, res: Response) => {
  if (!ADMIN_ROLES.includes(req.user!.role)) return res.status(403).json({ error: "Forbidden" });

  const feedbackId = z.coerce.number().int().min(1).parse(req.params.id);
  const { status } = z.object({ status: z.enum(["open", "resolved"]) }).parse(req.body);

  const result = await updateFeedbackStatus(feedbackId, status);
  return res.json(result);
});

// ── GET /api/portal/guardian/billing-status ───────────────────────────────────
router.get("/portal/guardian/billing-status", async (req: Request, res: Response) => {
  const result = await getGuardianBillingStatus(req.user!.id);
  return res.json(result);
});

// ── Injury logs (guardian) ────────────────────────────────────────────────────

const injuryLogSchema = z.object({
  description: z.string().min(2).max(1000),
  bodyPart: z.string().max(100).optional(),
  severity: z.enum(["mild", "moderate", "severe"]),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).optional(),
});

router.get("/portal/guardian/children/:athleteId/injury-logs", async (req: Request, res: Response) => {
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const result = await listInjuryLogs(req.user!.id, athleteId);
  if (result === "forbidden") return res.status(403).json({ error: "Forbidden" });
  return res.json(result);
});

router.post("/portal/guardian/children/:athleteId/injury-logs", async (req: Request, res: Response) => {
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const data = injuryLogSchema.parse(req.body);
  const result = await addInjuryLog(req.user!.id, athleteId, data);
  if (result === "forbidden") return res.status(403).json({ error: "Forbidden" });
  return res.status(201).json(result);
});

router.patch("/portal/guardian/children/:athleteId/injury-logs/:logId/resolve", async (req: Request, res: Response) => {
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const logId = z.coerce.number().int().min(1).parse(req.params.logId);
  const { resolvedAt } = z.object({ resolvedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.body);
  const result = await resolveInjuryLog(req.user!.id, athleteId, logId, resolvedAt);
  if (result === "forbidden") return res.status(403).json({ error: "Forbidden" });
  if (!result) return res.status(404).json({ error: "Not found" });
  return res.json(result);
});

router.delete("/portal/guardian/children/:athleteId/injury-logs/:logId", async (req: Request, res: Response) => {
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const logId = z.coerce.number().int().min(1).parse(req.params.logId);
  const result = await deleteInjuryLog(req.user!.id, athleteId, logId);
  if (result === "forbidden") return res.status(403).json({ error: "Forbidden" });
  if (!result) return res.status(404).json({ error: "Not found" });
  return res.json(result);
});

// ── Injury logs (admin) ───────────────────────────────────────────────────────

router.get("/portal/admin/children/:athleteId/injury-logs", async (req: Request, res: Response) => {
  if (!ADMIN_ROLES.includes(req.user!.role)) return res.status(403).json({ error: "Forbidden" });
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const logs = await listAdminInjuryLogs(athleteId);
  return res.json(logs);
});

export default router;
