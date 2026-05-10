import { Router } from "express";

import { healthCheck, deepHealthCheck } from "../controllers/health.controller";
import { listPlans } from "../controllers/billing";

const router = Router();

router.get("/health", healthCheck);
router.post("/health", healthCheck);
// Deep health only returns {ok, db, ts} — no infrastructure details exposed.
router.get("/health/deep", deepHealthCheck);
// Public plans endpoint (no auth) for mobile clients.
router.get("/public/plans", listPlans);

export default router;
