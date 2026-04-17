import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";

import * as authSchema from "../db/auth-schema";
import { appUserTable } from "../db/app-schema";

const drizzleSchema = { ...authSchema, appUserTable };

export type AuthEnv = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  /** Comma-separated extra origins (web, onboarding, mobile dev servers). */
  trustedOriginsExtra?: string;
  /**
   * When true, Better Auth will not issue a session until email is verified (you must configure email sending).
   * Default false so mobile/web sign-up can sign in immediately (matches typical app onboarding).
   */
  requireEmailVerification?: boolean;
};

function parseTrustedOrigins(baseURL: string, extra?: string) {
  const origins = new Set<string>();
  origins.add(baseURL.replace(/\/+$/, ""));
  if (extra) {
    for (const part of extra.split(",")) {
      const t = part.trim();
      if (t.length) origins.add(t.replace(/\/+$/, ""));
    }
  }
  return [...origins];
}

export function createAuth(env: AuthEnv) {
  const sql = neon(env.DATABASE_URL);
  const db = drizzle(sql as never, { schema: drizzleSchema });

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: Boolean(env.requireEmailVerification),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    plugins: [bearer()],
    trustedOrigins: parseTrustedOrigins(env.BETTER_AUTH_URL, env.trustedOriginsExtra),
  });
}

export function createWorkerDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql as never, { schema: drizzleSchema });
}

export { drizzleSchema as workerDrizzleSchema };
