import { ACHIEVEMENT_TITLES, formatAchievementNames } from "@/lib/trainingAchievements";

describe("formatAchievementNames", () => {
  it("maps known keys to titles", () => {
    expect(formatAchievementNames(["first_rep"])).toBe("First rep");
    expect(formatAchievementNames(["full_session"])).toBe("Full session");
  });

  it("joins multiple with dot separator", () => {
    expect(formatAchievementNames(["first_rep", "reps_10"])).toBe("First rep · 10 check-ins");
  });

  it("returns unknown keys as-is", () => {
    expect(formatAchievementNames(["unknown_key"])).toBe("unknown_key");
  });

  it("returns empty string for empty array", () => {
    expect(formatAchievementNames([])).toBe("");
  });
});

describe("ACHIEVEMENT_TITLES", () => {
  it("has expected keys", () => {
    expect(ACHIEVEMENT_TITLES.first_rep).toBe("First rep");
    expect(ACHIEVEMENT_TITLES.sessions_10).toBe("10 sessions");
  });
});
