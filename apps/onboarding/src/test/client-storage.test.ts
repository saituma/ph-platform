import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTokenStatus, setAuthToken } from "#/lib/client-storage";

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

	it("retries cookie persistence after CSRF bootstrap", async () => {
		const token = makeJwt({
			exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
		});
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({ authenticated: false, expiresAt: null }),
					{
						status: 200,
					},
				),
			)
			.mockResolvedValueOnce(new Response(null, { status: 403 }))
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ ok: true }), { status: 200 }),
			);
		vi.stubGlobal("fetch", fetchMock);

		await setAuthToken(token);

		expect(localStorage.getItem("ph_auth_token")).toBe(token);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(fetchMock.mock.calls[0][0]).toBe("/api/app/token-status");
		expect(fetchMock.mock.calls[1][0]).toBe("/api/app/set-token");
		expect(fetchMock.mock.calls[2][0]).toBe("/api/app/set-token");
	});

	it("getTokenStatus returns unauthenticated when server returns non-ok", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 401 })),
		);
		const status = await getTokenStatus();
		expect(status.authenticated).toBe(false);
	});

	it("getTokenStatus returns unauthenticated when server throws (no localStorage fallback)", async () => {
		localStorage.setItem("ph_auth_token", "some.local.token");
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
		const status = await getTokenStatus();
		expect(status.authenticated).toBe(false);
	});

	it("getTokenStatus returns unauthenticated when response body is not valid JSON", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("bad gateway", { status: 200 })),
		);
		const status = await getTokenStatus();
		expect(status.authenticated).toBe(false);
	});

	it("getTokenStatus returns authenticated with expiresAt from server", async () => {
		const expiresAt = Math.floor(Date.now() / 1000) + 3600;
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ authenticated: true, expiresAt }), { status: 200 }),
			),
		);
		const status = await getTokenStatus();
		expect(status.authenticated).toBe(true);
		expect(status.expiresAt).toBe(expiresAt);
	});

	it("requests a cookie lifetime beyond one week for long-lived API tokens", async () => {
		const token = makeJwt({
			exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
		});
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), { status: 200 }),
			);
		vi.stubGlobal("fetch", fetchMock);

		await setAuthToken(token);

		const init = fetchMock.mock.calls[1][1] as RequestInit;
		const body = JSON.parse(String(init.body)) as { maxAgeSeconds: number };
		expect(body.maxAgeSeconds).toBeGreaterThan(7 * 24 * 60 * 60);
		expect(body.maxAgeSeconds).toBeLessThanOrEqual(30 * 24 * 60 * 60);
	});
});
