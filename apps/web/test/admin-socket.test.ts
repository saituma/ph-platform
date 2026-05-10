// Tests for apps/web/lib/admin-socket.ts
// Verifies that the admin socket no longer reads accessTokenClient (browser-readable cookie)
// and instead uses a short-lived token fetched via the backend proxy.

// Mock socket.io-client before importing the module under test
const mockOn = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockIo = jest.fn((_url?: unknown, _opts?: unknown) => ({
  on: mockOn,
  connect: mockConnect,
  disconnect: mockDisconnect,
  io: { engine: { transport: { name: "polling" }, on: jest.fn() } },
}));

jest.mock("socket.io-client", () => ({
  io: (url: unknown, opts: unknown) => mockIo(url, opts),
}));

jest.mock("../lib/socket-url", () => ({
  resolveSocketUrl: () => "http://api.test",
}));

describe("admin-socket", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockIo.mockClear();
    mockOn.mockClear();
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "short.lived.socket.jwt", expiresAt: 9999999 }),
    });
    global.fetch = fetchMock;
    // Ensure document.cookie does not contain accessTokenClient
    Object.defineProperty(document, "cookie", {
      value: "",
      writable: true,
      configurable: true,
    });
    (process.env as Record<string, string>).NODE_ENV = "test";
  });

  afterEach(() => {
    // Reset the module-level socketRef by clearing module registry
    jest.resetModules();
  });

  it("creates a socket without reading accessTokenClient from document.cookie", async () => {
    // Set a forged accessTokenClient in document.cookie
    Object.defineProperty(document, "cookie", {
      value: "accessTokenClient=forged-long-lived-jwt",
      writable: true,
      configurable: true,
    });

    const { getOrCreateAdminSocket, resetAdminSocketForTests } = await import("../lib/admin-socket");
    resetAdminSocketForTests();
    getOrCreateAdminSocket();

    const [_url, options] = (mockIo.mock.calls[0] as unknown) as [string, { auth?: unknown }];

    // auth must be a function (callback pattern), never a static object with the forged token
    expect(typeof options.auth).toBe("function");
    // The static auth object must NOT contain the forged token
    expect(options.auth).not.toEqual({ token: "forged-long-lived-jwt" });
  });

  it("auth callback fetches token from /api/backend/auth/socket-token", async () => {
    const { getOrCreateAdminSocket, resetAdminSocketForTests } = await import("../lib/admin-socket");
    resetAdminSocketForTests();
    getOrCreateAdminSocket();

    const [_url, options] = (mockIo.mock.calls[0] as unknown) as [string, { auth: (cb: (d: unknown) => void) => void }];
    expect(typeof options.auth).toBe("function");

    const callback = jest.fn();
    options.auth(callback);
    // Wait for async fetch inside auth callback
    await new Promise((r) => setTimeout(r, 10));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/auth/socket-token",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(callback).toHaveBeenCalledWith({ token: "short.lived.socket.jwt" });
  });

  it("auth callback passes empty object when token fetch fails", async () => {
    fetchMock.mockRejectedValue(new Error("network error"));
    const { getOrCreateAdminSocket, resetAdminSocketForTests } = await import("../lib/admin-socket");
    resetAdminSocketForTests();
    getOrCreateAdminSocket();

    const [_url, options] = (mockIo.mock.calls[0] as unknown) as [string, { auth: (cb: (d: unknown) => void) => void }];
    const callback = jest.fn();
    options.auth(callback);
    await new Promise((r) => setTimeout(r, 10));

    expect(callback).toHaveBeenCalledWith({});
  });

  it("auth callback passes empty object when backend returns non-ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    const { getOrCreateAdminSocket, resetAdminSocketForTests } = await import("../lib/admin-socket");
    resetAdminSocketForTests();
    getOrCreateAdminSocket();

    const [_url, options] = (mockIo.mock.calls[0] as unknown) as [string, { auth: (cb: (d: unknown) => void) => void }];
    const callback = jest.fn();
    options.auth(callback);
    await new Promise((r) => setTimeout(r, 10));

    expect(callback).toHaveBeenCalledWith({});
  });
});
