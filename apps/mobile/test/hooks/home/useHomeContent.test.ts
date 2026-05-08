jest.mock("@/store/hooks", () => ({
  useAppSelector: jest.fn().mockReturnValue(null),
  useAppDispatch: jest.fn().mockReturnValue(jest.fn()),
}));
jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

describe("useHomeContent", () => {
  it("module exports exist", () => {
    const mod = require("@/hooks/home/useHomeContent");
    expect(mod).toBeDefined();
  });
});
