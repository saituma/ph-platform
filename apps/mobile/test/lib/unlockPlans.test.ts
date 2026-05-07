import { getUnlockingPlanNames, formatPlanList } from "@/lib/unlockPlans";

describe("getUnlockingPlanNames", () => {
  it("returns plans that unlock PHP tier", () => {
    expect(getUnlockingPlanNames("PHP")).toEqual(["PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"]);
  });

  it("returns plans for PHP_Premium", () => {
    expect(getUnlockingPlanNames("PHP_Premium")).toEqual(["PHP_Premium", "PHP_Premium_Plus"]);
  });

  it("returns plans for PHP_Pro", () => {
    expect(getUnlockingPlanNames("PHP_Pro")).toEqual(["PHP_Pro"]);
  });

  it("returns default for unknown tier", () => {
    expect(getUnlockingPlanNames("unknown")).toEqual(["PHP_Premium_Plus", "PHP_Pro"]);
  });
});

describe("formatPlanList", () => {
  it("returns empty string for empty array", () => {
    expect(formatPlanList([])).toBe("");
  });

  it("returns single name as-is", () => {
    expect(formatPlanList(["PHP_Pro"])).toBe("PHP_Pro");
  });

  it("joins two with 'or'", () => {
    expect(formatPlanList(["A", "B"])).toBe("A or B");
  });

  it("joins three with commas and 'or'", () => {
    expect(formatPlanList(["A", "B", "C"])).toBe("A, B, or C");
  });

  it("filters empty strings", () => {
    expect(formatPlanList(["A", "", "B"])).toBe("A or B");
  });
});
