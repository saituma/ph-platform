import {
  mapApiDirectMessageToChatMessage,
  mapApiGroupMessageToChatMessage,
} from "@/lib/messages/mappers/messageMapper";
import type { ApiChatMessage, ApiCoach } from "@/types/chat-api";

jest.mock("@/lib/messages/reply", () => ({
  parseReplyPrefix: (raw: string) => {
    const input = String(raw ?? "");
    const match = input.match(/^\[reply:(\d+):([^\]]*)\]\s*/);
    if (!match) return { replyToMessageId: null, replyPreview: "", text: input };
    return {
      replyToMessageId: Number(match[1]),
      replyPreview: decodeURIComponent(match[2] ?? ""),
      text: input.slice(match[0].length),
    };
  },
}));

jest.mock("@/lib/messages/mediaType", () => ({
  resolveMediaType: (input: { contentType?: string | null; mediaUrl?: string | null }) => {
    if (input.contentType === "image") return "image";
    if (input.contentType === "video") return "video";
    return "text";
  },
}));

function makeApiMsg(overrides: Partial<ApiChatMessage> = {}): ApiChatMessage {
  return {
    id: 1,
    senderId: 10,
    receiverId: 20,
    content: "Hello",
    read: false,
    createdAt: "2025-01-15T10:30:00Z",
    ...overrides,
  };
}

const coaches: ApiCoach[] = [
  { id: 20, name: "Coach Dan", profilePicture: "https://img.co/dan.jpg" },
];

describe("messageMapper", () => {
  describe("mapApiDirectMessageToChatMessage", () => {
    it("maps outgoing message correctly", () => {
      const result = mapApiDirectMessageToChatMessage(
        makeApiMsg({ senderId: 10, receiverId: 20 }),
        "10",
        coaches,
        "User Name",
      );
      expect(result.from).toBe("user");
      expect(result.threadId).toBe("20");
      expect(result.authorName).toBe("User Name");
      expect(result.authorAvatar).toBeNull();
      expect(result.id).toBe("1");
    });

    it("maps incoming message correctly", () => {
      const result = mapApiDirectMessageToChatMessage(
        makeApiMsg({ senderId: 20, receiverId: 10 }),
        "10",
        coaches,
      );
      expect(result.from).toBe("coach");
      expect(result.threadId).toBe("20");
      expect(result.authorName).toBe("Coach Dan");
      expect(result.authorAvatar).toBe("https://img.co/dan.jpg");
    });

    it('sets status to "read" when msg.read is true', () => {
      const result = mapApiDirectMessageToChatMessage(
        makeApiMsg({ read: true }),
        "10",
        coaches,
      );
      expect(result.status).toBe("read");
    });

    it('sets status to "sent" when msg.read is false', () => {
      const result = mapApiDirectMessageToChatMessage(
        makeApiMsg({ read: false }),
        "10",
        coaches,
      );
      expect(result.status).toBe("sent");
    });

    it("clears text when it is an attachment placeholder", () => {
      const result = mapApiDirectMessageToChatMessage(
        makeApiMsg({ content: "attachment", mediaUrl: "https://img.co/file.png" }),
        "10",
        coaches,
      );
      expect(result.text).toBe("");
    });

    it("preserves text that is not an attachment placeholder", () => {
      const result = mapApiDirectMessageToChatMessage(
        makeApiMsg({ content: "Check this out", mediaUrl: "https://img.co/file.png" }),
        "10",
        coaches,
      );
      expect(result.text).toBe("Check this out");
    });

    it("parses reply prefix from content", () => {
      const result = mapApiDirectMessageToChatMessage(
        makeApiMsg({ content: "[reply:5:Hello%20world] response" }),
        "10",
        coaches,
      );
      expect(result.replyToMessageId).toBe(5);
      expect(result.replyPreview).toBe("Hello world");
      expect(result.text).toBe("response");
    });

    it("sets empty time when createdAt is missing", () => {
      const result = mapApiDirectMessageToChatMessage(
        makeApiMsg({ createdAt: "" }),
        "10",
        coaches,
      );
      expect(result.time).toBe("");
    });

    it("passes through mediaUrl and videoUploadId", () => {
      const result = mapApiDirectMessageToChatMessage(
        makeApiMsg({ mediaUrl: "https://x.com/vid.mp4", videoUploadId: 42 }),
        "10",
        coaches,
      );
      expect(result.mediaUrl).toBe("https://x.com/vid.mp4");
      expect(result.videoUploadId).toBe(42);
    });

    it("passes through reactions", () => {
      const reactions = [{ emoji: "\u{1f44d}", count: 2, userIds: [1, 2] }];
      const result = mapApiDirectMessageToChatMessage(
        makeApiMsg({ reactions }),
        "10",
        coaches,
      );
      expect(result.reactions).toEqual(reactions);
    });
  });

  describe("mapApiGroupMessageToChatMessage", () => {
    const memberMap: Record<number, { name: string; avatar?: string | null }> = {
      10: { name: "Alice", avatar: "https://img.co/alice.jpg" },
      20: { name: "Bob", avatar: null },
    };

    it("maps outgoing group message", () => {
      const result = mapApiGroupMessageToChatMessage(
        makeApiMsg({ senderId: 10 }),
        5,
        "10",
        memberMap,
      );
      expect(result.from).toBe("user");
      expect(result.id).toBe("group-1");
      expect(result.threadId).toBe("group:5");
    });

    it("maps incoming group message", () => {
      const result = mapApiGroupMessageToChatMessage(
        makeApiMsg({ senderId: 20 }),
        5,
        "10",
        memberMap,
      );
      expect(result.from).toBe("coach");
    });

    it("uses senderName from message when available", () => {
      const result = mapApiGroupMessageToChatMessage(
        makeApiMsg({ senderId: 30, senderName: "Charlie" }),
        5,
        "10",
        memberMap,
      );
      expect(result.authorName).toBe("Charlie");
    });

    it("falls back to memberMap name when senderName is missing", () => {
      const result = mapApiGroupMessageToChatMessage(
        makeApiMsg({ senderId: 10 }),
        5,
        "10",
        memberMap,
      );
      expect(result.authorName).toBe("Alice");
    });

    it("uses senderProfilePicture when available", () => {
      const result = mapApiGroupMessageToChatMessage(
        makeApiMsg({ senderId: 10, senderProfilePicture: "https://img.co/pic.jpg" }),
        5,
        "10",
        memberMap,
      );
      expect(result.authorAvatar).toBe("https://img.co/pic.jpg");
    });

    it("falls back to memberMap avatar", () => {
      const result = mapApiGroupMessageToChatMessage(
        makeApiMsg({ senderId: 10 }),
        5,
        "10",
        memberMap,
      );
      expect(result.authorAvatar).toBe("https://img.co/alice.jpg");
    });

    it('status is always "sent" for group messages', () => {
      const result = mapApiGroupMessageToChatMessage(
        makeApiMsg({ read: true }),
        5,
        "10",
        memberMap,
      );
      expect(result.status).toBe("sent");
    });

    it("clears attachment placeholder text", () => {
      const result = mapApiGroupMessageToChatMessage(
        makeApiMsg({ content: "Attachment", mediaUrl: "https://x.com/f.jpg" }),
        5,
        "10",
        memberMap,
      );
      expect(result.text).toBe("");
    });
  });
});
