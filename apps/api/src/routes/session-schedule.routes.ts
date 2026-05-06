import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import {
  checkInSession,
  connectCalendarAdmin,
  createTemplateAdmin,
  disconnectCalendarAdmin,
  getGoogleCalendarOAuthStartAdmin,
  googleCalendarOAuthCallback,
  getCalendarConnectionAdmin,
  listGoogleCalendarsAdmin,
  listMySessions,
  listSessionsAdmin,
  listTemplatesAdmin,
  markAttendanceAdmin,
  materializeTemplateAdmin,
  selectGoogleCalendarAdmin,
} from "../controllers/session-schedule.controller";

const router = Router();

router.get("/sessions/my", requireAuth, listMySessions);
router.post("/sessions/:sessionId/check-in", requireAuth, checkInSession);

router.get("/admin/session-templates", requireAuth, requireRole(["coach", "admin", "superAdmin"]), listTemplatesAdmin);
router.post("/admin/session-templates", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createTemplateAdmin);
router.post(
  "/admin/session-templates/:templateId/materialize",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  materializeTemplateAdmin,
);
router.get("/admin/scheduled-sessions", requireAuth, requireRole(["coach", "admin", "superAdmin"]), listSessionsAdmin);
router.post(
  "/admin/scheduled-sessions/:sessionId/attendance",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  markAttendanceAdmin,
);
router.get("/admin/google-calendar/connection", requireAuth, requireRole(["coach", "admin", "superAdmin"]), getCalendarConnectionAdmin);
router.get("/admin/google-calendar/oauth/start", requireAuth, requireRole(["coach", "admin", "superAdmin"]), getGoogleCalendarOAuthStartAdmin);
router.get("/google-calendar/oauth/callback", googleCalendarOAuthCallback);
router.post("/admin/google-calendar/connection", requireAuth, requireRole(["coach", "admin", "superAdmin"]), connectCalendarAdmin);
router.get("/admin/google-calendar/calendars", requireAuth, requireRole(["coach", "admin", "superAdmin"]), listGoogleCalendarsAdmin);
router.post("/admin/google-calendar/select", requireAuth, requireRole(["coach", "admin", "superAdmin"]), selectGoogleCalendarAdmin);
router.delete("/admin/google-calendar/connection", requireAuth, requireRole(["coach", "admin", "superAdmin"]), disconnectCalendarAdmin);

export default router;
