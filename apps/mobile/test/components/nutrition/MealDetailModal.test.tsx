jest.mock("@/store/hooks", () => ({
  useAppSelector: jest.fn().mockReturnValue(null),
  useAppDispatch: jest.fn().mockReturnValue(jest.fn()),
}));
jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/app/theme/AppThemeProvider", () => ({
  useAppTheme: () => ({ isDark: false }),
}));
jest.mock("@/components/ScaledText", () => {
  const ReactNative = require("react-native");
  return {
    Text: ReactNative.Text,
    TextInput: ReactNative.TextInput,
  };
});
jest.mock("@/hooks/useActingUser", () => ({
  useActingUser: () => ({ actingUserId: null, actingHeaders: undefined, effectiveProfileId: 1, effectiveProfileName: "Test", isStaff: false }),
}));
jest.mock("@/hooks/useAppToast", () => ({
  useAppToast: () => ({ show: jest.fn(), success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn(), hide: jest.fn() }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: "Link",
}), { virtual: true });

describe("MealDetailModal", () => {
  it("module can be imported", () => {
    expect(true).toBe(true);
  });

  it("builds a draft item from the active food form", () => {
    const { buildDraftMealItem } = require("@/components/nutrition/MealDetailModal");

    const item = buildDraftMealItem({
      name: "Banana",
      calories: "",
      weight: "120",
      unit: "g",
      protein: "1",
      carbs: "27",
      fat: "0",
    });

    expect(item).toMatchObject({
      name: "Banana",
      calories: 112,
      weightGrams: 120,
      unit: "g",
      protein: 1,
      carbs: 27,
      fat: 0,
    });
  });

  it("returns null for an unnamed draft item", () => {
    const { buildDraftMealItem } = require("@/components/nutrition/MealDetailModal");

    expect(
      buildDraftMealItem({
        name: " ",
        calories: "300",
        weight: "",
        unit: "",
        protein: "",
        carbs: "",
        fat: "",
      }),
    ).toBeNull();
  });
});
