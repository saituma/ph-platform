import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { submitOnboarding, getOnboardingStatus, getOnboardingConfig, updateAthletePhoto } from "../controllers/onboarding.controller";

const router = Router();

router.post("/onboarding", requireAuth, submitOnboarding);
router.get("/onboarding", requireAuth, getOnboardingStatus);
router.patch("/onboarding/athlete-photo", requireAuth, updateAthletePhoto);
router.get("/onboarding/config", getOnboardingConfig);

export default router;
