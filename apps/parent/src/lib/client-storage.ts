import { isTokenExpired } from "./token-expiry";

const AUTH_TOKEN_KEY = "ph_parent_auth_token";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const CSRF_COOKIE_NAME = "__csrf";

export function getClientAuthToken(): string | null {
	if (typeof window === "undefined") return null;
	return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(AUTH_TOKEN_KEY, token);
	try {
		await fetch("/api/app/token-status", { method: "GET", credentials: "include", cache: "no-store" });
		const maxAgeSeconds = getSessionMaxAgeSeconds(token);
		const response = await postAuthToken(token, maxAgeSeconds);
		if (response.ok) return;
		await postAuthToken(token, maxAgeSeconds);
	} catch {
		// Best-effort
	}
}

export async function clearAuthToken(): Promise<void> {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(AUTH_TOKEN_KEY);
	try {
		await fetch("/api/app/clear-token", {
			method: "POST",
			credentials: "include",
			headers: { "X-CSRF-Token": getCsrfToken() },
		});
	} catch {
		// Best-effort
	}
}

export type TokenStatus = {
	authenticated: boolean;
	expiresAt: number | null;
};

export async function getTokenStatus(): Promise<TokenStatus> {
	try {
		const response = await fetch("/api/app/token-status", {
			method: "GET",
			credentials: "include",
			cache: "no-store",
		});
		if (response.ok) {
			const data = (await response.json().catch(() => null)) as TokenStatus | null;
			if (data?.authenticated) {
				return { authenticated: true, expiresAt: typeof data.expiresAt === "number" ? data.expiresAt : null };
			}
		}
	} catch {
		// Fallback below
	}

	const localToken = getClientAuthToken();
	if (!localToken || isTokenExpired(localToken)) {
		window.localStorage.removeItem(AUTH_TOKEN_KEY);
		return { authenticated: false, expiresAt: null };
	}

	const payload = parseJwtPayload(localToken);
	const expiresAt = typeof payload?.exp === "number" ? payload.exp : null;
	return { authenticated: true, expiresAt };
}

export function getAuthHeaders(): HeadersInit {
	const token = getClientAuthToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
	try {
		const payload = token.split(".")[1];
		if (!payload) return null;
		const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
		const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
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

function postAuthToken(token: string, maxAgeSeconds: number): Promise<Response> {
	return fetch("/api/app/set-token", {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
		body: JSON.stringify({ token, maxAgeSeconds }),
	});
}

function getCsrfToken(): string {
	if (typeof document === "undefined") return "";
	const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`));
	return match?.[1] ?? "";
}
