"use client";

import { Provider } from "react-redux";
import { store } from "../lib/store";
import { AuthGate } from "../components/auth/auth-gate";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthGate>{children}</AuthGate>
    </Provider>
  );
}
