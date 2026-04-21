import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  listNotifications,
  markNotificationRead,
  savePushToken,
  testPushNotification,
} from "../controllers/notification.controller";

const router = Router();

router.get("/notifications", requireAuth, listNotifications);
router.post("/notifications/read", requireAuth, markNotificationRead);
router.post("/users/push-token", requireAuth, savePushToken);
router.post("/notifications/test-push", requireAuth, testPushNotification);

export default router;
