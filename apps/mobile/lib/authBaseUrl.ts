import Constants from "expo-constants";

/**
 * Cloudflare Worker base URL (Better Auth + `/api/app/token`), without trailing slash.
 * When unset, login falls back to Express `POST /api/auth/login` on `EXPO_PUBLIC_API_BASE_URL`.
 */
export function getAuthBaseUrl(): string {
  const fromProcess =
    typeof process !== "undefined" && process.env?.EXPO_PUBLIC_AUTH_BASE_URL
      ? String(process.env.EXPO_PUBLIC_AUTH_BASE_URL).trim()
      : "";
  const fromExtra =
    (Constants.expoConfig?.extra as { authBaseUrl?: string } | undefined)?.authBaseUrl?.trim() ?? "";
  return (fromProcess || fromExtra).replace(/\/+$/, "");
}
