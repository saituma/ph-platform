import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { listActivityFeed } from "../controllers/activity.controller";

const router = Router();

router.get("/activity/feed", requireAuth, listActivityFeed);

export default router;
