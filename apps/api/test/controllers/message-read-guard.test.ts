jest.mock("../../src/services/conversation.service", () => ({
  markConversationRead: jest.fn().mockResolvedValue(3),
}));
jest.mock("../../src/services/message.service", () => ({}));
jest.mock("../../src/services/chat.service", () => ({}));

import { markRead } from "../../src/controllers/message.controller";
import { markConversationRead } from "../../src/services/conversation.service";

function createRes() {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * markConversationRead(userId) with no peer marks EVERY unread message in EVERY
 * conversation as read. peerUserId used to be `.optional()`, so `POST /api/messages/read`
 * with an empty body silently wiped a user's entire unread state. It is now required.
 */
describe("markRead — peerUserId is required", () => {
  beforeEach(() => jest.clearAllMocks());

  test("marks a single thread read when peerUserId is supplied", async () => {
    const req = { user: { id: 1 }, body: { peerUserId: 42 } } as never;
    const res = createRes();

    await markRead(req, res as never);

    expect(markConversationRead).toHaveBeenCalledWith(1, 42);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("an empty body is rejected and never reaches the service", async () => {
    const req = { user: { id: 1 }, body: {} } as never;

    await expect(markRead(req, createRes() as never)).rejects.toThrow();
    expect(markConversationRead).not.toHaveBeenCalled();
  });

  test("a null peerUserId is rejected — the mark-everything path is unreachable", async () => {
    const req = { user: { id: 1 }, body: { peerUserId: null } } as never;

    await expect(markRead(req, createRes() as never)).rejects.toThrow();
    expect(markConversationRead).not.toHaveBeenCalled();
  });
});
