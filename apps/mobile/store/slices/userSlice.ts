import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserProfile {
  id: string | null;
  name: string | null;
  email: string | null;
  avatar: string | null;
}

interface UserState {
  isAuthenticated: boolean;
  token: string | null;
  profile: UserProfile;
  isLoading: boolean;
  hydrated: boolean;
  onboardingCompleted: boolean | null;
  athleteUserId: number | null;
  programTier: string | null;
  latestSubscriptionRequest: {
    status?: string | null;
    paymentStatus?: string | null;
    planTier?: string | null;
    createdAt?: string | null;
  } | null;
}

const initialState: UserState = {
  isAuthenticated: false,
  token: null,
  profile: {
    id: null,
    name: null,
    email: null,
    avatar: null,
  },
  isLoading: false,
  hydrated: false,
  onboardingCompleted: null,
  athleteUserId: null,
  programTier: null,
  latestSubscriptionRequest: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ token: string; profile: UserProfile }>,
    ) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.profile = action.payload.profile;
    },
    updateProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    setOnboardingCompleted: (state, action: PayloadAction<boolean | null>) => {
      state.onboardingCompleted = action.payload;
    },
    setAthleteUserId: (state, action: PayloadAction<number | null>) => {
      state.athleteUserId = action.payload;
    },
    setProgramTier: (state, action: PayloadAction<string | null>) => {
      state.programTier = action.payload;
    },
    setLatestSubscriptionRequest: (
      state,
      action: PayloadAction<UserState["latestSubscriptionRequest"]>
    ) => {
      state.latestSubscriptionRequest = action.payload;
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
      state.profile = initialState.profile;
      state.onboardingCompleted = null;
      state.athleteUserId = null;
      state.programTier = null;
      state.latestSubscriptionRequest = null;
    },
  },
});

export const {
  setCredentials,
  updateProfile,
  setOnboardingCompleted,
  setAthleteUserId,
  setProgramTier,
  setLatestSubscriptionRequest,
  setLoading,
  setHydrated,
  logout,
} =
  userSlice.actions;

export default userSlice.reducer;
