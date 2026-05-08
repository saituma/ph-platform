import * as chatService from "@/services/messages/chatService";
import { apiRequest } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

describe("chatService", () => {
  const token = "test-token";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetchInbox should call apiRequest for messages inbox", async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ status: "fulfilled", value: {} });

    await chatService.fetchInbox(token);

    expect(apiRequest).toHaveBeenCalledWith("/messages/inbox", expect.objectContaining({
      token: "test-token",
      suppressStatusCodes: [401, 403],
    }));
  });

  it("sendDirectMessage should call apiRequest with POST and body", async () => {
    await chatService.sendDirectMessage(token, "Hello", 123);

    expect(apiRequest).toHaveBeenCalledWith("/messages", expect.objectContaining({
      method: "POST",
      body: {
        content: "Hello",
        receiverId: 123,
      },
    }));
  });

  it("sendGroupMessage should call apiRequest with correct path", async () => {
    await chatService.sendGroupMessage(token, 456, "Group Hi");

    expect(apiRequest).toHaveBeenCalledWith("/chat/groups/456/messages", expect.objectContaining({
      method: "POST",
      body: { content: "Group Hi" },
    }));
  });
});
