import { getLastNDaysLabel, getLastNDaysRangeLabel } from "@/lib/tracking/dateRange";

describe("getLastNDaysLabel", () => {
  it("returns 'Today' for 1 or less", () => {
    expect(getLastNDaysLabel(1)).toBe("Today");
    expect(getLastNDaysLabel(0)).toBe("Today");
    expect(getLastNDaysLabel(-1)).toBe("Today");
  });

  it("returns 'Last N days' for N > 1", () => {
    expect(getLastNDaysLabel(7)).toBe("Last 7 days");
    expect(getLastNDaysLabel(30)).toBe("Last 30 days");
  });

  it("floors decimal values", () => {
    expect(getLastNDaysLabel(7.5)).toBe("Last 7 days");
  });
});

describe("getLastNDaysRangeLabel", () => {
  it("returns single date for 1 day", () => {
    const now = new Date("2024-06-15T12:00:00Z");
    const result = getLastNDaysRangeLabel(1, now);
    expect(result).toBeTruthy();
  });

  it("returns range for multiple days", () => {
    const now = new Date("2024-06-15T12:00:00Z");
    const result = getLastNDaysRangeLabel(7, now);
    expect(result).toContain("–");
  });
});
