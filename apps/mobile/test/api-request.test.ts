import { apiRequest } from "@/lib/api";

describe("mobile apiRequest", () => {
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3001/api";
    global.fetch = jest.fn();
    warnSpy.mockClear();
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it("throws when API base url is not configured", async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "";
    await expect(apiRequest("/health")).rejects.toThrow("API base URL not configured");
  });

  it("returns parsed payload on success", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ status: "ok" }),
    });

    await expect(apiRequest<{ status: string }>("/health")).resolves.toEqual({ status: "ok" });
  });

  it("formats non-2xx errors with details", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: "Invalid request", details: { fieldErrors: { email: ["Required"] } } }),
    });

    await expect(apiRequest("/auth/login", { method: "POST", body: {} })).rejects.toThrow(
      '400 Invalid request: {"email":["Required"]}',
    );
  });

  it("wraps network errors with endpoint", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network request failed"));

    await expect(apiRequest("/messages")).rejects.toThrow(
      "Cannot reach API at http://localhost:3001/api/messages. Network request failed",
    );
  });
});
