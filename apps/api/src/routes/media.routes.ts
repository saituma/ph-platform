import express, { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import { createMediaUploadUrl, signMediaUrl, uploadMediaByToken } from "../controllers/media.controller";
import { env } from "../config/env";

const router = Router();

router.post("/media/signed-url", requireAuth, signMediaUrl);
router.put(
  "/media/upload",
  express.raw({
    type: "*/*",
    limit: `${Math.max(env.mediaMaxMb, env.videoMaxMb)}mb`,
  }),
  uploadMediaByToken,
);
router.post(
  "/media/presign",
  requireAuth,
  requireRole(["admin", "superAdmin", "coach", "guardian", "athlete"]),
  createMediaUploadUrl,
);

export default router;
