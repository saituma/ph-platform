import { getClientAuthToken } from "./client-storage";

const CSRF_COOKIE_NAME = "__csrf";

export function getCsrfToken(): string {
	if (typeof document === "undefined") return "";
	const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`));
	return match?.[1] ?? "";
}

export function csrfFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	const method = (init?.method ?? "GET").toUpperCase();
	const needsCsrf = !["GET", "HEAD", "OPTIONS"].includes(method);
	const headers = new Headers(init?.headers);
	const token = getClientAuthToken();

	if (token && !headers.has("Authorization")) {
		headers.set("Authorization", `Bearer ${token}`);
	}
	if (needsCsrf && !headers.has("X-CSRF-Token")) {
		headers.set("X-CSRF-Token", getCsrfToken());
	}

	return fetch(input, { ...init, credentials: "include", headers });
}
