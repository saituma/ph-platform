import { describe, it, expect, beforeEach } from "vitest";
import {
  isFeatureEnabled,
  setFlagOverride,
  clearFlagOverrides,
} from "#/lib/feature-flags";

describe("feature-flags", () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as any).__FF_OVERRIDES;
  });

  it("returns false (default) for all flags", () => {
    expect(isFeatureEnabled("new_onboarding_flow")).toBe(false);
    expect(isFeatureEnabled("enhanced_analytics")).toBe(false);
    expect(isFeatureEnabled("offline_mode")).toBe(false);
    expect(isFeatureEnabled("team_chat_v2")).toBe(false);
    expect(isFeatureEnabled("nutrition_ai")).toBe(false);
  });

  it("local override takes precedence over default", () => {
    (window as any).__FF_OVERRIDES = { nutrition_ai: true };
    expect(isFeatureEnabled("nutrition_ai")).toBe(true);
  });

  it("localStorage override takes precedence over window override", () => {
    (window as any).__FF_OVERRIDES = { offline_mode: false };
    localStorage.setItem(
      "ph_feature_flags",
      JSON.stringify({ offline_mode: true }),
    );
    expect(isFeatureEnabled("offline_mode")).toBe(true);
  });

  it("setFlagOverride persists to localStorage", () => {
    setFlagOverride("team_chat_v2", true);
    const stored = JSON.parse(localStorage.getItem("ph_feature_flags")!);
    expect(stored.team_chat_v2).toBe(true);
    expect(isFeatureEnabled("team_chat_v2")).toBe(true);
  });

  it("clearFlagOverrides removes all overrides", () => {
    setFlagOverride("nutrition_ai", true);
    setFlagOverride("offline_mode", true);
    clearFlagOverrides();
    expect(localStorage.getItem("ph_feature_flags")).toBeNull();
    expect(isFeatureEnabled("nutrition_ai")).toBe(false);
    expect(isFeatureEnabled("offline_mode")).toBe(false);
  });

  it("is SSR safe when window is undefined", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error - simulating SSR
    delete globalThis.window;
    try {
      // Should not throw, should return default
      expect(isFeatureEnabled("new_onboarding_flow")).toBe(false);
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
