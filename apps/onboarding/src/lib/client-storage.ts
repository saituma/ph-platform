import {
	CSRF_COOKIE_NAME,
	ONBOARDING_AUTH_TOKEN_STORAGE_KEY,
	SESSION_MAX_AGE_SECONDS,
	type TokenStatus,
} from "@ph/auth";

const AUTH_TOKEN_KEY = ONBOARDING_AUTH_TOKEN_STORAGE_KEY;
// TODO: 30-day session with no idle timeout. Add idle timeout (e.g. 30 min inactivity) post-launch.

/**
 * Client-only onboarding stores the API access token in browser storage and
 * mirrors it into an httpOnly cookie via setAuthToken().
 *
 * SECURITY NOTE: Storing JWT in localStorage is a known XSS risk. The primary
 * auth token is also mirrored into an httpOnly cookie via setAuthToken().
 * Data services no longer read from localStorage for Authorization headers —
 * they rely solely on the httpOnly cookie sent with credentials: "include".
 * clearAuthToken() ensures localStorage is cleaned on logout to limit exposure.
 */

// @deprecated No longer used for API auth. localStorage token is no longer sent as a Bearer header.
export function getClientAuthToken(): string | null {
	if (typeof window === "undefined") return null;
	return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(AUTH_TOKEN_KEY, token);

	// Mirror auth token into an httpOnly cookie session for reload/restart persistence.
	try {
		// Seed the CSRF cookie first so the POST doesn't race a missing token.
		await fetch("/api/app/token-status", {
			method: "GET",
			credentials: "include",
			cache: "no-store",
		});

		const maxAgeSeconds = getSessionMaxAgeSeconds(token);
		const response = await postAuthToken(token, maxAgeSeconds);
		if (response.ok) return;

		// Retry once — the GET above should have seeded the CSRF cookie, but
		// some browsers delay cookie visibility for the current document.
		await postAuthToken(token, maxAgeSeconds);
	} catch {
		// Best-effort only; local token still allows authenticated API calls.
	}
}

export async function clearAuthToken(): Promise<void> {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(AUTH_TOKEN_KEY);

	try {
		await fetch("/api/app/clear-token", {
			method: "POST",
			credentials: "include",
			headers: {
				"X-CSRF-Token": getCsrfToken(),
			},
		});
	} catch {
		// Best-effort only.
	}
}

export async function getTokenStatus(): Promise<TokenStatus> {
	try {
		const response = await fetch("/api/app/token-status", {
			method: "GET",
			credentials: "include",
			cache: "no-store",
		});
		if (response.ok) {
			const data = (await response
				.json()
				.catch(() => null)) as TokenStatus | null;
			if (data?.authenticated) {
				return {
					authenticated: true,
					expiresAt: typeof data.expiresAt === "number" ? data.expiresAt : null,
				};
			}
		}
	} catch {
		// Server unreachable — treat as unauthenticated; do not fall back to localStorage.
	}

	return { authenticated: false, expiresAt: null };
}

/**
 * @deprecated No longer injects Bearer tokens. Callers should rely on
 * credentials: "include" + httpOnly cookie auth. Returns an empty object.
 * Kept for backwards compatibility while onboarding step files are migrated.
 */
export function getAuthHeaders(): HeadersInit {
	return {};
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
	try {
		const payload = token.split(".")[1];
		if (!payload) return null;
		const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
		const padded = normalized.padEnd(
			normalized.length + ((4 - (normalized.length % 4)) % 4),
			"=",
		);
		return JSON.parse(window.atob(padded));
	} catch {
		return null;
	}
}

function getSessionMaxAgeSeconds(token: string): number {
	const payload = parseJwtPayload(token);
	const expiresAt = typeof payload?.exp === "number" ? payload.exp : null;
	if (!expiresAt) return SESSION_MAX_AGE_SECONDS;

	const secondsUntilExpiry = Math.floor(expiresAt - Date.now() / 1000);
	if (secondsUntilExpiry <= 0) return 1;
	return Math.min(secondsUntilExpiry, SESSION_MAX_AGE_SECONDS);
}

function postAuthToken(
	token: string,
	maxAgeSeconds: number,
): Promise<Response> {
	return fetch("/api/app/set-token", {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			"X-CSRF-Token": getCsrfToken(),
		},
		body: JSON.stringify({ token, maxAgeSeconds }),
	});
}

function getCsrfToken(): string {
	if (typeof document === "undefined") return "";
	const match = document.cookie.match(
		new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`),
	);
	return match?.[1] ?? "";
}
