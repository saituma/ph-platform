import { haversineDistance } from "../haversine";

/**
 * Reduces dense/jittery GPS trails for map display (does not change stored distance).
 * Keeps first and last points; drops intermediates closer than `minSpacingMeters`.
 */
export function thinRoutePointsForDisplay<
  T extends { latitude: number; longitude: number },
>(coords: T[], minSpacingMeters: number): T[] {
  if (coords.length <= 2) return coords;
  const out: T[] = [coords[0]];
  let last = coords[0];
  for (let i = 1; i < coords.length - 1; i++) {
    const p = coords[i];
    const d = haversineDistance(
      last.latitude,
      last.longitude,
      p.latitude,
      p.longitude,
    );
    if (d >= minSpacingMeters) {
      out.push(p);
      last = p;
    }
  }
  out.push(coords[coords.length - 1]);
  return out;
}
