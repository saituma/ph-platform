import Constants from "expo-constants";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

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
  const raw = (fromProcess || fromExtra).replace(/\/+$/, "");
  // Guard against common misconfig where API base URL is pasted into auth base.
  // Worker auth helpers append `/api/...` paths themselves.
  const normalizedAuth = raw.replace(/\/api$/i, "");
  if (!normalizedAuth) return "";

  // If auth base resolves to the same origin as API, treat it as unset and
  // use Express `/auth/login` flow instead of worker endpoints.
  const apiBase = getApiBaseUrl().replace(/\/+$/, "");
  const normalizedApi = apiBase.replace(/\/api$/i, "");
  if (normalizedApi && normalizedAuth.toLowerCase() === normalizedApi.toLowerCase()) {
    return "";
  }
  return normalizedAuth;
}
