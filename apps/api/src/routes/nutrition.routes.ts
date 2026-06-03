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
// Read is open to the owner + training staff (authz enforced in-controller) so a
// coach/nutritionist without a personal plan can still review an athlete's nutrition.
router.get("/nutrition/targets/:userId", requireAuth, getTargets);
router.put("/nutrition/targets/:userId", requireAuth, requireFeature("nutrition_logging"), updateTargets);

// Nutrition onboarding profile
router.get(
  "/nutrition/onboarding-profile",
  requireAuth,
  requireFeature("nutrition_logging"),
  getNutritionOnboardingProfile,
);
router.put(
  "/nutrition/onboarding-profile",
  requireAuth,
  requireFeature("nutrition_logging"),
  upsertNutritionOnboardingProfile,
);

// Logs
// Read + coach feedback are open to staff (authz enforced in-controller); only the
// athlete-facing write keeps the plan gate. Matches wellbeing/sleep/progress.
router.get("/nutrition/logs", requireAuth, listLogs);
router.post("/nutrition/logs", requireAuth, requireFeature("nutrition_logging"), upsertLog);
router.post("/nutrition/logs/:logId/feedback", requireAuth, provideFeedback);

// Reminder settings (per-user)
router.get("/nutrition/reminder-settings", requireAuth, requireFeature("nutrition_logging"), getReminderSettings);
router.put("/nutrition/reminder-settings", requireAuth, requireFeature("nutrition_logging"), updateReminderSettings);

export default router;
