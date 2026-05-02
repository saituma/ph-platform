import { Router } from "express";

import { healthCheck, deepHealthCheck } from "../controllers/health.controller";
import { listPlans } from "../controllers/billing.controller";
import { sendFcmPush, isFcmEnabled } from "../services/fcm.service";

const router = Router();

router.get("/health", healthCheck);
router.post("/health", healthCheck);
router.get("/health/deep", deepHealthCheck);
// Public plans endpoint (no auth) for mobile clients.
router.get("/public/plans", listPlans);

// Temporary FCM connectivity test — remove after confirming FCM works.
router.get("/health/fcm-test", async (_req, res) => {
  if (!isFcmEnabled()) {
    res.status(503).json({ ok: false, error: "FIREBASE_SERVICE_ACCOUNT_JSON is not set." });
    return;
  }
  try {
    await sendFcmPush({ token: "test-invalid-token-fcm-check", title: "Test", body: "Test" });
    res.json({ ok: true, result: "sent (unexpected)" });
  } catch (err: any) {
    const code = err?.code ?? err?.errorInfo?.code ?? "unknown";
    const working = code === "messaging/invalid-registration-token" || code === "messaging/registration-token-not-registered" || code === "messaging/invalid-argument";
    res.status(working ? 200 : 500).json({ ok: working, code, message: err?.message });
  }
});

export default router;
