import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import { createMediaUploadUrl, signMediaUrl } from "../controllers/media.controller";

const router = Router();

router.post("/media/signed-url", requireAuth, signMediaUrl);
router.post(
  "/media/presign",
  requireAuth,
  requireRole(["admin", "superAdmin", "coach", "guardian", "athlete"]),
  createMediaUploadUrl
);

export default router;
