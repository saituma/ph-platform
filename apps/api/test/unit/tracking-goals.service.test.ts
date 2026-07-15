import { calcPercentage } from "../../src/services/tracking-goals.service";

describe("calcPercentage", () => {
  it("returns 0 when target is zero or negative", () => {
    expect(calcPercentage(5, 0)).toBe(0);
    expect(calcPercentage(5, -10)).toBe(0);
  });

  it("clamps progress below target to a rounded percentage", () => {
    expect(calcPercentage(1, 4)).toBe(25);
    expect(calcPercentage(0, 10)).toBe(0);
  });

  it("clamps progress at or above target to 100", () => {
    expect(calcPercentage(10, 10)).toBe(100);
    expect(calcPercentage(25, 10)).toBe(100);
  });

  it("never returns a negative percentage for negative progress", () => {
    expect(calcPercentage(-5, 10)).toBe(0);
  });

  it("rounds to the nearest whole percent", () => {
    expect(calcPercentage(1, 3)).toBe(33);
    expect(calcPercentage(2, 3)).toBe(67);
  });
});
