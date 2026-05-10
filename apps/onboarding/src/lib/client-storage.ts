import { decodeJwt } from "jose";
import {
	ONBOARDING_AUTH_TOKEN_STORAGE_KEY,
	type TokenStatus,
} from "@ph/auth";

const AUTH_TOKEN_KEY = ONBOARDING_AUTH_TOKEN_STORAGE_KEY;

/**
 * Onboarding stores the API access token in localStorage and sends it as a
 * Bearer header on every API call. The previous design mirrored the token into
 * an httpOnly cookie via /api/app/set-token, but the production deployment
 * (nginx serving a static SPA) has no Nitro server to handle that route, so the
 * cookie was never set and the portal would redirect-loop back to /login.
 */

export function getClientAuthToken(): string | null {
	if (typeof window === "undefined") return null;
	return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function getTokenStatus(): Promise<TokenStatus> {
	const token = getClientAuthToken();
	if (!token) return { authenticated: false, expiresAt: null };

	const expiresAt = readJwtExp(token);
	if (expiresAt === null) {
		// Token has no exp claim — treat as valid indefinitely.
		return { authenticated: true, expiresAt: null };
	}
	if (Date.now() >= expiresAt * 1000) {
		window.localStorage.removeItem(AUTH_TOKEN_KEY);
		return { authenticated: false, expiresAt: null };
	}
	return { authenticated: true, expiresAt };
}

export function getAuthHeaders(): HeadersInit {
	const token = getClientAuthToken();
	if (!token) return {};
	return { Authorization: `Bearer ${token}` };
}

function readJwtExp(token: string): number | null {
	try {
		const payload = decodeJwt(token);
		return typeof payload.exp === "number" ? payload.exp : null;
	} catch {
		return null;
	}
}
