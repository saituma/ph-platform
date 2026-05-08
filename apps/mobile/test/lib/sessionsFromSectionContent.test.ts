jest.mock("@/constants/program-details", () => ({
  getSessionTypesForTab: jest.fn().mockReturnValue(["exercise"]),
}));

import { sessionsFromSectionContentForTab } from "@/lib/sessionsFromSectionContent";

describe("sessionsFromSectionContentForTab", () => {
  it("returns null for insufficient items", () => {
    expect(sessionsFromSectionContentForTab([], "training")).toBeNull();
    expect(sessionsFromSectionContentForTab([{ id: 1, title: "t", body: "", sectionType: "exercise" }], "training")).toBeNull();
  });

  it("returns null when no structure metadata", () => {
    const items = [
      { id: 1, title: "a", body: "", sectionType: "exercise" },
      { id: 2, title: "b", body: "", sectionType: "exercise" },
    ];
    expect(sessionsFromSectionContentForTab(items, "training")).toBeNull();
  });

  it("builds sessions from structured items", () => {
    const items = [
      { id: 1, title: "Squat", body: "", sectionType: "exercise", metadata: { weekNumber: 1, sessionNumber: 1 } },
      { id: 2, title: "Bench", body: "", sectionType: "exercise", metadata: { weekNumber: 1, sessionNumber: 1 } },
    ];
    const result = sessionsFromSectionContentForTab(items, "training");
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThan(0);
    expect(result![0].exercises.length).toBe(2);
  });
});
