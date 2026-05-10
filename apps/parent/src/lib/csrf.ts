import { CSRF_COOKIE_NAME } from "@ph/auth";

export function getCsrfToken(): string {
	if (typeof document === "undefined") return "";
	const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`));
	return match?.[1] ?? "";
}

export function csrfFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	const method = (init?.method ?? "GET").toUpperCase();
	const needsCsrf = !["GET", "HEAD", "OPTIONS"].includes(method);
	const headers = new Headers(init?.headers);

	if (needsCsrf && !headers.has("X-CSRF-Token")) {
		headers.set("X-CSRF-Token", getCsrfToken());
	}

	return fetch(input, { ...init, credentials: "include", headers });
}
