import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import {
  deleteMessage,
  editMessage,
  forwardMessage,
  listInbox,
  listMessages,
  markRead,
  pinMessage,
  reportMessage,
  searchMessages,
  sendMessageToCoach,
  toggleReaction,
} from "../controllers/message.controller";
import {
  getMuteStatus,
  listMutes,
  muteThread,
  unmuteThread,
} from "../controllers/conversation-mute.controller";

const router = Router();

router.get("/messages", requireAuth, listMessages);
router.get("/messages/inbox", requireAuth, listInbox);
router.get("/messages/search", requireAuth, searchMessages);
router.post("/messages", requireAuth, sendMessageToCoach);
router.post("/messages/read", requireAuth, markRead);
router.put("/messages/:messageId/reactions", requireAuth, toggleReaction);
router.put("/messages/:messageId/pin", requireAuth, pinMessage);
router.post("/messages/forward", requireAuth, forwardMessage);
router.post("/messages/:messageId/report", requireAuth, reportMessage);
router.put("/messages/:messageId", requireAuth, editMessage);
router.delete("/messages/:messageId", requireAuth, deleteMessage);

// Conversation mute
router.get("/messages/mutes", requireAuth, listMutes);
router.get("/messages/mutes/:threadId", requireAuth, getMuteStatus);
router.post("/messages/mutes", requireAuth, muteThread);
router.delete("/messages/mutes/:threadId", requireAuth, unmuteThread);

export default router;
