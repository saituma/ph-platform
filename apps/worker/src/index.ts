import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appUserTable } from "./db/app-schema";
import { createAuth, createWorkerDb } from "./lib/auth";
import { signAppJwt } from "./lib/app-jwt";

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  JWT_SECRET: string;
  /** Same semantics as API: when true, JWTs have no expiry (dev only). */
  ALLOW_EXPIRED_TOKENS?: string;
  /** Comma-separated extra origins for Better Auth (onboarding, web app, etc.). */
  TRUSTED_ORIGINS_EXTRA?: string;
  /** When "true", block session until email verified (requires mail config in Better Auth). */
  REQUIRE_EMAIL_VERIFICATION?: string;
  MEDIA: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["set-auth-token"],
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ ok: true, service: "ph-app-worker" }));

function authEnvFromContext(c: { env: Bindings; req: { url: string } }) {
  const databaseUrl = c.env.DATABASE_URL;
  const secret = c.env.BETTER_AUTH_SECRET;
  const baseURL = c.env.BETTER_AUTH_URL ?? new URL(c.req.url).origin;
  const requireEmailVerification =
    c.env.REQUIRE_EMAIL_VERIFICATION === "true" || c.env.REQUIRE_EMAIL_VERIFICATION === "1";
  return { databaseUrl, secret, baseURL, requireEmailVerification };
}

app.post("/api/app/token", async (c) => {
  const { databaseUrl, secret, baseURL, requireEmailVerification } = authEnvFromContext(c);
  const jwtSecret = c.env.JWT_SECRET;
  if (!databaseUrl || !secret || !jwtSecret) {
    return c.json(
      { error: "Worker is not fully configured (JWT_SECRET, DATABASE_URL, BETTER_AUTH_SECRET)." },
      503,
    );
  }

  const auth = createAuth({
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: baseURL,
    trustedOriginsExtra: c.env.TRUSTED_ORIGINS_EXTRA,
    requireEmailVerification,
  });

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.email) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createWorkerDb(databaseUrl);

  const [existing] = await db
    .select()
    .from(appUserTable)
    .where(eq(appUserTable.email, session.user.email))
    .orderBy(desc(appUserTable.id))
    .limit(1);

  let user = existing;
  if (!user) {
    const defaultName =
      session.user.name?.trim() || session.user.email.split("@")[0] || "User";
    await db.insert(appUserTable).values({
      cognitoSub: `ba:${session.user.id}`,
      name: defaultName,
      email: session.user.email,
      emailVerified: session.user.emailVerified ?? false,
    });
    const [created] = await db
      .select()
      .from(appUserTable)
      .where(eq(appUserTable.email, session.user.email))
      .orderBy(desc(appUserTable.id))
      .limit(1);
    user = created;
  }

  if (!user || user.isDeleted) {
    return c.json({ error: "User not found" }, 404);
  }

  const allowExpired =
    c.env.ALLOW_EXPIRED_TOKENS === "true" || c.env.ALLOW_EXPIRED_TOKENS === "1";
  const token = await signAppJwt({
    jwtSecret,
    allowExpiredTokens: allowExpired,
    sub: user.cognitoSub,
    email: user.email,
    name: user.name,
    role: String(user.role),
    userId: user.id,
    tokenVersion: user.tokenVersion ?? 0,
  });

  return c.json({
    accessToken: token,
    idToken: token,
    refreshToken: null,
    expiresIn: 60 * 60 * 24 * 30,
    tokenType: "Bearer",
  });
});

app.on(["GET", "POST", "OPTIONS"], "/api/auth/*", async (c) => {
  const { databaseUrl, secret, baseURL, requireEmailVerification } = authEnvFromContext(c);
  if (!databaseUrl || !secret) {
    return c.json({ error: "Worker auth is not configured (DATABASE_URL and BETTER_AUTH_SECRET)." }, 503);
  }
  const auth = createAuth({
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: baseURL,
    trustedOriginsExtra: c.env.TRUSTED_ORIGINS_EXTRA,
    requireEmailVerification,
  });
  return auth.handler(c.req.raw);
});

export default app;
