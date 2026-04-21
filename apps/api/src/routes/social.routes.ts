import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
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
router.get("/social/leaderboard", requireAuth, leaderboard);
router.get("/social/adults", requireAuth, adults);
router.get("/social/runs", requireAuth, runs);
router.get("/social/runs/:runLogId", requireAuth, runDetail);
router.get("/social/runs/:runLogId/likes", requireAuth, runLikesList);
router.post("/social/runs/:runLogId/like", requireAuth, runLikeCreate);
router.delete("/social/runs/:runLogId/like", requireAuth, runLikeDelete);
router.get("/social/runs/:runLogId/comments", requireAuth, commentsList);
router.post("/social/runs/:runLogId/comments", requireAuth, commentsCreate);
router.delete("/social/comments/:commentId", requireAuth, commentDelete);
router.patch("/social/comments/:commentId", requireAuth, commentEdit);
router.post("/social/comments/:commentId/report", requireAuth, commentReport);
router.get("/social/comments/:commentId/reactions", requireAuth, commentReactionsList);
router.post("/social/comments/:commentId/reaction", requireAuth, commentReactionSet);
router.delete("/social/comments/:commentId/reaction", requireAuth, commentReactionClear);

// Privacy Settings
router.get("/social/privacy", requireAuth, privacySettingsGet);
router.patch("/social/privacy", requireAuth, privacySettingsUpdate);

// My Social Runs
router.get("/social/my-runs", requireAuth, mySocialRuns);

export default router;
