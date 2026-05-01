import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { syncRuns, listRuns, deleteRun } from "../controllers/runs.controller";
import { listGoalsForAthlete } from "../controllers/tracking-goals.controller";

const router = Router();

router.post("/runs/sync", requireAuth, syncRuns);
router.get("/runs", requireAuth, listRuns);
router.delete("/runs/:clientId", requireAuth, deleteRun);
router.get("/tracking/goals", requireAuth, listGoalsForAthlete);

export default router;
