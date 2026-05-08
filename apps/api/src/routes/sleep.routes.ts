import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  listSleepLogs,
  upsertSleepLog,
  deleteSleepLog,
  addSleepFeedback,
} from "../controllers/sleep.controller";

const router = Router();

router.get("/sleep/logs", requireAuth, listSleepLogs);
router.post("/sleep/logs", requireAuth, upsertSleepLog);
router.delete("/sleep/logs/:logId", requireAuth, deleteSleepLog);
router.post("/sleep/logs/:logId/feedback", requireAuth, addSleepFeedback);

export default router;
