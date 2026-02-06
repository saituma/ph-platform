import { configureStore } from "@reduxjs/toolkit";
import { appReducer, roleReducer, userReducer } from "./slices";

export const store = configureStore({
  reducer: {
    user: userReducer,
    role: roleReducer,
    app: appReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
