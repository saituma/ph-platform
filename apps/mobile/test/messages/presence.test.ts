import { ONLINE_LABEL, formatPresence } from "@/lib/messages/presence";

describe("formatPresence", () => {
  const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

  test("online wins over any lastSeenAt", () => {
    expect(formatPresence(true, minutesAgo(500))).toBe(ONLINE_LABEL);
  });

  // The bug this replaces: a peer with no lastSeenAt was labelled "Active", which reads as
  // presence. Someone who has never connected is Offline, not Active.
  test("a peer we have never seen is Offline, never Active", () => {
    expect(formatPresence(false, null)).toBe("Offline");
    expect(formatPresence(false, undefined)).toBe("Offline");
  });

  test("offline peers report how long ago they were seen", () => {
    expect(formatPresence(false, minutesAgo(0))).toBe("Last seen just now");
    expect(formatPresence(false, minutesAgo(12))).toBe("Last seen 12m ago");
    expect(formatPresence(false, minutesAgo(60 * 3))).toBe("Last seen 3h ago");
    expect(formatPresence(false, minutesAgo(60 * 24))).toBe("Last seen yesterday");
    expect(formatPresence(false, minutesAgo(60 * 24 * 4))).toBe("Last seen 4d ago");
  });

  test("a garbage timestamp degrades to Offline rather than NaN", () => {
    expect(formatPresence(false, "not-a-date")).toBe("Offline");
  });
});
