import { env } from "#/env";

function resolveApiBaseUrl(): string {
	const configured = env.VITE_PUBLIC_API_URL;
	if (!import.meta.env.PROD && typeof window !== "undefined") {
		const host = window.location.hostname;
		if (host === "localhost" || host === "127.0.0.1") {
			return "http://localhost:3001";
		}
	}
	if (configured) return configured;
	if (import.meta.env.PROD) {
		throw new Error("[config] VITE_PUBLIC_API_URL is required in production.");
	}
	return "http://localhost:3001";
}

export const config = {
	api: { baseUrl: resolveApiBaseUrl() },
	app: { name: "PH Parent Portal", version: "1.0.0" },
} as const;
