import { getDateLabel, computeGroupingMap } from "@/lib/messages/messageGrouping";

describe("getDateLabel", () => {
  it("returns null for undefined/empty", () => {
    expect(getDateLabel(undefined)).toBeNull();
    expect(getDateLabel("")).toBeNull();
  });

  it("returns null for invalid dates", () => {
    expect(getDateLabel("not-a-date")).toBeNull();
  });

  it("returns 'Today' for today's date", () => {
    expect(getDateLabel(new Date().toISOString())).toBe("Today");
  });

  it("returns 'Yesterday' for yesterday", () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expect(getDateLabel(d.toISOString())).toBe("Yesterday");
  });

  it("returns formatted date for older dates", () => {
    const result = getDateLabel("2023-01-15T10:00:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toBe("Today");
    expect(result).not.toBe("Yesterday");
  });
});

describe("computeGroupingMap", () => {
  const msg = (id: number, from: string, createdAt: string) => ({
    id,
    from,
    senderId: id,
    createdAt,
    time: createdAt,
    text: "",
    body: "",
    profileId: 1,
    senderName: from,
  });

  it("returns empty map for empty array", () => {
    expect(computeGroupingMap([])).toEqual(new Map());
  });

  it("marks single message as solo", () => {
    const messages = [msg(1, "alice", new Date().toISOString())] as any;
    const map = computeGroupingMap(messages);
    expect(map.get(1)?.position).toBe("solo");
    expect(map.get(1)?.showAvatar).toBe(true);
    expect(map.get(1)?.showSenderName).toBe(true);
  });

  it("groups consecutive messages from same sender", () => {
    const now = new Date().toISOString();
    const messages = [
      msg(1, "alice", now),
      msg(2, "alice", now),
      msg(3, "alice", now),
    ] as any;
    const map = computeGroupingMap(messages);
    expect(map.get(1)?.position).toBe("first");
    expect(map.get(2)?.position).toBe("middle");
    expect(map.get(3)?.position).toBe("last");
  });

  it("shows date separator for first message", () => {
    const messages = [msg(1, "alice", new Date().toISOString())] as any;
    const map = computeGroupingMap(messages);
    expect(map.get(1)?.dateSeparator).toBe("Today");
  });
});
