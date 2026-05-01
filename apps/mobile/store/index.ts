import { configureStore } from "@reduxjs/toolkit";
import { appReducer, roleReducer, socketReducer, userReducer } from "./slices";

export const store = configureStore({
  reducer: {
    user: userReducer,
    role: roleReducer,
    app: appReducer,
    socket: socketReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
