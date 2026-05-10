import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearAuthToken,
	getAuthHeaders,
	getClientAuthToken,
	getTokenStatus,
	setAuthToken,
} from "#/lib/client-storage";

function makeJwt(payload: Record<string, unknown>): string {
	const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
	const body = btoa(JSON.stringify(payload));
	return `${header}.${body}.`;
}

describe("client auth storage", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	it("setAuthToken persists the JWT to localStorage without server round-trips", async () => {
		const token = makeJwt({
			exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
		});
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		await setAuthToken(token);

		expect(localStorage.getItem("ph_auth_token")).toBe(token);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("getTokenStatus returns unauthenticated when localStorage is empty", async () => {
		const status = await getTokenStatus();
		expect(status.authenticated).toBe(false);
		expect(status.expiresAt).toBeNull();
	});

	it("getTokenStatus returns authenticated with expiresAt from the JWT", async () => {
		const expiresAt = Math.floor(Date.now() / 1000) + 3600;
		const token = makeJwt({ exp: expiresAt });
		await setAuthToken(token);

		const status = await getTokenStatus();
		expect(status.authenticated).toBe(true);
		expect(status.expiresAt).toBe(expiresAt);
	});

	it("getTokenStatus clears the token and reports unauthenticated when the JWT has expired", async () => {
		const token = makeJwt({ exp: Math.floor(Date.now() / 1000) - 60 });
		await setAuthToken(token);

		const status = await getTokenStatus();
		expect(status.authenticated).toBe(false);
		expect(localStorage.getItem("ph_auth_token")).toBeNull();
	});

	it("getAuthHeaders returns a Bearer header when a token is stored", async () => {
		const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
		await setAuthToken(token);

		expect(getAuthHeaders()).toEqual({ Authorization: `Bearer ${token}` });
	});

	it("getAuthHeaders returns no headers when no token is stored", () => {
		expect(getAuthHeaders()).toEqual({});
	});

	it("clearAuthToken removes the token from localStorage", async () => {
		const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
		await setAuthToken(token);
		expect(getClientAuthToken()).toBe(token);

		await clearAuthToken();
		expect(getClientAuthToken()).toBeNull();
	});
});
