import { beforeEach, describe, expect, it, vi } from "vitest";
import { setAuthToken } from "#/lib/client-storage";

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
			.mockResolvedValueOnce(new Response(null, { status: 403 }))
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({ authenticated: false, expiresAt: null }),
					{
						status: 200,
					},
				),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ ok: true }), { status: 200 }),
			);
		vi.stubGlobal("fetch", fetchMock);

		await setAuthToken(token);

		expect(localStorage.getItem("ph_auth_token")).toBe(token);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(fetchMock.mock.calls[0][0]).toBe("/api/app/set-token");
		expect(fetchMock.mock.calls[1][0]).toBe("/api/app/token-status");
		expect(fetchMock.mock.calls[2][0]).toBe("/api/app/set-token");
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

		const init = fetchMock.mock.calls[0][1] as RequestInit;
		const body = JSON.parse(String(init.body)) as { maxAgeSeconds: number };
		expect(body.maxAgeSeconds).toBeGreaterThan(7 * 24 * 60 * 60);
		expect(body.maxAgeSeconds).toBeLessThanOrEqual(30 * 24 * 60 * 60);
	});
});
