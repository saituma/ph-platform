jest.mock("expo-image", () => ({
  Image: { prefetch: jest.fn() },
}), { virtual: true });
jest.mock("expo-file-system", () => ({
  documentDirectory: "/mock/",
  cacheDirectory: "/mock/cache/",
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  downloadAsync: jest.fn().mockResolvedValue({ uri: "/mock/file" }),
}), { virtual: true });

describe("messages/prefetchChatMedia", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/messages/prefetchChatMedia");
    expect(mod).toBeDefined();
  });
});
