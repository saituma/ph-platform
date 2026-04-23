import { Router } from "express";

import { recordLocation, listUserLocations, listTeamLocationsHandler } from "../controllers/location.controller";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";

const router = Router();

router.post("/location", requireAuth, recordLocation);
router.get("/location/team", requireAuth, listTeamLocationsHandler);
router.get("/admin/user-locations", requireAuth, requireRole(["coach", "admin", "superAdmin"]), listUserLocations);

export default router;
