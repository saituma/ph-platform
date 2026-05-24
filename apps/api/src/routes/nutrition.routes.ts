import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireFeature } from "../middlewares/feature";
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
router.get("/nutrition/targets/:userId", requireAuth, requireFeature("nutrition_logging"), getTargets);
router.put("/nutrition/targets/:userId", requireAuth, requireFeature("nutrition_logging"), updateTargets);

// Nutrition onboarding profile
router.get("/nutrition/onboarding-profile", requireAuth, requireFeature("nutrition_logging"), getNutritionOnboardingProfile);
router.put("/nutrition/onboarding-profile", requireAuth, requireFeature("nutrition_logging"), upsertNutritionOnboardingProfile);

// Logs
router.get("/nutrition/logs", requireAuth, requireFeature("nutrition_logging"), listLogs);
router.post("/nutrition/logs", requireAuth, requireFeature("nutrition_logging"), upsertLog);
router.post("/nutrition/logs/:logId/feedback", requireAuth, requireFeature("nutrition_logging"), provideFeedback);

// Reminder settings (per-user)
router.get("/nutrition/reminder-settings", requireAuth, requireFeature("nutrition_logging"), getReminderSettings);
router.put("/nutrition/reminder-settings", requireAuth, requireFeature("nutrition_logging"), updateReminderSettings);

export default router;
