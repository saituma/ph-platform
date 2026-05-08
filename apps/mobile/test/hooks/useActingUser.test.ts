jest.mock("@/store/hooks", () => ({
  useAppSelector: jest.fn(),
}));
jest.mock("@/store/slices/userSlice", () => ({
  selectIsStaffRole: jest.fn(),
}));

import { useAppSelector } from "@/store/hooks";

describe("useActingUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("module imports without error", () => {
    (useAppSelector as jest.Mock).mockReturnValue(null);
    const mod = require("@/hooks/useActingUser");
    expect(mod.useActingUser).toBeDefined();
  });
});
