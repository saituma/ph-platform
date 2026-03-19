import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import {
  completeMyPlanExercise,
  completeMyPlanSession,
  getMyPremiumPlan,
  uncompleteMyPlanExercise,
} from "../controllers/athlete-plan.controller";

const router = Router();

router.get("/premium-plan", requireAuth, getMyPremiumPlan);
router.post("/premium-plan/exercises/:planExerciseId/complete", requireAuth, completeMyPlanExercise);
router.delete("/premium-plan/exercises/:planExerciseId/complete", requireAuth, uncompleteMyPlanExercise);
router.post("/premium-plan/sessions/:planSessionId/complete", requireAuth, completeMyPlanSession);

export default router;

