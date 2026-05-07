import { formatWhen, safeNumber, stripPreview, categoryLabel } from "@/lib/admin-messages-utils";

describe("formatWhen", () => {
  it("returns empty string for falsy values", () => {
    expect(formatWhen(null)).toBe("");
    expect(formatWhen(undefined)).toBe("");
    expect(formatWhen("")).toBe("");
  });

  it("formats valid date strings", () => {
    expect(formatWhen("2024-01-15T10:30:00Z")).toBeTruthy();
  });

  it("returns empty string for invalid dates", () => {
    expect(formatWhen("not-a-date")).toBe("");
  });
});

describe("safeNumber", () => {
  it("returns number as-is", () => {
    expect(safeNumber(42)).toBe(42);
  });

  it("converts string to number", () => {
    expect(safeNumber("10")).toBe(10);
  });

  it("returns fallback for NaN", () => {
    expect(safeNumber("abc")).toBe(0);
    expect(safeNumber("abc", 5)).toBe(5);
  });

  it("returns fallback for Infinity", () => {
    expect(safeNumber(Infinity)).toBe(0);
  });
});

describe("stripPreview", () => {
  it("strips reply prefix", () => {
    expect(stripPreview("[reply:123] Hello")).toBe("Hello");
  });

  it("returns plain text unchanged", () => {
    expect(stripPreview("Hello world")).toBe("Hello world");
  });

  it("handles null/undefined", () => {
    expect(stripPreview(null)).toBe("");
    expect(stripPreview(undefined)).toBe("");
  });
});

describe("categoryLabel", () => {
  it("maps known categories", () => {
    expect(categoryLabel("announcement")).toBe("Announcement");
    expect(categoryLabel("team")).toBe("Team");
    expect(categoryLabel("coach_group")).toBe("Coach Group");
  });

  it("returns 'Group' for unknown/null", () => {
    expect(categoryLabel("other")).toBe("Group");
    expect(categoryLabel(null)).toBe("Group");
    expect(categoryLabel(undefined)).toBe("Group");
  });
});
