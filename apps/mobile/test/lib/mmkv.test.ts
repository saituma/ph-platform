jest.mock("react-native-mmkv", () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}), { virtual: true });

describe("mmkv", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/mmkv");
    expect(mod).toBeDefined();
  });
});
