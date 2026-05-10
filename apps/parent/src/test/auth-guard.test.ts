/**
 * Tests the parent route guard invariants.
 *
 * _app.tsx beforeLoad mirrors this logic:
 *   const status = await getTokenStatus();
 *   if (!status.authenticated) throw redirect({ to: "/login" });
 *
 * We verify the building-blocks so that the guard behaves correctly
 * under all session conditions without needing a full router render.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTokenStatus } from "../lib/client-storage";

type GuardResult = { redirect: "/login" } | { pass: true };

async function simulateRouteGuard(): Promise<GuardResult> {
	const status = await getTokenStatus();
	if (!status.authenticated) return { redirect: "/login" };
	return { pass: true };
}

describe("parent route guard", () => {
	beforeEach(() => {
		vi.stubGlobal("window", {
			localStorage: {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
				removeItem: vi.fn(),
			},
		} as unknown as Window & typeof globalThis);
		vi.stubGlobal("document", { cookie: "" });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("redirects to /login when the session endpoint says unauthenticated", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(JSON.stringify({ authenticated: false, expiresAt: null }), { status: 200 })),
		);

		await expect(simulateRouteGuard()).resolves.toEqual({ redirect: "/login" });
	});

	it("redirects to /login when the session endpoint returns 401", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(null, { status: 401 })),
		);

		await expect(simulateRouteGuard()).resolves.toEqual({ redirect: "/login" });
	});

	it("redirects to /login when the session endpoint is unreachable", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => { throw new Error("network error"); }),
		);

		await expect(simulateRouteGuard()).resolves.toEqual({ redirect: "/login" });
	});

	it("allows through when the session is valid", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				new Response(
					JSON.stringify({ authenticated: true, expiresAt: Math.floor(Date.now() / 1000) + 3600 }),
					{ status: 200 },
				),
			),
		);

		await expect(simulateRouteGuard()).resolves.toEqual({ pass: true });
	});

	it("redirects even when localStorage holds a JWT but the server session is expired", async () => {
		vi.stubGlobal("window", {
			localStorage: {
				getItem: vi.fn(() => "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig"),
				setItem: vi.fn(),
				removeItem: vi.fn(),
			},
		} as unknown as Window & typeof globalThis);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(JSON.stringify({ authenticated: false, expiresAt: null }), { status: 200 })),
		);

		await expect(simulateRouteGuard()).resolves.toEqual({ redirect: "/login" });
	});
});
