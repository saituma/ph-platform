import { fitVideoBoxInMaxBounds } from "@/lib/video/fitVideoBox";

describe("fitVideoBoxInMaxBounds", () => {
  it("fits landscape video in bounds", () => {
    const result = fitVideoBoxInMaxBounds(400, 300, 16 / 9);
    expect(result.width).toBeCloseTo(400);
    expect(result.height).toBeCloseTo(225);
  });

  it("fits portrait video (9:16)", () => {
    const result = fitVideoBoxInMaxBounds(400, 300, 9 / 16);
    expect(result.height).toBeCloseTo(300);
    expect(result.width).toBeCloseTo(168.75);
  });

  it("handles square aspect ratio", () => {
    const result = fitVideoBoxInMaxBounds(400, 300, 1);
    expect(result.width).toBeCloseTo(300);
    expect(result.height).toBeCloseTo(300);
  });

  it("handles invalid inputs gracefully", () => {
    const result = fitVideoBoxInMaxBounds(0, 0, 0);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });
});
