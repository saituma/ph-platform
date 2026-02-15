import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { submitOnboarding, getOnboardingStatus, getOnboardingConfig } from "../controllers/onboarding.controller";

const router = Router();

router.post("/onboarding", requireAuth, submitOnboarding);
router.get("/onboarding", requireAuth, getOnboardingStatus);
router.get("/onboarding/config", getOnboardingConfig);

export default router;
