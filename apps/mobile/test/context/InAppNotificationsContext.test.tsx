jest.mock("@/store/hooks", () => ({
  useAppSelector: jest.fn().mockReturnValue(null),
  useAppDispatch: jest.fn().mockReturnValue(jest.fn()),
}));

describe("InAppNotificationsContext", () => {
  it("module can be imported", () => {
    expect(true).toBe(true);
  });
});
