import { createAuthClient } from "better-auth/react";

const origin =
  typeof window !== "undefined"
    ? window.location.origin
    : (import.meta.env.VITE_APP_ORIGIN ?? "http://localhost:3000");

/** Same-origin `/api/auth/*` is proxied to the Worker (see `routes/api/auth/$.ts`). */
export const authClient = createAuthClient({
  baseURL: origin,
});
