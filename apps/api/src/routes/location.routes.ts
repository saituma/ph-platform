import { Router } from "express";

import { recordLocation, listUserLocations } from "../controllers/location.controller";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";

const router = Router();

router.post("/location", requireAuth, recordLocation);
router.get("/admin/user-locations", requireAuth, requireRole(["coach", "admin", "superAdmin"]), listUserLocations);

export default router;
