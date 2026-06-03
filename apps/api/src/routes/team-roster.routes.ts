import { Router } from "express";

import {
  getTeamRoster,
  getTeamRosterAthlete,
  getTeamRosterAthleteAchievements,
  getTeamRosterAthleteAttendance,
  getTeamRosterAthleteBookings,
  getTeamRosterAthleteEngagement,
  getTeamRosterAthleteInjuries,
  getTeamRosterAthleteNutrition,
  getTeamRosterAthleteProgress,
  getTeamRosterAthleteRuns,
  getTeamRosterAthleteTraining,
  getTeamRosterAthleteWellbeing,
  patchTeamRosterAthleteHandler,
  patchTeamRosterEmailSlug,
  postTeamRosterAthlete,
  postTeamRosterAthleteResetPassword,
} from "../controllers/team-roster.controller";
import {
  addTeamManagerForManager,
  listTeamManagersForManager,
  removeTeamManagerForManager,
} from "../controllers/team-managers.controller";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";

const router = Router();

const managerRoles = ["coach", "team_coach", "admin", "superAdmin"] as const;

router.get("/team/roster", requireAuth, requireRole(["coach", "team_coach", "admin", "superAdmin"]), getTeamRoster);
router.get(
  "/team/roster/athletes/:athleteId",
  requireAuth,
  requireRole(["coach", "team_coach", "admin", "superAdmin"]),
  getTeamRosterAthlete,
);
router.post(
  "/team/roster/athletes/:athleteId/reset-password",
  requireAuth,
  requireRole(["coach", "team_coach", "admin", "superAdmin"]),
  postTeamRosterAthleteResetPassword,
);

const readManagerRoles = ["coach", "team_coach", "admin", "superAdmin"] as const;
router.get(
  "/team/roster/athletes/:athleteId/runs",
  requireAuth,
  requireRole([...readManagerRoles]),
  getTeamRosterAthleteRuns,
);
router.get(
  "/team/roster/athletes/:athleteId/progress",
  requireAuth,
  requireRole([...readManagerRoles]),
  getTeamRosterAthleteProgress,
);
router.get(
  "/team/roster/athletes/:athleteId/attendance",
  requireAuth,
  requireRole([...readManagerRoles]),
  getTeamRosterAthleteAttendance,
);
router.get(
  "/team/roster/athletes/:athleteId/training",
  requireAuth,
  requireRole([...readManagerRoles]),
  getTeamRosterAthleteTraining,
);
router.get(
  "/team/roster/athletes/:athleteId/achievements",
  requireAuth,
  requireRole([...readManagerRoles]),
  getTeamRosterAthleteAchievements,
);
router.get(
  "/team/roster/athletes/:athleteId/injuries",
  requireAuth,
  requireRole([...readManagerRoles]),
  getTeamRosterAthleteInjuries,
);
router.get(
  "/team/roster/athletes/:athleteId/wellbeing",
  requireAuth,
  requireRole([...readManagerRoles]),
  getTeamRosterAthleteWellbeing,
);
router.get(
  "/team/roster/athletes/:athleteId/bookings",
  requireAuth,
  requireRole([...readManagerRoles]),
  getTeamRosterAthleteBookings,
);
router.get(
  "/team/roster/athletes/:athleteId/nutrition",
  requireAuth,
  requireRole([...readManagerRoles]),
  getTeamRosterAthleteNutrition,
);
router.get(
  "/team/roster/athletes/:athleteId/engagement",
  requireAuth,
  requireRole([...readManagerRoles]),
  getTeamRosterAthleteEngagement,
);
router.post("/team/roster/athletes", requireAuth, requireRole(["coach", "admin", "superAdmin"]), postTeamRosterAthlete);
router.patch(
  "/team/roster/email-slug",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  patchTeamRosterEmailSlug,
);
router.patch(
  "/team/roster/athletes/:athleteId",
  requireAuth,
  requireRole(["coach", "team_coach", "admin", "superAdmin"]),
  patchTeamRosterAthleteHandler,
);

router.get("/team/managers", requireAuth, requireRole([...managerRoles]), listTeamManagersForManager);
router.post("/team/managers", requireAuth, requireRole([...managerRoles]), addTeamManagerForManager);
router.delete("/team/managers/:userId", requireAuth, requireRole([...managerRoles]), removeTeamManagerForManager);

export default router;
