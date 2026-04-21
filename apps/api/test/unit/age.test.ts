import { parseISODate, calculateAge, clampYouthAge, isBirthday } from "../../src/lib/age";

describe("lib/age", () => {
  describe("parseISODate", () => {
    test("TC-L001: parses valid ISO date strings", () => {
      const date = parseISODate("2010-05-20");
      expect(date?.getUTCFullYear()).toBe(2010);
      expect(date?.getUTCMonth()).toBe(4); // 0-indexed
      expect(date?.getUTCDate()).toBe(20);
    });

    test("TC-L002: returns null for invalid formats", () => {
      expect(parseISODate("20-05-2010")).toBeNull();
      expect(parseISODate("invalid")).toBeNull();
      expect(parseISODate("2010-13-01")).toBeNull();
    });
  });

  describe("calculateAge", () => {
    test("TC-L003: calculates age correctly before birthday", () => {
      const birth = new Date(Date.UTC(2010, 4, 20));
      const asOf = new Date(Date.UTC(2023, 4, 19));
      expect(calculateAge(birth, asOf)).toBe(12);
    });

    test("TC-L004: calculates age correctly on birthday", () => {
      const birth = new Date(Date.UTC(2010, 4, 20));
      const asOf = new Date(Date.UTC(2023, 4, 20));
      expect(calculateAge(birth, asOf)).toBe(13);
    });

    test("TC-L005: handles leap year birthdays (Feb 29)", () => {
      const birth = new Date(Date.UTC(2020, 1, 29));
      const asOf = new Date(Date.UTC(2023, 1, 28)); // Non-leap year, before birthday
      expect(calculateAge(birth, asOf)).toBe(2);

      const onBirthday = new Date(Date.UTC(2024, 1, 29)); // Next leap year
      expect(calculateAge(birth, onBirthday)).toBe(4);
    });
  });

  describe("clampYouthAge", () => {
    test("TC-L006: clamps youth age to minimum", () => {
      expect(clampYouthAge(5, "youth")).toBe(7);
      expect(clampYouthAge(10, "youth")).toBe(10);
    });

    test("TC-L007: does not clamp non-youth types", () => {
      expect(clampYouthAge(5, "pro")).toBe(5);
    });

    test("TC-L008: returns null for invalid input", () => {
      expect(clampYouthAge(null)).toBeNull();
      expect(clampYouthAge(NaN)).toBeNull();
    });
  });

  describe("isBirthday", () => {
    test("TC-L009: returns true on matching month and day", () => {
      const birth = new Date(Date.UTC(2010, 5, 15));
      const asOf = new Date(Date.UTC(2023, 5, 15));
      expect(isBirthday(birth, asOf)).toBe(true);
    });

    test("TC-L010: returns false on mismatch", () => {
      const birth = new Date(Date.UTC(2010, 5, 15));
      const asOf = new Date(Date.UTC(2023, 5, 16));
      expect(isBirthday(birth, asOf)).toBe(false);
    });
  });
});
