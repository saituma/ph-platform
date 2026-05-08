jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/store/hooks", () => ({
  useAppSelector: jest.fn().mockReturnValue(null),
  useAppDispatch: jest.fn().mockReturnValue(jest.fn()),
}));

describe("auth/refreshTeamMembershipFromMe", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/auth/refreshTeamMembershipFromMe");
    expect(mod).toBeDefined();
  });
});
