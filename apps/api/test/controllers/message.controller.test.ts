jest.mock("../../src/lib/acting-user", () => ({
  resolveActingUserId: jest.fn(),
}));

jest.mock("../../src/services/message.service", () => ({
  getCoachUser: jest.fn(),
  getLastAdminContact: jest.fn(),
  listThread: jest.fn(),
  markThreadRead: jest.fn(),
  sendMessage: jest.fn(),
}));

jest.mock("../../src/services/reaction.service", () => ({
  toggleDirectMessageReaction: jest.fn(),
}));

import { listMessages, sendMessageToCoach, toggleReaction } from "../../src/controllers/message.controller";
import { resolveActingUserId } from "../../src/lib/acting-user";
import { getCoachUser, getLastAdminContact, listThread, sendMessage } from "../../src/services/message.service";
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
  });

  it("returns 403 when acting user cannot be resolved", async () => {
    (resolveActingUserId as jest.Mock).mockRejectedValue(new Error("Forbidden"));
    const req = { user: { id: 1 }, headers: {} } as any;
    const res = createRes();

    await listMessages(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("returns list of messages when resolved", async () => {
    (resolveActingUserId as jest.Mock).mockResolvedValue(9);
    (listThread as jest.Mock).mockResolvedValue([{ id: 1, content: "hello" }]);
    (getLastAdminContact as jest.Mock).mockResolvedValue({ id: 22, name: "Coach" });

    const req = { user: { id: 1 }, headers: {} } as any;
    const res = createRes();

    await listMessages(req, res);

    expect(listThread).toHaveBeenCalledWith(9);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      messages: [{ id: 1, content: "hello" }],
      coach: { id: 22, name: "Coach" },
    });
  });

  it("returns 400 when coach is not available", async () => {
    (resolveActingUserId as jest.Mock).mockResolvedValue(4);
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
    (resolveActingUserId as jest.Mock).mockResolvedValue(4);
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
    (resolveActingUserId as jest.Mock).mockResolvedValue(4);
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
