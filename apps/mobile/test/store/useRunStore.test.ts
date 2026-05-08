jest.mock("expo-crypto", () => ({
  randomUUID: () => "mock-uuid",
}));

describe("useRunStore", () => {
  it("module exports exist", () => {
    const mod = require("@/store/useRunStore");
    expect(mod).toBeDefined();
  });
});
