import { decodeJwt } from "jose";
import {
	ONBOARDING_AUTH_TOKEN_STORAGE_KEY,
	type TokenStatus,
} from "@ph/auth";
import { config } from "./config";

const AUTH_TOKEN_KEY = ONBOARDING_AUTH_TOKEN_STORAGE_KEY;

export function getClientAuthToken(): string | null {
	if (typeof window === "undefined") return null;
	return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
	if (typeof window === "undefined") return;
	// Keep localStorage for the Bearer-header flow used by older service calls.
	window.localStorage.setItem(AUTH_TOKEN_KEY, token);
	// Mirror into httpOnly cookie so XSS cannot steal the token via localStorage.
	// This call is client-side — it works in static SPA deployments unlike the
	// previous SSR-based approach.
	try {
		const exp = readJwtExp(token);
		const maxAgeSeconds = exp ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : undefined;
		await fetch(`${config.api.baseUrl}/api/app/set-token`, {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token, ...(maxAgeSeconds !== undefined && { maxAgeSeconds }) }),
		});
	} catch {
		// Non-fatal: localStorage still provides auth, httpOnly mirroring is best-effort.
	}
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
