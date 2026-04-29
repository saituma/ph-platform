import { Router } from "express";

import { listAppFeedbackAdmin, submitAppFeedback } from "../controllers/support.controller";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";

const router = Router();

router.post("/support/app-feedback", requireAuth, submitAppFeedback);
router.get(
  "/admin/app-feedback",
  requireAuth,
  requireRole(["coach", "admin", "superAdmin"]),
  listAppFeedbackAdmin,
);

export default router;
