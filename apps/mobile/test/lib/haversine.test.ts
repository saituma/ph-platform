import { haversineDistance } from "@/lib/haversine";

describe("haversineDistance", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistance(0, 0, 0, 0)).toBe(0);
    expect(haversineDistance(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it("computes known distance NYC to LA (~3944 km)", () => {
    const d = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(d).toBeGreaterThan(3_900_000);
    expect(d).toBeLessThan(4_000_000);
  });

  it("computes short distance (~111 km for 1 degree latitude)", () => {
    const d = haversineDistance(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("is symmetric", () => {
    const d1 = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    const d2 = haversineDistance(48.8566, 2.3522, 51.5074, -0.1278);
    expect(d1).toBeCloseTo(d2, 5);
  });
});
