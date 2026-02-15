import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import { createUploadUrl, createVideo, listVideos, reviewVideo } from "../controllers/video.controller";

const router = Router();

router.post("/videos/presign", requireAuth, createUploadUrl);
router.get("/videos", requireAuth, listVideos);
router.post("/videos", requireAuth, createVideo);
router.post("/videos/review", requireAuth, requireRole(["coach", "admin", "superAdmin"]), reviewVideo);

export default router;
