import { z } from "zod";

const envSchema = z.object({
  API_BASE_URL: z.string().min(1, "API_BASE_URL is required"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  GIPHY_API_KEY: z.string().optional(),
  BETTER_AUTH_URL: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse({
  API_BASE_URL: process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  GIPHY_API_KEY: process.env.GIPHY_API_KEY ?? process.env.NEXT_PUBLIC_GIPHY_API_KEY,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
});

if (!parsed.success) {
  const message = parsed.error.issues.map((e) => `${String(e.path.join("."))}: ${e.message}`).join("; ");
  throw new Error(`[Web] Invalid environment: ${message}`);
}

export const env = parsed.data;
