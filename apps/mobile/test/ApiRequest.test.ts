import { apiRequest, clearApiCache } from "../lib/api";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { store } from "@/store";

// Mock dependencies
jest.mock("expo-secure-store");
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock("@/lib/apiBaseUrl");
jest.mock("@/store", () => ({
  store: {
    getState: jest.fn(),
    dispatch: jest.fn(),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe("lib/api - apiRequest", () => {
  const mockBaseUrl = "https://api.example.com";
  
  beforeEach(() => {
    jest.clearAllMocks();
    clearApiCache();
    (getApiBaseUrl as jest.Mock).mockReturnValue(mockBaseUrl);
    (store.getState as jest.Mock).mockReturnValue({ user: { token: null, profile: {} } });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  const mockResponse = (status: number, data: any) => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    });
  };

  test("TC-API001: normalizes base URL and path", async () => {
    mockResponse(200, { ok: true });
    await apiRequest("test");
    expect(global.fetch).toHaveBeenCalledWith("https://api.example.com/api/test", expect.anything());
  });

  test("TC-API002: uses token from store if provided", async () => {
    (store.getState as jest.Mock).mockReturnValue({ user: { token: "store-tok" } });
    mockResponse(200, {});
    await apiRequest("t");
    expect(global.fetch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer store-tok" }),
    }));
  });

  test("TC-API003: uses token from SecureStore if not in store", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("secure-tok");
    mockResponse(200, {});
    await apiRequest("t");
    expect(global.fetch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer secure-tok" }),
    }));
  });

  test("TC-API004: caches GET requests", async () => {
    mockResponse(200, { data: "cached" });
    await apiRequest("data"); // first call
    await apiRequest("data"); // second call (should use cache)
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("TC-API005: skips cache if skipCache is true", async () => {
    mockResponse(200, { data: "fresh" });
    await apiRequest("data", { skipCache: true });
    await apiRequest("data", { skipCache: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("TC-API006: throws error on non-ok status", async () => {
    mockResponse(400, { error: "Bad Request" });
    await expect(apiRequest("t")).rejects.toThrow("400 Bad Request");
  });

  test("TC-API007: handles 404 with fallback URL attempt", async () => {
    // 1st call 404 on /api/test
    // 2nd call (fallback) 200 on /test
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 404, text: () => Promise.resolve("Not Found") })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{"ok":true}') });

    const res = await apiRequest("test");
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(res).toEqual({ ok: true });
  });

  test("TC-API008: handles transport failure (TypeError)", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError("Network request failed"));
    await expect(apiRequest("t")).rejects.toThrow("Network request failed");
  });

  test("TC-API009: handles timeout via AbortController", async () => {
    // AbortError is handled by catch block
    const abortErr = new Error("Aborted");
    abortErr.name = "AbortError";
    (global.fetch as jest.Mock).mockRejectedValue(abortErr);
    
    await expect(apiRequest("t", { timeoutMs: 100 })).rejects.toThrow("Request timed out after 100ms");
  });

  test("TC-API010: sends POST body as JSON", async () => {
    mockResponse(200, {});
    const body = { key: "val" };
    await apiRequest("t", { method: "POST", body });
    expect(global.fetch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      method: "POST",
      body: JSON.stringify(body),
    }));
  });

  test("TC-API011: custom headers are merged", async () => {
    mockResponse(200, {});
    await apiRequest("t", { headers: { "X-Custom": "val" } });
    expect(global.fetch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      headers: expect.objectContaining({ "X-Custom": "val", "Content-Type": "application/json" }),
    }));
  });

  test("TC-API012: returns parsed JSON", async () => {
    const data = { id: 123 };
    mockResponse(200, data);
    const res = await apiRequest("t");
    expect(res).toEqual(data);
  });

  test("TC-API013: handles empty response text", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(""),
    });
    await expect(apiRequest("t")).rejects.toThrow("Invalid response from server");
  });

  test("TC-API014: handles invalid JSON response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue("invalid-json"),
    });
    await expect(apiRequest("t")).rejects.toThrow("Invalid response from server");
  });

  test("TC-API015: clearApiCache clears local Map and AsyncStorage", () => {
    clearApiCache();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("ph_api_cache_v2");
  });

  test("TC-API016: forceRefresh bypasses and replaces cache", async () => {
    mockResponse(200, { v: 1 });
    await apiRequest("d"); // cache v1
    mockResponse(200, { v: 2 });
    const res = await apiRequest("d", { forceRefresh: true });
    expect(res).toEqual({ v: 2 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("TC-API017: suppresses log for specified status codes", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();
    mockResponse(404, { message: "Not found" });
    await expect(apiRequest("t", { suppressStatusCodes: [404] })).rejects.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test("TC-API018: extracts error message from complex payload", async () => {
    mockResponse(400, { details: { fieldErrors: "Invalid Email" } });
    await expect(apiRequest("t")).rejects.toThrow(/400.*Invalid Email/);
  });

  test("TC-API019: handles 401 logout if no refresh available", async () => {
    mockResponse(401, { error: "Expired" });
    // refreshAuthToken returns null if no refreshToken in SecureStore
    await expect(apiRequest("t", { token: "old" })).rejects.toThrow("401");
    expect(store.dispatch).toHaveBeenCalled(); // logout
  });

  test("TC-API020: prefetches by calling apiRequest with forceRefresh", async () => {
    mockResponse(200, {});
    await apiRequest("path", { forceRefresh: true }); // Call directly to verify it triggers fetch
    expect(global.fetch).toHaveBeenCalled();
  });
});
