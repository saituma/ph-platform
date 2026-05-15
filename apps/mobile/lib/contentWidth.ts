import { Dimensions, Platform, useWindowDimensions } from "react-native";

const MAX = 560;

/** Hook version — reactive to orientation/window changes. Use inside components. */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return Platform.isPad ? Math.min(width, MAX) : width;
}

/** Static version — for module-level constants and StyleSheet.create. */
export function getContentWidth(): number {
  const { width } = Dimensions.get("window");
  return Platform.isPad ? Math.min(width, MAX) : width;
}
