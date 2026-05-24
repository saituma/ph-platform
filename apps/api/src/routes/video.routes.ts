import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireFeature } from "../middlewares/feature";
import { requireRole } from "../middlewares/roles";
import { createUploadUrl, createVideo, listVideos, reviewVideo } from "../controllers/video.controller";

const router = Router();

router.post("/videos/presign", requireAuth, requireFeature("video_upload"), createUploadUrl);
router.get("/videos", requireAuth, requireFeature("video_upload"), listVideos);
router.post("/videos", requireAuth, requireFeature("video_upload"), createVideo);
router.post("/videos/review", requireAuth, requireRole(["coach", "admin", "superAdmin"]), reviewVideo);

export default router;
