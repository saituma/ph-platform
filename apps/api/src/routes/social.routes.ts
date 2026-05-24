import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireFeature } from "../middlewares/feature";
import {
  adults,
  commentDelete,
  commentEdit,
  commentReactionClear,
  commentReactionSet,
  commentReactionsList,
  commentReport,
  commentsCreate,
  commentsList,
  leaderboard,
  mySocialRuns,
  privacySettingsGet,
  privacySettingsUpdate,
  runDetail,
  runLikeCreate,
  runLikeDelete,
  runLikesList,
  runs,
} from "../controllers/social.controller";

const router = Router();

// Social Feed
router.get("/social/leaderboard", requireAuth, requireFeature("social_feed"), leaderboard);
router.get("/social/adults", requireAuth, requireFeature("social_feed"), adults);
router.get("/social/runs", requireAuth, requireFeature("social_feed"), runs);
router.get("/social/runs/:runLogId", requireAuth, requireFeature("social_feed"), runDetail);
router.get("/social/runs/:runLogId/likes", requireAuth, requireFeature("social_feed"), runLikesList);
router.post("/social/runs/:runLogId/like", requireAuth, requireFeature("social_feed"), runLikeCreate);
router.delete("/social/runs/:runLogId/like", requireAuth, requireFeature("social_feed"), runLikeDelete);
router.get("/social/runs/:runLogId/comments", requireAuth, requireFeature("social_feed"), commentsList);
router.post("/social/runs/:runLogId/comments", requireAuth, requireFeature("social_feed"), commentsCreate);
router.delete("/social/comments/:commentId", requireAuth, requireFeature("social_feed"), commentDelete);
router.patch("/social/comments/:commentId", requireAuth, requireFeature("social_feed"), commentEdit);
router.post("/social/comments/:commentId/report", requireAuth, requireFeature("social_feed"), commentReport);
router.get("/social/comments/:commentId/reactions", requireAuth, requireFeature("social_feed"), commentReactionsList);
router.post("/social/comments/:commentId/reaction", requireAuth, requireFeature("social_feed"), commentReactionSet);
router.delete("/social/comments/:commentId/reaction", requireAuth, requireFeature("social_feed"), commentReactionClear);

// Privacy Settings
router.get("/social/privacy", requireAuth, requireFeature("social_feed"), privacySettingsGet);
router.patch("/social/privacy", requireAuth, requireFeature("social_feed"), privacySettingsUpdate);

// My Social Runs
router.get("/social/my-runs", requireAuth, requireFeature("social_feed"), mySocialRuns);

export default router;
