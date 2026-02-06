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
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.profile = initialState.profile;
    },
  },
});

export const { setCredentials, updateProfile, setLoading, logout } =
  userSlice.actions;

export default userSlice.reducer;
