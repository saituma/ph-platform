import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import {
  deleteMessage,
  forwardMessage,
  listInbox,
  listMessages,
  markRead,
  pinMessage,
  searchMessages,
  sendMessageToCoach,
  toggleReaction,
} from "../controllers/message.controller";

const router = Router();

router.get("/messages", requireAuth, listMessages);
router.get("/messages/inbox", requireAuth, listInbox);
router.get("/messages/search", requireAuth, searchMessages);
router.post("/messages", requireAuth, sendMessageToCoach);
router.post("/messages/read", requireAuth, markRead);
router.put("/messages/:messageId/reactions", requireAuth, toggleReaction);
router.put("/messages/:messageId/pin", requireAuth, pinMessage);
router.post("/messages/forward", requireAuth, forwardMessage);
router.delete("/messages/:messageId", requireAuth, deleteMessage);

export default router;
