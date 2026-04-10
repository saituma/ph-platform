import { classifyGroupThread, mapGroupToThread } from "@/lib/messages/mappers/threadMapper";

describe("threadMapper", () => {
  describe("classifyGroupThread", () => {
    it("should classify announcement correctly", () => {
      expect(classifyGroupThread({ category: "announcement" })).toBe("announcement");
    });

    it("should classify team correctly", () => {
      expect(classifyGroupThread({ category: "team" })).toBe("team");
    });

    it("should default to coach_group", () => {
      expect(classifyGroupThread({ category: "anything" })).toBe("coach_group");
      expect(classifyGroupThread({})).toBe("coach_group");
    });
  });

  describe("mapGroupToThread", () => {
    it("should map a basic group correctly", () => {
      const group = {
        id: 123,
        name: "Test Group",
        category: "team",
        createdAt: "2023-01-01T12:00:00Z",
        unreadCount: 5,
      };

      const thread = mapGroupToThread(group);

      expect(thread.id).toBe("group:123");
      expect(thread.name).toBe("Test Group");
      expect(thread.channelType).toBe("team");
      expect(thread.unread).toBe(5);
      expect(thread.role).toBe("Team");
    });

    it("should use last message for preview and time", () => {
      const group = {
        id: 123,
        name: "Test Group",
        category: "coach_group",
        lastMessage: {
          content: "Hello world",
          createdAt: "2023-01-01T15:30:00Z",
        },
      };

      const thread = mapGroupToThread(group);

      expect(thread.preview).toBe("Hello world");
      // Time format depends on locale in real environment, but we can check it's non-empty
      expect(thread.time).toBeTruthy();
    });
  });
});
