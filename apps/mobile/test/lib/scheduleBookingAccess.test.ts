import { canSelfBookSchedule } from "@/lib/scheduleBookingAccess";

describe("canSelfBookSchedule", () => {
  it("returns false for team_athlete", () => {
    expect(canSelfBookSchedule("team_athlete")).toBe(false);
  });

  it("returns true for other roles", () => {
    expect(canSelfBookSchedule("athlete")).toBe(true);
    expect(canSelfBookSchedule("admin")).toBe(true);
    expect(canSelfBookSchedule("program_coach")).toBe(true);
    expect(canSelfBookSchedule("team_coach")).toBe(true);
  });

  it("handles null/undefined", () => {
    expect(canSelfBookSchedule(null)).toBe(true);
    expect(canSelfBookSchedule(undefined)).toBe(true);
  });
});
