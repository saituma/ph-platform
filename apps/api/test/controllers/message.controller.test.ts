/**
 * These tests mocked services/message.service (listThread, sendMessage) and
 * services/reaction.service (toggleDirectMessageReaction). All three are DEAD — the controller
 * moved to the conversations model and now calls conversation.service. The mocks therefore did
 * nothing, the real service ran, and it tried to reach a database that does not exist in unit
 * tests ("Failed query: select conversationId from conversation_participants").
 *
 * They now mock what the controller actually calls.
 */
jest.mock("../../src/services/conversation.service", () => ({
  listConversationMessagesForUser: jest.fn(),
  listConversationThreadsForUser: jest.fn(),
  listConversationThreadsAdmin: jest.fn(),
  toggleConversationReaction: jest.fn(),
  sendDirectMessage: jest.fn(),
  markConversationRead: jest.fn(),
  canAccessConversationMessage: jest.fn(),
  deleteConversationMessage: jest.fn(),
  editConversationMessage: jest.fn(),
  getConversationMessageForForward: jest.fn(),
  pinConversationMessage: jest.fn(),
  searchConversationMessages: jest.fn(),
}));

jest.mock("../../src/services/message.service", () => ({
  getCoachUser: jest.fn(),
  getLastAdminContact: jest.fn(),
  getTeamManagersForUser: jest.fn(),
  isUserPremium: jest.fn(),
}));

jest.mock("../../src/services/chat.service", () => ({
  listGroupsForUser: jest.fn(),
}));

import { listMessages, toggleReaction } from "../../src/controllers/message.controller";
import {
  listConversationMessagesForUser,
  toggleConversationReaction,
} from "../../src/services/conversation.service";
import { getCoachUser, getLastAdminContact, getTeamManagersForUser, isUserPremium } from "../../src/services/message.service";

type Res = {
  status: jest.Mock;
  json: jest.Mock;
};

function createRes(): Res {
  const res = {} as Res;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("message controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isUserPremium as jest.Mock).mockResolvedValue(false);
    (getTeamManagersForUser as jest.Mock).mockResolvedValue([]);
    (getCoachUser as jest.Mock).mockResolvedValue(null);
  });

  describe("listMessages", () => {
    it("returns the conversation page and the resolved coach", async () => {
      (listConversationMessagesForUser as jest.Mock).mockResolvedValue({
        messages: [],
        hasMore: false,
        nextCursor: null,
      });
      (getLastAdminContact as jest.Mock).mockResolvedValue({
        id: 22,
        name: "Coach",
        email: "c@x.com",
        role: "coach",
      });

      const req = { user: { id: 1 }, headers: {}, query: {} } as never;
      const res = createRes();

      await listMessages(req, res as never);

      // The controller reads from the conversations model, not the dead message.service.
      expect(listConversationMessagesForUser).toHaveBeenCalledWith(1, {
        limit: undefined,
        cursorId: undefined,
        peerUserId: undefined,
      });
      expect(res.status).toHaveBeenCalledWith(200);

      const body = res.json.mock.calls[0][0];
      expect(body.messages).toEqual([]);
      expect(body.hasMore).toBe(false);
      expect(body.coach?.id).toBe(22);
    });

    it("passes limit and cursor through, so the client can paginate", async () => {
      (listConversationMessagesForUser as jest.Mock).mockResolvedValue({
        messages: [],
        hasMore: true,
        nextCursor: 42,
      });
      (getLastAdminContact as jest.Mock).mockResolvedValue(null);

      const req = { user: { id: 1 }, headers: {}, query: { limit: "50", cursor: "99" } } as never;
      const res = createRes();

      await listMessages(req, res as never);

      expect(listConversationMessagesForUser).toHaveBeenCalledWith(1, {
        limit: 50,
        cursorId: 99,
        peerUserId: undefined,
      });
      expect(res.json.mock.calls[0][0].nextCursor).toBe(42);
    });
  });

  describe("toggleReaction", () => {
    const reactionReq = {
      user: { id: 1, role: "athlete" },
      headers: {},
      params: { messageId: "10" },
      body: { emoji: "thumbs-up" },
    } as never;

    it("maps a service Forbidden error to 403", async () => {
      (toggleConversationReaction as jest.Mock).mockRejectedValue(new Error("Forbidden"));
      const res = createRes();

      await toggleReaction(reactionReq, res as never);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
    });

    it("maps a service 'Message not found' error to 404", async () => {
      (toggleConversationReaction as jest.Mock).mockRejectedValue(new Error("Message not found"));
      const res = createRes();

      await toggleReaction(reactionReq, res as never);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Message not found" });
    });

    it("404s when the service returns no reactions (message gone)", async () => {
      (toggleConversationReaction as jest.Mock).mockResolvedValue(null);
      const res = createRes();

      await toggleReaction(reactionReq, res as never);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns the updated reactions on success", async () => {
      (toggleConversationReaction as jest.Mock).mockResolvedValue([{ emoji: "thumbs-up", userIds: [1] }]);
      const res = createRes();

      await toggleReaction(reactionReq, res as never);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ reactions: [{ emoji: "thumbs-up", userIds: [1] }] });
    });
  });
});
