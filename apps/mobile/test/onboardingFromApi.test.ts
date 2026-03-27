import {
  reduxStateFromOnboardingAthlete,
  shouldOpenTabsAfterAuth,
} from "@/lib/onboardingFromApi";

describe("onboardingFromApi", () => {
  it("treats missing athlete as unknown (null), not incomplete", () => {
    expect(reduxStateFromOnboardingAthlete(null)).toEqual({
      onboardingCompleted: null,
      athleteUserId: null,
    });
    expect(reduxStateFromOnboardingAthlete(undefined)).toEqual({
      onboardingCompleted: null,
      athleteUserId: null,
    });
  });

  it("maps athlete row to booleans", () => {
    expect(
      reduxStateFromOnboardingAthlete({ onboardingCompleted: true, userId: 42 })
    ).toEqual({ onboardingCompleted: true, athleteUserId: 42 });
    expect(
      reduxStateFromOnboardingAthlete({ onboardingCompleted: false, userId: 1 })
    ).toEqual({ onboardingCompleted: false, athleteUserId: 1 });
  });

  it("shouldOpenTabsAfterAuth only when completed flag is true", () => {
    expect(shouldOpenTabsAfterAuth(null)).toBe(false);
    expect(shouldOpenTabsAfterAuth({ onboardingCompleted: false })).toBe(false);
    expect(shouldOpenTabsAfterAuth({ onboardingCompleted: true })).toBe(true);
  });
});
