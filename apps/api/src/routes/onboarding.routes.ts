import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import {
  submitOnboarding,
  submitYouthBasic,
  submitAdultBasic,
  getOnboardingStatus,
  getOnboardingConfig,
  getPhpPlusTabs,
  updateAthletePhoto,
  listGuardianAthletes,
  selectActiveAthlete,
  getGuardianAthlete,
  updateGuardianAthlete,
} from "../controllers/onboarding.controller";

const router = Router();

router.post("/onboarding", requireAuth, submitOnboarding);
router.post("/onboarding/youth-basic", requireAuth, submitYouthBasic);
router.post("/onboarding/adult-basic", requireAuth, submitAdultBasic);
router.get("/onboarding", requireAuth, getOnboardingStatus);
router.get("/onboarding/athletes", requireAuth, listGuardianAthletes);
router.get("/onboarding/athletes/:athleteId", requireAuth, getGuardianAthlete);
router.patch("/onboarding/athletes/:athleteId", requireAuth, updateGuardianAthlete);
router.post("/onboarding/select-athlete", requireAuth, selectActiveAthlete);
router.patch("/onboarding/athlete-photo", requireAuth, updateAthletePhoto);
router.get("/onboarding/config", getOnboardingConfig);
router.get("/onboarding/php-plus-tabs", getPhpPlusTabs);

export default router;
