import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import {
  listProgrammesHandler,
  getProgrammeFullHandler,
  createProgrammeHandler,
  updateProgrammeHandler,
  deleteProgrammeHandler,
  publishProgrammeHandler,
  createWeekHandler,
  updateWeekHandler,
  deleteWeekHandler,
  createWeekTypeHandler,
  updateWeekTypeHandler,
  deleteWeekTypeHandler,
  createDaySessionHandler,
  updateDaySessionHandler,
  deleteDaySessionHandler,
  addExerciseHandler,
  updateExerciseHandler,
  deleteExerciseHandler,
  reorderExercisesHandler,
  listAssignmentsHandler,
  assignAthletesHandler,
  unassignAthleteHandler,
  listAllAthletesHandler,
  getOverviewHandler,
  getWeekTypesHandler,
  selectWeekTypeHandler,
  getWeekSessionsHandler,
  getDaySessionDetailHandler,
  completeSessionHandler,
} from "../controllers/preseason-programme.controller";

const router = Router();

// ─── Admin ────────────────────────────────────────────────────────────────────

router.get(
  "/preseason-programme/admin/programmes",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  listProgrammesHandler,
);
router.get(
  "/preseason-programme/admin/programmes/:id/full",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  getProgrammeFullHandler,
);
router.post(
  "/preseason-programme/admin/programmes",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  createProgrammeHandler,
);
router.put(
  "/preseason-programme/admin/programmes/:id",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  updateProgrammeHandler,
);
router.delete(
  "/preseason-programme/admin/programmes/:id",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  deleteProgrammeHandler,
);
router.put(
  "/preseason-programme/admin/programmes/:id/publish",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  publishProgrammeHandler,
);

router.post(
  "/preseason-programme/admin/weeks",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  createWeekHandler,
);
router.put(
  "/preseason-programme/admin/weeks/:id",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  updateWeekHandler,
);
router.delete(
  "/preseason-programme/admin/weeks/:id",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  deleteWeekHandler,
);

router.post(
  "/preseason-programme/admin/week-types",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  createWeekTypeHandler,
);
router.put(
  "/preseason-programme/admin/week-types/:id",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  updateWeekTypeHandler,
);
router.delete(
  "/preseason-programme/admin/week-types/:id",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  deleteWeekTypeHandler,
);

router.post(
  "/preseason-programme/admin/day-sessions",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  createDaySessionHandler,
);
router.put(
  "/preseason-programme/admin/day-sessions/:id",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  updateDaySessionHandler,
);
router.delete(
  "/preseason-programme/admin/day-sessions/:id",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  deleteDaySessionHandler,
);
router.patch(
  "/preseason-programme/admin/day-sessions/:id/exercises/reorder",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  reorderExercisesHandler,
);

router.post(
  "/preseason-programme/admin/day-session-exercises",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  addExerciseHandler,
);
router.put(
  "/preseason-programme/admin/day-session-exercises/:id",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  updateExerciseHandler,
);
router.delete(
  "/preseason-programme/admin/day-session-exercises/:id",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  deleteExerciseHandler,
);

router.get(
  "/preseason-programme/admin/programmes/:programmeId/assignments",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  listAssignmentsHandler,
);
router.post(
  "/preseason-programme/admin/programmes/:programmeId/assignments",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  assignAthletesHandler,
);
router.delete(
  "/preseason-programme/admin/programmes/:programmeId/assignments/:athleteId",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  unassignAthleteHandler,
);
router.get(
  "/preseason-programme/admin/athletes",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  listAllAthletesHandler,
);

// ─── Athlete (mobile) ─────────────────────────────────────────────────────────

router.get("/preseason-programme/mobile", requireAuth, getOverviewHandler);
router.get("/preseason-programme/mobile/weeks/:weekId/types", requireAuth, getWeekTypesHandler);
router.post("/preseason-programme/mobile/weeks/:weekId/select", requireAuth, selectWeekTypeHandler);
router.get("/preseason-programme/mobile/weeks/:weekId/sessions", requireAuth, getWeekSessionsHandler);
router.get("/preseason-programme/mobile/day-sessions/:daySessionId", requireAuth, getDaySessionDetailHandler);
router.post("/preseason-programme/mobile/day-sessions/:daySessionId/complete", requireAuth, completeSessionHandler);

export default router;
