import { Router } from "express";

const router = Router();

const IOS_STORE_URL = process.env.APP_IOS_STORE_URL || "https://apps.apple.com/app/id6768563715";
const ANDROID_STORE_URL =
  process.env.APP_ANDROID_STORE_URL ||
  "https://play.google.com/store/apps/details?id=com.dawitworkujima.footballcoachingapp";

/**
 * Public app-version metadata for the mobile "update available" banner.
 * Set APP_LATEST_VERSION per store release (and optionally APP_MIN_SUPPORTED_VERSION)
 * to surface the store-update notice; leaving them unset shows no store notice.
 */
router.get("/app/version", (_req, res) => {
  res.status(200).json({
    latest: process.env.APP_LATEST_VERSION || null,
    minSupported: process.env.APP_MIN_SUPPORTED_VERSION || null,
    ios: { url: IOS_STORE_URL },
    android: { url: ANDROID_STORE_URL },
  });
});

export default router;
