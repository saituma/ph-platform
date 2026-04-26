import { env } from "@/env";

function resolveApiBaseUrl(): string {
  const configured = env.VITE_PUBLIC_API_URL;
  if (configured) return configured;

  // Client: same-origin is safe (Vite proxy handles /api in dev)
  if (typeof window !== "undefined") return window.location.origin;

  // SSR in production: must have explicit URL
  if (import.meta.env.PROD) {
    throw new Error(
      "[config] VITE_PUBLIC_API_URL is required in production. " +
        "Set it to your API origin (e.g. https://api.example.com).",
    );
  }

  return "http://localhost:3001";
}

export const config = {
  api: {
    baseUrl: resolveApiBaseUrl(),
  },
  app: {
    name: "PH Platform",
    version: "2.0.0",
  },
} as const;
