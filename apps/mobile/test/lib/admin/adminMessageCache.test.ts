jest.mock("@/store/hooks", () => ({
  useAppSelector: jest.fn().mockReturnValue(null),
  useAppDispatch: jest.fn().mockReturnValue(jest.fn()),
}));

describe("admin/adminMessageCache", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/admin/adminMessageCache");
    expect(mod).toBeDefined();
  });
});
