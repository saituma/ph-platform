import { canUseCoachMessaging } from "@/lib/messagingAccess";

describe("canUseCoachMessaging", () => {
  it("returns true when planFeatures includes messaging", () => {
    expect(canUseCoachMessaging("PHP", null, ["messaging"])).toBe(true);
  });

  it("returns true when planFeatures includes priority_messaging", () => {
    expect(canUseCoachMessaging("PHP", null, ["priority_messaging"])).toBe(true);
  });

  it("returns false when planFeatures exist but lack messaging", () => {
    expect(canUseCoachMessaging("PHP", null, ["tracking", "nutrition"])).toBe(false);
  });

  it("returns true when no planFeatures are set (default policy)", () => {
    expect(canUseCoachMessaging("PHP", null)).toBe(true);
    expect(canUseCoachMessaging("PHP", null, null)).toBe(true);
    expect(canUseCoachMessaging("PHP", null, [])).toBe(true);
  });

  it("returns true with no tier or access tiers", () => {
    expect(canUseCoachMessaging(null, null)).toBe(true);
    expect(canUseCoachMessaging(undefined, undefined)).toBe(true);
  });
});
