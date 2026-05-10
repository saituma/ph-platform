import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import { rateLimiters } from "../lib/rateLimiter";
import {
  cancelScheduledSessionAdmin,
  checkInSession,
  connectCalendarAdmin,
  createTemplateAdmin,
  deleteScheduledSessionAdmin,
  deleteSessionTemplateAdmin,
  disconnectCalendarAdmin,
  getGoogleCalendarOAuthStartAdmin,
  googleCalendarOAuthCallback,
  getCalendarConnectionAdmin,
  listGoogleCalendarsAdmin,
  listGoogleCalendarEventsAdmin,
  listMySessions,
  listSessionsAdmin,
  listTemplatesAdmin,
  markAttendanceAdmin,
  materializeTemplateAdmin,
  generateQrToken,
  getAttendanceStatsAdmin,
  scanQrToken,
  selectGoogleCalendarAdmin,
  updateScheduledSessionAdmin,
  updateSessionTemplateAdmin,
} from "../controllers/session-schedule.controller";

const router = Router();

router.get("/sessions/my", requireAuth, listMySessions);
router.post("/sessions/:sessionId/check-in", requireAuth, rateLimiters.api, checkInSession);
router.post("/admin/scheduled-sessions/attendance/qr/generate", requireAuth, requireRole(["coach", "admin", "superAdmin"]), rateLimiters.api, generateQrToken);
router.post("/sessions/attendance/qr/scan", requireAuth, rateLimiters.api, scanQrToken);

router.get("/admin/session-templates", requireAuth, requireRole(["coach", "admin", "superAdmin"]), listTemplatesAdmin);
router.post("/admin/session-templates", requireAuth, requireRole(["coach", "admin", "superAdmin"]), rateLimiters.api, createTemplateAdmin);
router.patch("/admin/session-templates/:templateId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), rateLimiters.api, updateSessionTemplateAdmin);
router.delete("/admin/session-templates/:templateId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), rateLimiters.api, deleteSessionTemplateAdmin);
router.post(
  "/admin/session-templates/:templateId/materialize",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  rateLimiters.api,
  materializeTemplateAdmin,
);
router.get("/admin/scheduled-sessions", requireAuth, requireRole(["coach", "admin", "superAdmin"]), listSessionsAdmin);
router.patch("/admin/scheduled-sessions/:sessionId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), rateLimiters.api, updateScheduledSessionAdmin);
router.delete("/admin/scheduled-sessions/:sessionId", requireAuth, requireRole(["coach", "admin", "superAdmin"]), rateLimiters.api, deleteScheduledSessionAdmin);
router.post("/admin/scheduled-sessions/:sessionId/cancel", requireAuth, requireRole(["coach", "admin", "superAdmin"]), rateLimiters.api, cancelScheduledSessionAdmin);
router.post(
  "/admin/scheduled-sessions/:sessionId/attendance",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  rateLimiters.api,
  markAttendanceAdmin,
);
router.get("/admin/attendance-stats", requireAuth, requireRole(["coach", "admin", "superAdmin"]), getAttendanceStatsAdmin);
router.get("/admin/google-calendar/connection", requireAuth, requireRole(["coach", "admin", "superAdmin"]), getCalendarConnectionAdmin);
router.get("/admin/google-calendar/oauth/start", requireAuth, requireRole(["coach", "admin", "superAdmin"]), getGoogleCalendarOAuthStartAdmin);
router.get("/google-calendar/oauth/callback", googleCalendarOAuthCallback);
router.post("/admin/google-calendar/connection", requireAuth, requireRole(["coach", "admin", "superAdmin"]), rateLimiters.api, connectCalendarAdmin);
router.get("/admin/google-calendar/calendars", requireAuth, requireRole(["coach", "admin", "superAdmin"]), listGoogleCalendarsAdmin);
router.get("/admin/google-calendar/events", requireAuth, requireRole(["coach", "admin", "superAdmin"]), listGoogleCalendarEventsAdmin);
router.post("/admin/google-calendar/select", requireAuth, requireRole(["coach", "admin", "superAdmin"]), rateLimiters.api, selectGoogleCalendarAdmin);
router.delete("/admin/google-calendar/connection", requireAuth, requireRole(["coach", "admin", "superAdmin"]), rateLimiters.api, disconnectCalendarAdmin);

export default router;
