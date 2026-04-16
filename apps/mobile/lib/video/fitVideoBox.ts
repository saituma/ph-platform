/**
 * Largest size that fits in [maxWidth × maxHeight] while preserving
 * aspectRatio = (video width) / (video height).
 * For portrait (9:16), this yields a narrow, tall box — Shorts/Reels style.
 */
export function fitVideoBoxInMaxBounds(
  maxWidth: number,
  maxHeight: number,
  aspectRatio: number,
): { width: number; height: number } {
  if (!(maxWidth > 0) || !(maxHeight > 0) || !(aspectRatio > 0)) {
    return {
      width: Math.max(0, maxWidth),
      height: Math.max(0, maxHeight),
    };
  }
  let w = maxWidth;
  let h = w / aspectRatio;
  if (h <= maxHeight) {
    return { width: w, height: h };
  }
  h = maxHeight;
  w = h * aspectRatio;
  return { width: w, height: h };
}
