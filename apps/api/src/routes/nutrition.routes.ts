import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { getTargets, updateTargets, listLogs, upsertLog, provideFeedback } from "../controllers/nutrition.controller";

const router = Router();

// Targets
router.get("/nutrition/targets/:userId", requireAuth, getTargets);
router.put("/nutrition/targets/:userId", requireAuth, updateTargets);

// Logs
router.get("/nutrition/logs", requireAuth, listLogs);
router.post("/nutrition/logs", requireAuth, upsertLog);
router.post("/nutrition/logs/:logId/feedback", requireAuth, provideFeedback);

export default router;
