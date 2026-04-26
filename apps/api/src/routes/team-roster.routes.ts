import { Router } from "express";

import {
  getTeamRoster,
  getTeamRosterAthlete,
  patchTeamRosterAthleteHandler,
  patchTeamRosterEmailSlug,
  postTeamRosterAthlete,
  postTeamRosterAthleteResetPassword,
} from "../controllers/team-roster.controller";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";

const router = Router();

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
router.post("/team/roster/athletes", requireAuth, requireRole(["coach", "admin", "superAdmin"]), postTeamRosterAthlete);
router.patch("/team/roster/email-slug", requireAuth, requireRole(["coach", "admin", "superAdmin"]), patchTeamRosterEmailSlug);
router.patch(
  "/team/roster/athletes/:athleteId",
  requireAuth,
  requireRole(["coach", "team_coach", "admin", "superAdmin"]),
  patchTeamRosterAthleteHandler,
);

export default router;
