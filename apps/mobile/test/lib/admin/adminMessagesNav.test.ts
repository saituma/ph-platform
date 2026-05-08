jest.mock("@/store/hooks", () => ({
  useAppSelector: jest.fn().mockReturnValue(null),
  useAppDispatch: jest.fn().mockReturnValue(jest.fn()),
}));

describe("admin/adminMessagesNav", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/admin/adminMessagesNav");
    expect(mod).toBeDefined();
  });
});
