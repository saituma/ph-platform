import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { syncRuns, listRuns, deleteRun } from "../controllers/runs.controller";
import { listGoalsForAthlete } from "../controllers/tracking-goals.controller";

const router = Router();

// Deliberately not plan-gated: an activity a user recorded is their own data and must always
// reach their coach. Gating sync stranded runs on-device forever with no way to recover them.
// Ownership is still enforced per-request from the auth token.
router.post("/runs/sync", requireAuth, syncRuns);
router.get("/runs", requireAuth, listRuns);
router.delete("/runs/:clientId", requireAuth, deleteRun);
router.get("/tracking/goals", requireAuth, listGoalsForAthlete);

export default router;
