const secureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
};

const asyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

const storeMock = {
  getState: jest.fn(() => ({ user: { token: null, profile: {} } })),
  dispatch: jest.fn(),
};

jest.mock("expo-secure-store", () => secureStore);
jest.mock("@react-native-async-storage/async-storage", () => asyncStorage);
jest.mock("@/store", () => ({ store: storeMock }));
jest.mock("@/store/slices/userSlice", () => ({
  setCredentials: jest.fn(() => ({ type: "setCredentials" })),
}));

describe("apiRequest", () => {
  beforeEach(() => {
    jest.resetModules();
    secureStore.getItemAsync.mockReset();
    secureStore.setItemAsync.mockReset();
    asyncStorage.getItem.mockReset();
    asyncStorage.setItem.mockReset();
    asyncStorage.removeItem.mockReset();
    storeMock.getState.mockClear();
    storeMock.dispatch.mockClear();
    delete (global as any).fetch;
  });

  test("throws when EXPO_PUBLIC_API_BASE_URL is missing", async () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const { apiRequest } = await import("../lib/api");
    await expect(apiRequest("/health")).rejects.toThrow("API base URL not configured");
  });

  test("caches GET responses and avoids duplicate fetch", async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://example.com";
    asyncStorage.getItem.mockResolvedValue(null);

    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, value: 123 }),
    }));
    (global as any).fetch = fetchMock;

    const { apiRequest } = await import("../lib/api");

    const first = await apiRequest<{ ok: boolean; value: number }>("/ping");
    const second = await apiRequest<{ ok: boolean; value: number }>("/ping");

    expect(first.value).toBe(123);
    expect(second.value).toBe(123);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
