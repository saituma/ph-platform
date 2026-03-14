const mockSecureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
};

const mockAsyncStorage = {
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
};

const mockStore = {
  getState: jest.fn(() => ({ user: { token: null, profile: {} } })),
  dispatch: jest.fn(),
};

jest.mock("expo-secure-store", () => ({
  __esModule: true,
  default: mockSecureStore,
  ...mockSecureStore,
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: mockAsyncStorage,
  ...mockAsyncStorage,
}));
jest.mock("@/store", () => ({ store: mockStore }));
jest.mock("@/store/slices/userSlice", () => ({
  setCredentials: jest.fn(() => ({ type: "setCredentials" })),
}));

describe("apiRequest", () => {
  beforeEach(() => {
    jest.resetModules();
    mockSecureStore.getItemAsync.mockReset();
    mockSecureStore.setItemAsync.mockReset();
    mockAsyncStorage.getItem.mockReset();
    mockAsyncStorage.setItem.mockReset();
    mockAsyncStorage.removeItem.mockReset();
    mockStore.getState.mockClear();
    mockStore.dispatch.mockClear();
    delete (global as any).fetch;
  });

  test("throws when EXPO_PUBLIC_API_BASE_URL is missing", async () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    jest.resetModules();
    const { apiRequest } = require("../lib/api");
    await expect(apiRequest("/health")).rejects.toThrow("API base URL not configured");
  });

  test("caches GET responses and avoids duplicate fetch", async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://example.com";
    mockAsyncStorage.getItem.mockResolvedValue(null);

    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, value: 123 }),
    }));
    (global as any).fetch = fetchMock;

    jest.resetModules();
    const { apiRequest } = require("../lib/api");
    const first = await apiRequest<{ ok: boolean; value: number }>("/ping");
    const second = await apiRequest<{ ok: boolean; value: number }>("/ping");

    expect(first.value).toBe(123);
    expect(second.value).toBe(123);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
