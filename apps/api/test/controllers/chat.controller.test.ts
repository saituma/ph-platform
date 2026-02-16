jest.mock("../../src/services/chat.service", () => ({
  addGroupMembers: jest.fn(),
  createGroup: jest.fn(),
  createGroupMessage: jest.fn(),
  isGroupMember: jest.fn(),
  listGroupMembers: jest.fn(),
  listGroupMessages: jest.fn(),
  listGroupsForUser: jest.fn(),
}));

jest.mock("../../src/services/reaction.service", () => ({
  toggleGroupMessageReaction: jest.fn(),
}));

import { listGroupChatMessages, sendGroupChatMessage, toggleGroupReaction } from "../../src/controllers/chat.controller";
import { isGroupMember, createGroupMessage, listGroupMessages } from "../../src/services/chat.service";
import { toggleGroupMessageReaction } from "../../src/services/reaction.service";

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("chat controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 403 when user is not group member", async () => {
    (isGroupMember as jest.Mock).mockResolvedValue(false);
    const req = { user: { id: 1 }, params: { groupId: "2" } } as any;
    const res = createRes();

    await listGroupChatMessages(req, res);

    expect(listGroupMessages).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("creates group message when user is member", async () => {
    (isGroupMember as jest.Mock).mockResolvedValue(true);
    (createGroupMessage as jest.Mock).mockResolvedValue({ id: 1 });
    const req = { user: { id: 1 }, params: { groupId: "2" }, body: { content: "Hello" } } as any;
    const res = createRes();

    await sendGroupChatMessage(req, res);

    expect(createGroupMessage).toHaveBeenCalledWith({
      groupId: 2,
      senderId: 1,
      content: "Hello",
      contentType: "text",
      mediaUrl: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: { id: 1 } });
  });

  it("returns 404 when reaction message missing", async () => {
    (isGroupMember as jest.Mock).mockResolvedValue(true);
    (toggleGroupMessageReaction as jest.Mock).mockRejectedValue(new Error("Message not found"));
    const req = {
      user: { id: 1 },
      params: { groupId: "2", messageId: "3" },
      body: { emoji: "thumbs-up" },
    } as any;
    const res = createRes();

    await toggleGroupReaction(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Message not found" });
  });
});
