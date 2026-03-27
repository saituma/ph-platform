import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type ThemeMode = "light" | "dark" | "system";
type PushSupport = "supported" | "expo_go" | "unavailable";

export type PushRegistrationState = {
  support: PushSupport;
  permissionStatus: "granted" | "denied" | "undetermined";
  expoPushToken: string | null;
  projectId: string | null;
  lastAttemptAt: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
};

interface AppState {
  isInitialized: boolean;
  isGlobalLoading: boolean;
  themeMode: ThemeMode;
  bootstrapReady: boolean;
  pushRegistration: PushRegistrationState;
}

const initialState: AppState = {
  isInitialized: false,
  isGlobalLoading: false,
  themeMode: "system",
  bootstrapReady: false,
  pushRegistration: {
    support: "unavailable",
    permissionStatus: "undetermined",
    expoPushToken: null,
    projectId: null,
    lastAttemptAt: null,
    lastSyncedAt: null,
    lastError: null,
  },
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.isGlobalLoading = action.payload;
    },
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload;
    },
    setBootstrapReady: (state, action: PayloadAction<boolean>) => {
      state.bootstrapReady = action.payload;
    },
    setPushRegistration: (state, action: PayloadAction<Partial<PushRegistrationState>>) => {
      state.pushRegistration = {
        ...state.pushRegistration,
        ...action.payload,
      };
    },
  },
});

export const {
  setInitialized,
  setGlobalLoading,
  setThemeMode,
  setBootstrapReady,
  setPushRegistration,
} =
  appSlice.actions;

export const selectIsInitialized = (state: { app: AppState }) =>
  state.app.isInitialized;
export const selectIsGlobalLoading = (state: { app: AppState }) =>
  state.app.isGlobalLoading;
export const selectThemeMode = (state: { app: AppState }) =>
  state.app.themeMode;
export const selectBootstrapReady = (state: { app: AppState }) =>
  state.app.bootstrapReady;
export const selectPushRegistration = (state: { app: AppState }) =>
  state.app.pushRegistration;

export default appSlice.reducer;
