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
    (listThread as jest.Mock).mockResolvedValue([{ id: 1, content: "hello" }]);
    (getLastAdminContact as jest.Mock).mockResolvedValue({ id: 22, name: "Coach" });

    const req = { user: { id: 1 }, headers: {} } as any;
    const res = createRes();

    await listMessages(req, res);

    expect(listThread).toHaveBeenCalledWith(1, { includeVideoResponses: false });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      messages: [{ id: 1, content: "hello" }],
      coaches: [{ id: 22, name: "Coach" }],
      coach: { id: 22, name: "Coach" },
    });
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
