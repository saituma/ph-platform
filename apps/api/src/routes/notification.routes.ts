import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { listNotifications, markNotificationRead } from "../controllers/notification.controller";

const router = Router();

router.get("/notifications", requireAuth, listNotifications);
router.post("/notifications/read", requireAuth, markNotificationRead);

export default router;
