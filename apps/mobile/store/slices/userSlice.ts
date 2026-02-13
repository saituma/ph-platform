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
  onboardingCompleted: boolean | null;
  athleteUserId: number | null;
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
  onboardingCompleted: null,
  athleteUserId: null,
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
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.profile = initialState.profile;
      state.onboardingCompleted = null;
      state.athleteUserId = null;
    },
  },
});

export const {
  setCredentials,
  updateProfile,
  setOnboardingCompleted,
  setAthleteUserId,
  setLoading,
  logout,
} =
  userSlice.actions;

export default userSlice.reducer;
