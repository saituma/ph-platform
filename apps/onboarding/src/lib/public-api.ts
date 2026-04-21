import { env } from "@/env";

/**
 * Base URL for the REST API (`/api/...`).
 *
 * When `VITE_PUBLIC_API_URL` is unset in the browser, returns `""` so requests are
 * same-origin (`/api/...`). The Vite dev server proxies `/api` to the real API
 * (see `vite.config.ts`) — this avoids accidentally calling the onboarding dev
 * server when it shares port 3000 with the default API host.
 *
 * During SSR (Node), there is no browser origin; falls back to the API’s default
 * dev bind (`127.0.0.1:3000`) unless `VITE_PUBLIC_API_URL` is set.
 */
export function getPublicApiBaseUrl(): string {
	const explicit = env.VITE_PUBLIC_API_URL?.replace(/\/+$/, "");
	if (explicit) return explicit;
	if (typeof window !== "undefined") return "";
	return "http://127.0.0.1:3000";
}

export function publicApiUrl(path: string): string {
	const p = path.startsWith("/") ? path : `/${path}`;
	const base = getPublicApiBaseUrl();
	return base === "" ? p : `${base}${p}`;
}
