import userReducer, {
  setCredentials,
  updateProfile,
  setOnboardingCompleted,
  setManagedAthletes,
  logout,
} from "../store/slices/userSlice";
import appReducer, {
  setInitialized,
  setThemeMode,
  setPushRegistration,
} from "../store/slices/appSlice";

describe("Redux Store Slices", () => {
  describe("userSlice", () => {
    const initialState = (userReducer as any)(undefined, { type: "@@INIT" });

    test("TC-ST001: setCredentials updates state correctly", () => {
      const payload = {
        token: "test-token",
        profile: { id: "1", name: "User", email: "u@e.com", avatar: null },
        refreshToken: "ref-token",
      };
      const state = userReducer(initialState, setCredentials(payload));
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe("test-token");
      expect(state.profile.name).toBe("User");
    });

    test("TC-ST002: updateProfile performs partial update", () => {
      const startState = { ...initialState, profile: { id: "1", name: "Old", email: "e", avatar: null } };
      const state = userReducer(startState, updateProfile({ name: "New" }));
      expect(state.profile.name).toBe("New");
      expect(state.profile.email).toBe("e");
    });

    test("TC-ST003: setOnboardingCompleted updates boolean", () => {
      const state = userReducer(initialState, setOnboardingCompleted(true));
      expect(state.onboardingCompleted).toBe(true);
    });

    test("TC-ST004: setManagedAthletes normalizes ages", () => {
      const athletes = [
        { id: 1, name: "A1", age: 5 }, // Should be clamped to 7
        { id: 2, name: "A2", age: 10 },
      ];
      const state = userReducer(initialState, setManagedAthletes(athletes));
      expect(state.managedAthletes[0].age).toBe(7);
      expect(state.managedAthletes[1].age).toBe(10);
    });

    test("TC-ST005: setManagedAthletes handles null age", () => {
      const state = userReducer(initialState, setManagedAthletes([{ name: "A", age: null }]));
      expect(state.managedAthletes[0].age).toBeNull();
    });

    test("TC-ST006: logout resets to initial state (mostly)", () => {
      const loggedInState = { ...initialState, isAuthenticated: true, token: "tok" };
      const state = userReducer(loggedInState, logout());
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
    });

    test("TC-ST007: setManagedAthletes handles decimal ages", () => {
      const state = userReducer(initialState, setManagedAthletes([{ age: 12.8 }]));
      expect(state.managedAthletes[0].age).toBe(12);
    });

    test("TC-ST008: updateProfile handles null avatar", () => {
      const state = userReducer(initialState, updateProfile({ avatar: "url" }));
      expect(state.profile.avatar).toBe("url");
      const nextState = userReducer(state, updateProfile({ avatar: null }));
      expect(nextState.profile.avatar).toBeNull();
    });

    test("TC-ST009: setCredentials preserves refreshToken if not in payload", () => {
      const stateWithRefresh = { ...initialState, refreshToken: "exist" };
      const state = userReducer(stateWithRefresh, setCredentials({ token: "t", profile: initialState.profile }));
      expect(state.refreshToken).toBe("exist");
    });

    test("TC-ST010: initialState has correct defaults", () => {
      expect(initialState.isAuthenticated).toBe(false);
      expect(initialState.managedAthletes).toEqual([]);
    });
  });

  describe("appSlice", () => {
    const initialState = (appReducer as any)(undefined, { type: "@@INIT" });

    test("TC-ST011: setInitialized updates state", () => {
      const state = appReducer(initialState, setInitialized(true));
      expect(state.isInitialized).toBe(true);
    });

    test("TC-ST012: setThemeMode updates mode", () => {
      const state = appReducer(initialState, setThemeMode("dark"));
      expect(state.themeMode).toBe("dark");
    });

    test("TC-ST013: setPushRegistration performs partial update", () => {
      const state = appReducer(initialState, setPushRegistration({ expoPushToken: "tok123" }));
      expect(state.pushRegistration.expoPushToken).toBe("tok123");
      expect(state.pushRegistration.support).toBe("unavailable"); // preserved
    });

    test("TC-ST014: setPushRegistration updates support status", () => {
      const state = appReducer(initialState, setPushRegistration({ support: "supported" }));
      expect(state.pushRegistration.support).toBe("supported");
    });

    test("TC-ST015: setPushRegistration handles error message", () => {
      const state = appReducer(initialState, setPushRegistration({ lastError: "Failed" }));
      expect(state.pushRegistration.lastError).toBe("Failed");
    });

    test("TC-ST016: setThemeMode handles system mode", () => {
      const state = appReducer(initialState, setThemeMode("system"));
      expect(state.themeMode).toBe("system");
    });

    test("TC-ST017: setInitialized can unset", () => {
      const state = appReducer({ ...initialState, isInitialized: true }, setInitialized(false));
      expect(state.isInitialized).toBe(false);
    });

    test("TC-ST018: setPushRegistration updates permissionStatus", () => {
      const state = appReducer(initialState, setPushRegistration({ permissionStatus: "granted" }));
      expect(state.pushRegistration.permissionStatus).toBe("granted");
    });

    test("TC-ST019: appSlice initialState defaults", () => {
      expect(initialState.themeMode).toBe("system");
      expect(initialState.isGlobalLoading).toBe(false);
    });

    test("TC-ST020: setPushRegistration multiple fields", () => {
      const payload = { expoPushToken: "t", projectId: "p" };
      const state = appReducer(initialState, setPushRegistration(payload));
      expect(state.pushRegistration.expoPushToken).toBe("t");
      expect(state.pushRegistration.projectId).toBe("p");
    });
  });
});
