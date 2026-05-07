import { formatIsoShort, parseIntOrUndefined } from "@/lib/admin-utils";

describe("formatIsoShort", () => {
  it("returns dash for null/undefined", () => {
    expect(formatIsoShort(null)).toBe("—");
    expect(formatIsoShort(undefined)).toBe("—");
    expect(formatIsoShort("")).toBe("—");
  });

  it("formats valid ISO date", () => {
    const result = formatIsoShort("2024-01-15T10:30:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toBe("—");
  });

  it("returns raw string for invalid date", () => {
    expect(formatIsoShort("not-a-date")).toBe("not-a-date");
  });
});

describe("parseIntOrUndefined", () => {
  it("parses valid integers", () => {
    expect(parseIntOrUndefined("42")).toBe(42);
    expect(parseIntOrUndefined("0")).toBe(0);
  });

  it("returns undefined for empty string", () => {
    expect(parseIntOrUndefined("")).toBeUndefined();
    expect(parseIntOrUndefined("  ")).toBeUndefined();
  });

  it("returns undefined for negative numbers", () => {
    expect(parseIntOrUndefined("-1")).toBeUndefined();
  });

  it("returns undefined for non-numbers", () => {
    expect(parseIntOrUndefined("abc")).toBeUndefined();
  });

  it("floors decimal numbers", () => {
    expect(parseIntOrUndefined("3.7")).toBe(3);
  });
});
