import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import {
  deleteMessage,
  listInbox,
  listMessages,
  markRead,
  sendMessageToCoach,
  toggleReaction,
} from "../controllers/message.controller";

const router = Router();

router.get("/messages", requireAuth, listMessages);
router.get("/messages/inbox", requireAuth, listInbox);
router.post("/messages", requireAuth, sendMessageToCoach);
router.post("/messages/read", requireAuth, markRead);
router.put("/messages/:messageId/reactions", requireAuth, toggleReaction);
router.delete("/messages/:messageId", requireAuth, deleteMessage);

export default router;
