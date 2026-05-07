import { relativeTime } from "@/lib/tracking/relativeTime";

describe("relativeTime", () => {
  it("returns 'Just now' for recent times", () => {
    const now = new Date().toISOString();
    expect(relativeTime(now)).toBe("Just now");
  });

  it("returns minutes ago", () => {
    const d = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(relativeTime(d)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const d = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(d)).toBe("3h ago");
  });

  it("returns 'Yesterday'", () => {
    const d = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(d)).toBe("Yesterday");
  });

  it("returns days ago", () => {
    const d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(d)).toBe("3d ago");
  });

  it("returns weeks ago", () => {
    const d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(d)).toBe("2w ago");
  });

  it("returns empty string for invalid dates", () => {
    expect(relativeTime("invalid")).toBe("");
  });
});
