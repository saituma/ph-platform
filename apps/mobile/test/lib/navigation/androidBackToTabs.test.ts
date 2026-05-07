import {
  shouldAndroidFallbackToTabs,
  goBackOrFallbackTabs,
} from "@/lib/navigation/androidBackToTabs";

describe("androidBackToTabs", () => {
  describe("shouldAndroidFallbackToTabs", () => {
    it("returns false for null pathname", () => {
      expect(shouldAndroidFallbackToTabs(null)).toBe(false);
    });

    it("returns false for tab routes", () => {
      expect(shouldAndroidFallbackToTabs("/(tabs)/home")).toBe(false);
      expect(shouldAndroidFallbackToTabs("/(tabs)/messages")).toBe(false);
      expect(shouldAndroidFallbackToTabs("/(tabs)")).toBe(false);
    });

    it("returns true for admin routes", () => {
      expect(shouldAndroidFallbackToTabs("/admin/users")).toBe(true);
    });

    it("returns true for program routes", () => {
      expect(shouldAndroidFallbackToTabs("/programs/123")).toBe(true);
    });

    it("returns true for message thread routes", () => {
      expect(shouldAndroidFallbackToTabs("/adult/messages/thread-1")).toBe(true);
    });

    it("returns true for root-level routes", () => {
      expect(shouldAndroidFallbackToTabs("/settings")).toBe(true);
    });
  });

  describe("goBackOrFallbackTabs", () => {
    it("calls router.back() when canGoBack returns true", () => {
      const router = {
        canGoBack: jest.fn(() => true),
        back: jest.fn(),
        replace: jest.fn(),
      };
      goBackOrFallbackTabs(router as any, "/admin/users");
      expect(router.back).toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
    });

    it("calls router.replace with tabs fallback when cannot go back on non-tab route", () => {
      const router = {
        canGoBack: jest.fn(() => false),
        back: jest.fn(),
        replace: jest.fn(),
      };
      goBackOrFallbackTabs(router as any, "/admin/users");
      expect(router.back).not.toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith("/(tabs)");
    });

    it("does nothing when cannot go back on tab route", () => {
      const router = {
        canGoBack: jest.fn(() => false),
        back: jest.fn(),
        replace: jest.fn(),
      };
      goBackOrFallbackTabs(router as any, "/(tabs)/home");
      expect(router.back).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
    });

    it("does nothing when cannot go back and pathname is null", () => {
      const router = {
        canGoBack: jest.fn(() => false),
        back: jest.fn(),
        replace: jest.fn(),
      };
      goBackOrFallbackTabs(router as any, null);
      expect(router.back).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
    });
  });
});
