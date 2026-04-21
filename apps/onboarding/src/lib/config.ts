import { env } from "@/env";

/**
 * Central application configuration.
 * Avoids hardcoded fallbacks in components and ensures consistent environment handling.
 */
export const config = {
  api: {
    baseUrl: env.VITE_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
  },
  app: {
    name: "PH Platform",
    version: "2.0.0",
  },
};
