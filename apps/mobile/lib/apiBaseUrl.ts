import Constants from "expo-constants";

/**
 * Production builds sometimes omit inlined `process.env.EXPO_PUBLIC_*` values.
 * `app.config.js` also sets `expo.extra.apiBaseUrl` so the URL is always available at runtime.
 */
export function getApiBaseUrl(): string {
  const fromProcess =
    typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_BASE_URL
      ? String(process.env.EXPO_PUBLIC_API_BASE_URL).trim()
      : "";
  const fromExtra =
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl?.trim() ?? "";
  return fromProcess || fromExtra;
}
