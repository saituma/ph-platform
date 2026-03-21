import { Router } from "express";

import { submitAppFeedback } from "../controllers/support.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/support/app-feedback", requireAuth, submitAppFeedback);

export default router;
