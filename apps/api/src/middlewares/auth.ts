import type { NextFunction, Request, Response } from "express";

import { getDbOutageRemainingMs, isLikelyDatabaseConnectivityFailure } from "../lib/db-connectivity";
import { verifyAccessToken } from "../lib/jwt";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { createUserFromCognito, getAthleteForUser, getUserByCognitoSub, getUserById } from "../services/user.service";
import { normalizeStoredMediaUrl } from "../services/s3.service";

const DB_OUTAGE_AUTH_LOG_THROTTLE_MS = 2_000;
let lastDbAuthOutageLogAt = 0;

function maybeLogDbAuthOutage(err: unknown) {
  const now = Date.now();
  if (now - lastDbAuthOutageLogAt < DB_OUTAGE_AUTH_LOG_THROTTLE_MS) return;
  lastDbAuthOutageLogAt = now;

  const remainingMs = getDbOutageRemainingMs();
  const message = err instanceof Error ? err.message : String(err);
  const isCooldownHit = message.includes("skipping DB query during transient outage cooldown");

  if (isCooldownHit) {
    logger.warn({ remainingMs }, "Database outage cooldown active during auth");
    return;
  }

  logger.error({ err }, "Database unavailable during auth (not a token rejection)");
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Public endpoints that should bypass auth even if guarded.
  if (req.method === "GET" && (req.path === "/billing/public-plans" || req.path === "/billing/plans")) {
    return next();
  }
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = header.replace("Bearer ", "");
    const payload = await verifyAccessToken(token);
    const sub = payload.sub as string | undefined;
    const email = payload.email as string | undefined;
    const name = (payload.name as string | undefined) ?? email ?? "";
    const userId = payload.user_id as number | undefined;
    const tokenVersion = payload.token_version as number | undefined;

    if (!sub && !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const allowBypass = env.allowJwtBypass && env.nodeEnv !== "production";
    let user = userId ? await getUserById(Number(userId)) : await getUserByCognitoSub(sub!);
    if (!user) {
      if (!email) {
        if (!allowBypass) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        const fallbackEmail = `${sub}@local.dev`;
        user = await createUserFromCognito({
          sub: sub ?? `local:${Date.now()}`,
          email: fallbackEmail,
          name: name || "Local User",
          role: "guardian",
        });
      } else {
        user = await createUserFromCognito({ sub: sub ?? `local:${Date.now()}`, email, name });
      }
    }

    if (typeof tokenVersion !== "number" || tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: "Account is blocked" });
    }
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      sub: user.cognitoSub,
      profilePicture: normalizeStoredMediaUrl(user.profilePicture ?? null),
    };

    if (req.user.role === "athlete" && !req.user.profilePicture) {
      const athlete = await getAthleteForUser(req.user.id);
      if (athlete?.profilePicture) {
        req.user.profilePicture = normalizeStoredMediaUrl(athlete.profilePicture);
      }
    }

    const actingUserId = req.headers["x-acting-user-id"];
    if (actingUserId && user.role === "guardian") {
      const { listGuardianAthletes } = await import("../services/user.service");
      const { athletes } = await listGuardianAthletes(user.id);
      const managed = athletes.find((a) => String(a.userId) === String(actingUserId));
      if (managed && managed.userId) {
        req.user.id = Number(managed.userId);
        req.user.profilePicture = normalizeStoredMediaUrl(managed.profilePicture ?? null);
        // We keep the original role (guardian) but change the ID so they access athlete data.
      }
    }

    (res.locals as { authUserId?: number }).authUserId = req.user.id;

    next();
  } catch (err) {
    if (isLikelyDatabaseConnectivityFailure(err)) {
      maybeLogDbAuthOutage(err);
      const retryAfterSeconds = Math.max(1, Math.ceil(getDbOutageRemainingMs() / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(503).json({
        error: "Service temporarily unavailable",
        code: "DB_UNAVAILABLE",
        retryAfterSeconds,
      });
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ reason: message }, "Bearer token rejected");
    return res.status(401).json({ error: "Unauthorized" });
  }
}
