import { Router } from "express";

import { healthCheck } from "../controllers/health.controller";
import { listPlans } from "../controllers/billing.controller";

const router = Router();

router.get("/health", healthCheck);
// Public plans endpoint (no auth) for mobile clients.
router.get("/public/plans", listPlans);

export default router;
