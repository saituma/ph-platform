import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAuthToken, getClientAuthToken, getTokenStatus, setAuthToken } from "../lib/client-storage";

type StoredValues = Record<string, string>;

function createLocalStorage() {
	const values: StoredValues = {};
	return {
		getItem: vi.fn((key: string) => values[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			values[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete values[key];
		}),
	};
}

describe("parent client session storage", () => {
	let localStorage: ReturnType<typeof createLocalStorage>;

	beforeEach(() => {
		localStorage = createLocalStorage();
		vi.stubGlobal("window", { localStorage } as unknown as Window & typeof globalThis);
		vi.stubGlobal("document", { cookie: "__csrf=csrf-token" } as Document);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reads session status from the cookie-backed API route", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(JSON.stringify({ authenticated: true, expiresAt: 123 }), { status: 200 })),
		);

		await expect(getTokenStatus()).resolves.toEqual({ authenticated: true, expiresAt: 123 });
	});

	it("logs out by clearing local fallback state and the cookie-backed session", async () => {
		localStorage.setItem("ph_parent_auth_token", "token");
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		await clearAuthToken();

		expect(getClientAuthToken()).toBeNull();
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/app/logout",
			expect.objectContaining({
				method: "POST",
				credentials: "include",
				headers: { "X-CSRF-Token": "csrf-token" },
			}),
		);
	});

	it("returns unauthenticated for missing or expired session responses", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(JSON.stringify({ authenticated: false, expiresAt: null }), { status: 200 })),
		);

		await expect(getTokenStatus()).resolves.toEqual({ authenticated: false, expiresAt: null });
	});

	it("does not treat localStorage alone as an authenticated session", async () => {
		localStorage.setItem("ph_parent_auth_token", "token");
		vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));

		await expect(getTokenStatus()).resolves.toEqual({ authenticated: false, expiresAt: null });
		expect(getClientAuthToken()).toBe("token");
	});

	it("returns unauthenticated when the session endpoint returns 401", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(null, { status: 401 })),
		);

		await expect(getTokenStatus()).resolves.toEqual({ authenticated: false, expiresAt: null });
	});

	it("returns unauthenticated when the session endpoint returns a non-JSON body", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("Internal Server Error", { status: 500 })),
		);

		await expect(getTokenStatus()).resolves.toEqual({ authenticated: false, expiresAt: null });
	});

	it("returns unauthenticated when the session response is missing the authenticated field", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(JSON.stringify({ expiresAt: null }), { status: 200 })),
		);

		await expect(getTokenStatus()).resolves.toEqual({ authenticated: false, expiresAt: null });
	});

	it("mirrors a fresh login token into the cookie-backed session route", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify({ authenticated: false, expiresAt: null }), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		await setAuthToken("header.payload.signature");

		expect(getClientAuthToken()).toBe("header.payload.signature");
		expect(fetchMock).toHaveBeenLastCalledWith(
			"/api/app/set-token",
			expect.objectContaining({
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": "csrf-token",
				},
			}),
		);
	});
});
