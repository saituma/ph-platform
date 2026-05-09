import { Router } from "express";
import {
  getBetaTesterStats,
  listBetaTestersAdmin,
  submitBetaTester,
} from "../controllers/beta-tester.controller";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import { rateLimiters } from "../lib/rateLimiter";

const router = Router();

router.post("/beta-testers", rateLimiters.auth, submitBetaTester);

const adminAuth = [requireAuth, requireRole(["coach", "admin", "superAdmin"])] as const;
router.get("/admin/beta-testers", ...adminAuth, listBetaTestersAdmin);
router.get("/admin/beta-testers/stats", ...adminAuth, getBetaTesterStats);

export default router;
