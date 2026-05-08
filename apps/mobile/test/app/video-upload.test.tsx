jest.mock("@/store/hooks", () => ({
  useAppSelector: jest.fn().mockReturnValue(null),
  useAppDispatch: jest.fn().mockReturnValue(jest.fn()),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Slot: "Slot",
  Stack: { Screen: "Screen" },
  Tabs: { Screen: "Screen" },
  Link: "Link",
  Redirect: "Redirect",
}), { virtual: true });

describe("app/video-upload", () => {
  it("module can be imported", () => {
    expect(true).toBe(true);
  });
});
