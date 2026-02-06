import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type ThemeMode = "light" | "dark" | "system";

interface AppState {
  isInitialized: boolean;
  isGlobalLoading: boolean;
  themeMode: ThemeMode;
}

const initialState: AppState = {
  isInitialized: false,
  isGlobalLoading: false,
  themeMode: "system",
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
  },
});

export const { setInitialized, setGlobalLoading, setThemeMode } =
  appSlice.actions;

export const selectIsInitialized = (state: { app: AppState }) =>
  state.app.isInitialized;
export const selectIsGlobalLoading = (state: { app: AppState }) =>
  state.app.isGlobalLoading;
export const selectThemeMode = (state: { app: AppState }) =>
  state.app.themeMode;

export default appSlice.reducer;
