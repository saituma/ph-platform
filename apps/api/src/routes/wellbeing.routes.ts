import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  listWellbeingLogs,
  upsertWellbeingLog,
  deleteWellbeingLog,
  addWellbeingFeedback,
} from "../controllers/wellbeing.controller";

const router = Router();

router.get("/wellbeing/logs", requireAuth, listWellbeingLogs);
router.post("/wellbeing/logs", requireAuth, upsertWellbeingLog);
router.delete("/wellbeing/logs/:logId", requireAuth, deleteWellbeingLog);
router.post("/wellbeing/logs/:logId/feedback", requireAuth, addWellbeingFeedback);

export default router;
