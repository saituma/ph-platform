import { env } from "@/env";

function resolveApiBaseUrl(): string {
  const configured = env.VITE_PUBLIC_API_URL;
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
