import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import {
  addMembers,
  createGroupChat,
  listGroupChatMessages,
  listGroups,
  listMembers,
  sendGroupChatMessage,
} from "../controllers/chat.controller";

const router = Router();

router.get("/chat/groups", requireAuth, listGroups);
router.post("/chat/groups", requireAuth, requireRole(["admin", "superAdmin", "coach"]), createGroupChat);
router.get("/chat/groups/:groupId/members", requireAuth, listMembers);
router.post("/chat/groups/:groupId/members", requireAuth, requireRole(["admin", "superAdmin", "coach"]), addMembers);
router.get("/chat/groups/:groupId/messages", requireAuth, listGroupChatMessages);
router.post("/chat/groups/:groupId/messages", requireAuth, sendGroupChatMessage);

export default router;
