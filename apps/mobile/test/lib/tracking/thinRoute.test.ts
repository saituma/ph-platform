import { thinRoutePointsForDisplay } from "@/lib/tracking/thinRoute";

describe("thinRoutePointsForDisplay", () => {
  it("returns same array for 2 or fewer points", () => {
    const pts = [{ latitude: 0, longitude: 0 }];
    expect(thinRoutePointsForDisplay(pts, 10)).toEqual(pts);
    expect(thinRoutePointsForDisplay([], 10)).toEqual([]);
  });

  it("always keeps first and last points", () => {
    const pts = [
      { latitude: 0, longitude: 0 },
      { latitude: 0.00001, longitude: 0 },
      { latitude: 0.00002, longitude: 0 },
      { latitude: 1, longitude: 0 },
    ];
    const result = thinRoutePointsForDisplay(pts, 100000);
    expect(result[0]).toEqual(pts[0]);
    expect(result[result.length - 1]).toEqual(pts[pts.length - 1]);
  });

  it("removes points closer than minSpacing", () => {
    const pts = [
      { latitude: 0, longitude: 0 },
      { latitude: 0.000001, longitude: 0 },
      { latitude: 0.000002, longitude: 0 },
      { latitude: 1, longitude: 0 },
    ];
    const result = thinRoutePointsForDisplay(pts, 1000);
    expect(result.length).toBeLessThan(pts.length);
  });
});
