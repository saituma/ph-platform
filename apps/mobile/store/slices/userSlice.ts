import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserProfile {
  id: string | null;
  name: string | null;
  email: string | null;
  avatar: string | null;
}

export type ManagedAthlete = {
  id?: number;
  name?: string | null;
  age?: number | null;
  team?: string | null;
  level?: string | null;
  profilePicture?: string | null;
};

interface UserState {
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  profile: UserProfile;
  isLoading: boolean;
  hydrated: boolean;
  onboardingCompleted: boolean | null;
  athleteUserId: number | null;
  managedAthletes: ManagedAthlete[];
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
  refreshToken: null,
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
  managedAthletes: [],
  programTier: null,
  latestSubscriptionRequest: null,
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
    setOnboardingCompleted: (state, action: PayloadAction<boolean | null>) => {
      state.onboardingCompleted = action.payload;
    },
    setAthleteUserId: (state, action: PayloadAction<number | null>) => {
      state.athleteUserId = action.payload;
    },
    setManagedAthletes: (state, action: PayloadAction<ManagedAthlete[]>) => {
      state.managedAthletes = action.payload;
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
      state.refreshToken = null;
      state.profile = initialState.profile;
      state.onboardingCompleted = null;
      state.athleteUserId = null;
      state.managedAthletes = [];
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
  setManagedAthletes,
  setProgramTier,
  setLatestSubscriptionRequest,
  setLoading,
  setHydrated,
  logout,
} =
  userSlice.actions;

export default userSlice.reducer;
