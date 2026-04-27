import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  listNotifications,
  markNotificationRead,
  savePushToken,
  clearPushToken,
  testPushNotification,
} from "../controllers/notification.controller";

const router = Router();

router.get("/notifications", requireAuth, listNotifications);
router.post("/notifications/read", requireAuth, markNotificationRead);
router.post("/users/push-token", requireAuth, savePushToken);
router.delete("/users/push-token", requireAuth, clearPushToken);
router.post("/notifications/test-push", requireAuth, testPushNotification);

export default router;
