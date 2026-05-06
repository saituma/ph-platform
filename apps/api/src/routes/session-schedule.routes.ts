import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import {
  checkInSession,
  connectCalendarAdmin,
  createTemplateAdmin,
  disconnectCalendarAdmin,
  getCalendarConnectionAdmin,
  listMySessions,
  listSessionsAdmin,
  listTemplatesAdmin,
  markAttendanceAdmin,
  materializeTemplateAdmin,
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
router.post("/admin/google-calendar/connection", requireAuth, requireRole(["coach", "admin", "superAdmin"]), connectCalendarAdmin);
router.delete("/admin/google-calendar/connection", requireAuth, requireRole(["coach", "admin", "superAdmin"]), disconnectCalendarAdmin);

export default router;
