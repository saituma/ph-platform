import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireFeature } from "../middlewares/feature";
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
import {
  teamPostsList,
  teamPostsCreate,
  teamPostLikeCreate,
  teamPostLikeDelete,
  teamPostCommentsList,
  teamPostCommentsCreate,
  teamPostCommentDelete,
} from "../controllers/social-posts.controller";

const router = Router();
// ... (rest of imports or code if needed, but I will target the block)

router.get("/teams/social/leaderboard", requireAuth, requireFeature("social_feed"), teamLeaderboard);
router.get("/teams/social/directory", requireAuth, requireFeature("social_feed"), teamDirectory);
router.get("/teams/social/runs", requireAuth, requireFeature("social_feed"), teamRuns);
router.get("/teams/social/runs/:runLogId", requireAuth, requireFeature("social_feed"), teamRunDetail);
router.get("/teams/social/runs/:runLogId/likes", requireAuth, requireFeature("social_feed"), teamRunLikesList);
router.post("/teams/social/runs/:runLogId/like", requireAuth, requireFeature("social_feed"), teamRunLikeCreate);
router.delete("/teams/social/runs/:runLogId/like", requireAuth, requireFeature("social_feed"), teamRunLikeDelete);
router.get("/teams/social/runs/:runLogId/comments", requireAuth, requireFeature("social_feed"), teamCommentsList);
router.post("/teams/social/runs/:runLogId/comments", requireAuth, requireFeature("social_feed"), teamCommentsCreate);

// Team Posts
router.get("/teams/social/posts", requireAuth, requireFeature("social_feed"), teamPostsList);
router.post("/teams/social/posts", requireAuth, requireFeature("social_feed"), teamPostsCreate);
router.post("/teams/social/posts/:postId/like", requireAuth, requireFeature("social_feed"), teamPostLikeCreate);
router.delete("/teams/social/posts/:postId/like", requireAuth, requireFeature("social_feed"), teamPostLikeDelete);
router.get("/teams/social/posts/:postId/comments", requireAuth, requireFeature("social_feed"), teamPostCommentsList);
router.post("/teams/social/posts/:postId/comments", requireAuth, requireFeature("social_feed"), teamPostCommentsCreate);
router.delete("/teams/social/posts/comments/:commentId", requireAuth, requireFeature("social_feed"), teamPostCommentDelete);

router.delete("/teams/social/comments/:commentId", requireAuth, requireFeature("social_feed"), teamCommentDelete);
router.patch("/teams/social/comments/:commentId", requireAuth, requireFeature("social_feed"), teamCommentEdit);
router.post("/teams/social/comments/:commentId/report", requireAuth, requireFeature("social_feed"), teamCommentReport);
router.get("/teams/social/comments/:commentId/reactions", requireAuth, requireFeature("social_feed"), teamCommentReactionsList);
router.post("/teams/social/comments/:commentId/reaction", requireAuth, requireFeature("social_feed"), teamCommentReactionSet);
router.delete("/teams/social/comments/:commentId/reaction", requireAuth, requireFeature("social_feed"), teamCommentReactionClear);

export default router;
