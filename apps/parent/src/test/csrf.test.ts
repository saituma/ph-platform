import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { csrfFetch } from "../lib/csrf";

function getCallHeaders(fetchMock: ReturnType<typeof vi.fn>, callIndex = 0): Headers {
	// biome-ignore lint/suspicious/noExplicitAny: test helper
	const init = (fetchMock.mock.calls[callIndex] as any)?.[1] as RequestInit | undefined;
	return new Headers(init?.headers);
}

describe("parent csrfFetch — cookie-only auth", () => {
	beforeEach(() => {
		vi.stubGlobal("window", {
			localStorage: {
				getItem: vi.fn(() => "some-stored-jwt"),
				setItem: vi.fn(),
				removeItem: vi.fn(),
			},
		} as unknown as Window & typeof globalThis);
		vi.stubGlobal("document", { cookie: "__csrf=test-csrf-token" });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("sends credentials: include so the httpOnly session cookie is forwarded", async () => {
		const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		await csrfFetch("/api/portal/me");

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/portal/me",
			expect.objectContaining({ credentials: "include" }),
		);
	});

	it("does not inject an Authorization header even when localStorage holds a token", async () => {
		const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		await csrfFetch("/api/portal/me");

		expect(getCallHeaders(fetchMock).has("Authorization")).toBe(false);
	});

	it("adds X-CSRF-Token for POST requests", async () => {
		const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		await csrfFetch("/api/portal/guardian/feedback", { method: "POST" });

		expect(getCallHeaders(fetchMock).get("X-CSRF-Token")).toBe("test-csrf-token");
	});

	it("does not add X-CSRF-Token for GET requests", async () => {
		const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		await csrfFetch("/api/portal/me", { method: "GET" });

		expect(getCallHeaders(fetchMock).has("X-CSRF-Token")).toBe(false);
	});

	it("does not add X-CSRF-Token for HEAD or OPTIONS requests", async () => {
		const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		await csrfFetch("/api/portal/me", { method: "HEAD" });
		await csrfFetch("/api/portal/me", { method: "OPTIONS" });

		expect(getCallHeaders(fetchMock, 0).has("X-CSRF-Token")).toBe(false);
		expect(getCallHeaders(fetchMock, 1).has("X-CSRF-Token")).toBe(false);
	});
});
