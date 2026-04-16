/**
 * The root `TabBar` (SwipeableTabLayout) is `position: absolute` at the bottom and
 * draws on top of tab content. Use this to lift scroll content and absolute overlays.
 *
 * Mirrors `TabBar.tsx`: `barHeight` (72 compact / 86 default) + `safeBottom`.
 */
export function mainTabBarTotalHeight(safeAreaBottom: number): number {
  const safeBottom = Math.max(safeAreaBottom, 12);
  const row = 86;
  return row + safeBottom;
}

/** Bottom padding for `ScrollView` `contentContainerStyle` so the last items clear the tab bar. */
export function trackingScrollBottomPad(insets: { bottom: number }): number {
  return mainTabBarTotalHeight(insets.bottom) + 20;
}
