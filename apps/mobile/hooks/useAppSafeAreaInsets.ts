import { useMemo } from "react";
import { EdgeInsets, useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * App-wide safe-area insets.
 *
 * We hide the system status bar in the mobile app and want to reclaim the
 * "status bar" vertical space for app UI. On devices without a notch/cutout,
 * the top inset is typically just the status bar height (≈20–24). On devices
 * with a notch/cutout, the top inset is much larger (≈44+), and we still want
 * to respect that to avoid clipping.
 */
export function useAppSafeAreaInsets(): EdgeInsets {
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const top = insets.top > 28 ? insets.top : 0;
    return { ...insets, top };
  }, [insets.bottom, insets.left, insets.right, insets.top]);
}

