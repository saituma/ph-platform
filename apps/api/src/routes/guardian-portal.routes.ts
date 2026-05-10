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
} from "../services/guardian-portal.service";

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

export default router;
