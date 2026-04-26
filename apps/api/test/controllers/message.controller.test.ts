jest.mock("../../src/services/message.service", () => ({
  getCoachUser: jest.fn(),
  getLastAdminContact: jest.fn(),
  listThread: jest.fn(),
  markThreadRead: jest.fn(),
  sendMessage: jest.fn(),
  isUserPremium: jest.fn(),
}));

jest.mock("../../src/services/reaction.service", () => ({
  toggleDirectMessageReaction: jest.fn(),
}));

import { listMessages, sendMessageToCoach, toggleReaction } from "../../src/controllers/message.controller";
import {
  getCoachUser,
  getLastAdminContact,
  isUserPremium,
  listThread,
  sendMessage,
} from "../../src/services/message.service";
import { toggleDirectMessageReaction } from "../../src/services/reaction.service";

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("message controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isUserPremium as jest.Mock).mockResolvedValue(false);
  });

  it("returns list of messages when resolved", async () => {
    (listThread as jest.Mock).mockResolvedValue({
      messages: [] as { id: number; content: string; senderId?: number; receiverId?: number }[],
      hasMore: false,
      nextCursor: null,
      teamManager: null,
    });
    (getLastAdminContact as jest.Mock).mockResolvedValue({
      id: 22,
      name: "Coach",
      email: "c@x.com",
      role: "coach",
    });

    const req = { user: { id: 1 }, headers: {} } as any;
    const res = createRes();

    await listMessages(req, res);

    expect(listThread).toHaveBeenCalledWith(1, { includeVideoResponses: false });
    expect(isUserPremium).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    const body = (res.json as jest.Mock).mock.calls[0][0] as {
      messages: unknown[];
      hasMore: boolean;
      nextCursor: null;
      coach: { id: number; name: string } | null;
    };
    expect(body.messages).toEqual([]);
    expect(body.hasMore).toBe(false);
    expect(body.coach).toBeTruthy();
    expect(body.coach?.id).toBe(22);
  });

  it("returns 400 when coach is not available", async () => {
    (getLastAdminContact as jest.Mock).mockResolvedValue(null);
    (getCoachUser as jest.Mock).mockResolvedValue(null);

    const req = {
      user: { id: 1 },
      headers: {},
      body: { content: "hello", contentType: "text" },
    } as any;
    const res = createRes();

    await sendMessageToCoach(req, res);

    expect(sendMessage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Coach not available" });
  });

  it("maps reaction service forbidden to 403", async () => {
    (toggleDirectMessageReaction as jest.Mock).mockRejectedValue(new Error("Forbidden"));

    const req = {
      user: { id: 1 },
      headers: {},
      params: { messageId: "10" },
      body: { emoji: "thumbs-up" },
    } as any;
    const res = createRes();

    await toggleReaction(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("maps reaction not found to 404", async () => {
    (toggleDirectMessageReaction as jest.Mock).mockRejectedValue(new Error("Message not found"));

    const req = {
      user: { id: 1 },
      headers: {},
      params: { messageId: "10" },
      body: { emoji: "thumbs-up" },
    } as any;
    const res = createRes();

    await toggleReaction(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Message not found" });
  });
});
