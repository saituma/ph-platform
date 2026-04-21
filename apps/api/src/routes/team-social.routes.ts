import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import {
  teamLeaderboard,
  teamDirectory,
  teamRuns,
  teamRunDetail,
  teamCommentsList,
  teamCommentsCreate,
  teamCommentDelete,
  teamCommentEdit,
  teamCommentReport,
  teamCommentReactionsList,
  teamCommentReactionSet,
  teamCommentReactionClear,
  teamRunLikesList,
  teamRunLikeCreate,
  teamRunLikeDelete,
} from "../controllers/team-social.controller";

const router = Router();

router.get("/teams/social/leaderboard", requireAuth, teamLeaderboard);
router.get("/teams/social/directory", requireAuth, teamDirectory);
router.get("/teams/social/runs", requireAuth, teamRuns);
router.get("/teams/social/runs/:runLogId", requireAuth, teamRunDetail);
router.get("/teams/social/runs/:runLogId/likes", requireAuth, teamRunLikesList);
router.post("/teams/social/runs/:runLogId/like", requireAuth, teamRunLikeCreate);
router.delete("/teams/social/runs/:runLogId/like", requireAuth, teamRunLikeDelete);
router.get("/teams/social/runs/:runLogId/comments", requireAuth, teamCommentsList);
router.post("/teams/social/runs/:runLogId/comments", requireAuth, teamCommentsCreate);
router.delete("/teams/social/comments/:commentId", requireAuth, teamCommentDelete);
router.patch("/teams/social/comments/:commentId", requireAuth, teamCommentEdit);
router.post("/teams/social/comments/:commentId/report", requireAuth, teamCommentReport);
router.get("/teams/social/comments/:commentId/reactions", requireAuth, teamCommentReactionsList);
router.post("/teams/social/comments/:commentId/reaction", requireAuth, teamCommentReactionSet);
router.delete("/teams/social/comments/:commentId/reaction", requireAuth, teamCommentReactionClear);

export default router;
