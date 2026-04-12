import { Platform } from "react-native";

/** Tracking UIs use OpenStreetMap (Leaflet/WebView) on Android; iOS uses react-native-maps (Apple Maps). */
export function shouldUseOsmMap(): boolean {
  return Platform.OS === "android";
}
