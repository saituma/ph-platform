import { env } from "@/env";

function resolveApiBaseUrl(): string {
  const configured = env.VITE_PUBLIC_API_URL;
  if (!import.meta.env.PROD && typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:3001";
    }
  }
  if (configured) return configured;

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
