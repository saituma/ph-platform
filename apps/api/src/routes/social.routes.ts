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
  runs,
} from "../controllers/social.controller";

const router = Router();

router.get("/social/leaderboard", requireAuth, leaderboard);
router.get("/social/adults", requireAuth, adults);
router.get("/social/runs", requireAuth, runs);
router.get("/social/runs/:runLogId/comments", requireAuth, commentsList);
router.post("/social/runs/:runLogId/comments", requireAuth, commentsCreate);
router.delete("/social/comments/:commentId", requireAuth, commentDelete);
router.patch("/social/comments/:commentId", requireAuth, commentEdit);
router.post("/social/comments/:commentId/report", requireAuth, commentReport);
router.get("/social/comments/:commentId/reactions", requireAuth, commentReactionsList);
router.post("/social/comments/:commentId/reaction", requireAuth, commentReactionSet);
router.delete("/social/comments/:commentId/reaction", requireAuth, commentReactionClear);

export default router;
