/**
 * Single seam for all auth token operations.
 *
 * All reads and writes to SecureStore for auth credentials live here.
 * api.ts, AuthPersist, and SocketContext all call this module — none of them
 * touch SecureStore directly.
 */
import * as SecureStore from "expo-secure-store";
import { store } from "@/store";
import { setCredentials, logout } from "@/store/slices/userSlice";
import { isTransportFailure } from "@/lib/api/errorUtils";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

export const SESSION_KEYS = {
  token: "authToken",
  refreshToken: "authRefreshToken",
  id: "profileId",
  name: "profileName",
  email: "profileEmail",
  avatar: "profileAvatar",
} as const;

export type StoredProfile = {
  id: string | null;
  name: string | null;
  email: string | null;
  avatar: string | null;
};

export type HydratedSession = {
  token: string | null;
  refreshToken: string | null;
  profile: StoredProfile;
};

function isValidString(value: string | null | undefined): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value !== "null" &&
    value !== "undefined"
  );
}

/** Read all auth credentials from SecureStore in one call. */
export async function hydrateFromStorage(): Promise<HydratedSession> {
  const [rawToken, rawRefresh, id, name, email, avatar] = await Promise.all([
    SecureStore.getItemAsync(SESSION_KEYS.token),
    SecureStore.getItemAsync(SESSION_KEYS.refreshToken),
    SecureStore.getItemAsync(SESSION_KEYS.id),
    SecureStore.getItemAsync(SESSION_KEYS.name),
    SecureStore.getItemAsync(SESSION_KEYS.email),
    SecureStore.getItemAsync(SESSION_KEYS.avatar),
  ]);

  return {
    token: isValidString(rawToken) ? rawToken.trim() : null,
    refreshToken: isValidString(rawRefresh) ? rawRefresh : null,
    profile: {
      id: id ?? null,
      name: name ?? null,
      email: email ?? null,
      avatar: avatar ?? null,
    },
  };
}

/** Read the current access token: Redux first, SecureStore as fallback. */
export async function getToken(): Promise<string | null> {
  const fromRedux = store.getState().user.token;
  if (fromRedux) return fromRedux;
  try {
    const stored = await SecureStore.getItemAsync(SESSION_KEYS.token);
    return isValidString(stored) ? stored.trim() : null;
  } catch {
    return null;
  }
}

/** Persist credentials to SecureStore and update Redux. */
export async function persistCredentials(creds: {
  token: string;
  refreshToken: string | null;
  profile: StoredProfile;
}): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(SESSION_KEYS.token, creds.token),
    creds.refreshToken
      ? SecureStore.setItemAsync(SESSION_KEYS.refreshToken, creds.refreshToken)
      : SecureStore.deleteItemAsync(SESSION_KEYS.refreshToken),
    SecureStore.setItemAsync(SESSION_KEYS.id, creds.profile.id ?? ""),
    SecureStore.setItemAsync(SESSION_KEYS.name, creds.profile.name ?? ""),
    SecureStore.setItemAsync(SESSION_KEYS.email, creds.profile.email ?? ""),
    SecureStore.setItemAsync(SESSION_KEYS.avatar, creds.profile.avatar ?? ""),
  ]);

  store.dispatch(
    setCredentials({
      token: creds.token,
      refreshToken: creds.refreshToken,
      profile: creds.profile,
    }),
  );
}

/** Clear all credentials from SecureStore and Redux. */
export async function clearCredentials(): Promise<void> {
  await Promise.all(
    Object.values(SESSION_KEYS).map((key) =>
      SecureStore.deleteItemAsync(key).catch(() => {}),
    ),
  );
  store.dispatch(logout());
}

/** Also wipe env-flag forced logout path. */
export async function forceLogout(): Promise<void> {
  await clearCredentials();
}

// Token refresh is de-duped: concurrent callers share a single in-flight promise.
let refreshInFlight: Promise<string | null> | null = null;

function resolveApiBaseUrl(): string {
  const baseUrl = getApiBaseUrl() ?? "";
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

/**
 * Attempt to exchange a refresh token for a new access token.
 * Updates SecureStore and Redux on success.
 * Returns the new access token, or null if refresh fails.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const storedRefresh = await SecureStore.getItemAsync(SESSION_KEYS.refreshToken);
    if (!isValidString(storedRefresh)) return null;

    try {
      const apiBaseUrl = resolveApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });

      if (!response.ok) return null;

      const payload = await response.json().catch(() => null);
      const nextToken: string | undefined =
        typeof payload?.idToken === "string"
          ? payload.idToken
          : typeof payload?.accessToken === "string"
            ? payload.accessToken
            : undefined;

      if (!nextToken) return null;

      const nextRefresh =
        typeof payload?.refreshToken === "string" &&
        payload.refreshToken.trim().length > 0
          ? payload.refreshToken.trim()
          : storedRefresh;

      const state = store.getState();
      await persistCredentials({
        token: nextToken,
        refreshToken: nextRefresh,
        profile: state.user.profile,
      });

      return nextToken;
    } catch (e) {
      if (isTransportFailure(e)) {
        throw e instanceof Error ? e : new Error(String(e));
      }
      return null;
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}
