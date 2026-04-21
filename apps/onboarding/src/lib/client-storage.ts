/**
 * Read `auth_token` from `localStorage` in the browser only.
 * Route loaders and other code can run during SSR — `window` / `localStorage` are unavailable there.
 */
export function getClientAuthToken(): string | null {
	if (typeof window === "undefined") return null;
	try {
		const store = window.localStorage;
		if (!store || typeof store.getItem !== "function") return null;
		return store.getItem("auth_token");
	} catch {
		return null;
	}
}
