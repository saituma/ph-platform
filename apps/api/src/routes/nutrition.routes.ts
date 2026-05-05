import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import {
  getTargets,
  getNutritionOnboardingProfile,
  upsertNutritionOnboardingProfile,
  updateTargets,
  listLogs,
  upsertLog,
  provideFeedback,
  getReminderSettings,
  updateReminderSettings,
} from "../controllers/nutrition.controller";

const router = Router();

// Targets
router.get("/nutrition/targets/:userId", requireAuth, getTargets);
router.put("/nutrition/targets/:userId", requireAuth, updateTargets);

// Nutrition onboarding profile
router.get("/nutrition/onboarding-profile", requireAuth, getNutritionOnboardingProfile);
router.put("/nutrition/onboarding-profile", requireAuth, upsertNutritionOnboardingProfile);

// Logs
router.get("/nutrition/logs", requireAuth, listLogs);
router.post("/nutrition/logs", requireAuth, upsertLog);
router.post("/nutrition/logs/:logId/feedback", requireAuth, provideFeedback);

// Reminder settings (per-user)
router.get("/nutrition/reminder-settings", requireAuth, getReminderSettings);
router.put("/nutrition/reminder-settings", requireAuth, updateReminderSettings);

export default router;
