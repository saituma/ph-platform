import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AppRole } from "@/lib/appRole";

interface UserProfile {
  id: string | null;
  name: string | null;
  email: string | null;
  avatar: string | null;
}

export type ManagedAthlete = {
  id?: number;
  userId?: number | null;
  name?: string | null;
  age?: number | null;
  team?: string | null;
  level?: string | null;
  trainingPerWeek?: number | null;
  profilePicture?: string | null;
};

const MIN_YOUTH_DISPLAY_AGE = 7;

function normalizeManagedAthleteAge(age?: number | null) {
  if (age == null || !Number.isFinite(age)) return null;
  return Math.max(MIN_YOUTH_DISPLAY_AGE, Math.trunc(age));
}

interface UserState {
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  profile: UserProfile;
  /** Raw API user role from /auth/me (e.g. admin/superAdmin). */
  apiUserRole: string | null;
  isLoading: boolean;
  hydrated: boolean;
  onboardingCompleted: boolean | null;
  athleteUserId: number | null;
  managedAthletes: ManagedAthlete[];
  programTier: string | null;
  /** Coach-controlled: which tiers may message (defaults match server until billing/status loads). */
  messagingAccessTiers: string[];
  latestSubscriptionRequest: {
    status?: string | null;
    paymentStatus?: string | null;
    planTier?: string | null;
    createdAt?: string | null;
  } | null;
  appRole: AppRole | null;
}

const initialState: UserState = {
  isAuthenticated: false,
  token: null,
  refreshToken: null,
  profile: {
    id: null,
    name: null,
    email: null,
    avatar: null,
  },
  apiUserRole: null,
  isLoading: false,
  hydrated: false,
  onboardingCompleted: null,
  athleteUserId: null,
  managedAthletes: [],
  programTier: null,
  messagingAccessTiers: ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"],
  latestSubscriptionRequest: null,
  appRole: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ token: string; profile: UserProfile; refreshToken?: string | null }>,
    ) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken ?? state.refreshToken;
      state.profile = action.payload.profile;
    },
    updateProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    setApiUserRole: (state, action: PayloadAction<string | null>) => {
      state.apiUserRole = action.payload;
    },
    setOnboardingCompleted: (state, action: PayloadAction<boolean | null>) => {
      // Onboarding completion is monotonic for a user session: ignore stale false writes
      // that can arrive from slower background sync calls after a successful completion.
      if (state.onboardingCompleted === true && action.payload === false) {
        return;
      }
      state.onboardingCompleted = action.payload;
    },
    setAthleteUserId: (state, action: PayloadAction<number | null>) => {
      state.athleteUserId = action.payload;
    },
    setManagedAthletes: (state, action: PayloadAction<ManagedAthlete[]>) => {
      state.managedAthletes = action.payload.map((athlete) => ({
        ...athlete,
        age: normalizeManagedAthleteAge(athlete.age),
      }));
    },
    setProgramTier: (state, action: PayloadAction<string | null>) => {
      state.programTier = action.payload;
    },
    setMessagingAccessTiers: (state, action: PayloadAction<string[]>) => {
      state.messagingAccessTiers = action.payload;
    },
    setLatestSubscriptionRequest: (
      state,
      action: PayloadAction<UserState["latestSubscriptionRequest"]>
    ) => {
      state.latestSubscriptionRequest = action.payload;
    },
    setAppRole: (state, action: PayloadAction<AppRole | null>) => {
      state.appRole = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setHydrated: (state, action: PayloadAction<boolean>) => {
      state.hydrated = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.refreshToken = null;
      state.profile = initialState.profile;
      state.apiUserRole = null;
      state.onboardingCompleted = null;
      state.athleteUserId = null;
      state.managedAthletes = [];
      state.programTier = null;
      state.messagingAccessTiers = ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"];
      state.latestSubscriptionRequest = null;
      state.appRole = null;
    },
  },
});

export const {
  setCredentials,
  updateProfile,
  setApiUserRole,
  setOnboardingCompleted,
  setAthleteUserId,
  setManagedAthletes,
  setProgramTier,
  setMessagingAccessTiers,
  setLatestSubscriptionRequest,
  setAppRole,
  setLoading,
  setHydrated,
  logout,
} =
  userSlice.actions;

export default userSlice.reducer;
