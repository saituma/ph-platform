import appReducer, { setGlobalLoading, setInitialized, setThemeMode } from "@/store/slices/appSlice";
import roleReducer, { checkPin, setGuardianPin, setRole } from "@/store/slices/roleSlice";
import userReducer, {
  logout,
  setAthleteUserId,
  setApiUserRole,
  setCredentials,
  setOnboardingCompleted,
  updateProfile,
} from "@/store/slices/userSlice";

describe("mobile slices", () => {
  it("updates app slice state", () => {
    let state = appReducer(undefined, setInitialized(true));
    state = appReducer(state, setGlobalLoading(true));
    state = appReducer(state, setThemeMode("dark"));

    expect(state.isInitialized).toBe(true);
    expect(state.isGlobalLoading).toBe(true);
    expect(state.themeMode).toBe("dark");
  });

  it("updates user slice state and resets on logout", () => {
    let state = userReducer(
      undefined,
      setCredentials({ token: "token-1", profile: { id: "1", name: "Coach", email: "coach@test.com", avatar: null } }),
    );

    state = userReducer(state, updateProfile({ name: "Coach Updated" }));
    state = userReducer(state, setApiUserRole("admin"));
    state = userReducer(state, setOnboardingCompleted(true));
    state = userReducer(state, setAthleteUserId(7));

    expect(state.isAuthenticated).toBe(true);
    expect(state.profile.name).toBe("Coach Updated");
    expect(state.apiUserRole).toBe("admin");
    expect(state.onboardingCompleted).toBe(true);
    expect(state.athleteUserId).toBe(7);

    state = userReducer(state, logout());
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.profile.name).toBeNull();
    expect(state.apiUserRole).toBeNull();
    expect(state.athleteUserId).toBeNull();
  });

  it("handles role state and pin checks", () => {
    let state = roleReducer(undefined, setRole("Athlete"));
    state = roleReducer(state, setGuardianPin("1234"));

    expect(state.role).toBe("Athlete");
    expect(state.guardianPin).toBe("1234");
    expect(checkPin("1234")({ role: state })).toBe(true);
    expect(checkPin("0000")({ role: state })).toBe(false);
  });
});
