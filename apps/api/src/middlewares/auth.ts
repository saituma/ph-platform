import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../lib/jwt";
import { env } from "../config/env";
import { createUserFromCognito, getUserByCognitoSub, getUserById } from "../services/user.service";

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

    if (env.authMode === "local") {
      if (typeof tokenVersion !== "number" || tokenVersion !== user.tokenVersion) {
        return res.status(401).json({ error: "Unauthorized" });
      }
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
      profilePicture: user.profilePicture ?? null,
    };

    const actingUserId = req.headers["x-acting-user-id"];
    if (actingUserId && user.role === "guardian") {
      const { listGuardianAthletes } = await import("../services/user.service");
      const { athletes } = await listGuardianAthletes(user.id);
      const managed = athletes.find((a) => String(a.userId) === String(actingUserId));
      if (managed && managed.userId) {
        req.user.id = Number(managed.userId);
        // We keep the original role (guardian) but change the ID so they access athlete data.
      }
    }

    next();
  } catch (err) {
    console.error("Auth failed", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
}
