import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireFeature } from "../middlewares/feature";
import { syncRuns, listRuns, deleteRun } from "../controllers/runs.controller";
import { listGoalsForAthlete } from "../controllers/tracking-goals.controller";

const router = Router();

router.post("/runs/sync", requireAuth, requireFeature("run_tracking"), syncRuns);
router.get("/runs", requireAuth, requireFeature("run_tracking"), listRuns);
router.delete("/runs/:clientId", requireAuth, requireFeature("run_tracking"), deleteRun);
router.get("/tracking/goals", requireAuth, requireFeature("run_tracking"), listGoalsForAthlete);

export default router;
