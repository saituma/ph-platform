import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface VerifyResult {
  success: boolean;
  errorCodes?: string[];
}

async function verifyToken(token: string, secret: string, remoteIp?: string): Promise<VerifyResult> {
  if (!token) return { success: false, errorCodes: ["missing-input-response"] };

  const body = new URLSearchParams();
  body.append("secret", secret);
  body.append("response", token);
  if (remoteIp) body.append("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    return { success: !!data.success, errorCodes: data["error-codes"] };
  } catch {
    return { success: false, errorCodes: ["verify-fetch-failed"] };
  }
}

async function verifyWithAnySecret(token: string, remoteIp?: string): Promise<VerifyResult> {
  const secrets = [env.turnstileSecretKey, env.turnstileSecretKey2, env.turnstileSecretKey3].filter(Boolean);
  if (secrets.length === 0) return { success: true };

  // Verify all secrets in parallel — Cloudflare consumes a token on the first
  // siteverify call even if the secret is wrong, so sequential would burn the
  // token before the correct secret gets a chance.
  const results = await Promise.all(secrets.map((s) => verifyToken(token, s, remoteIp)));
  const passed = results.find((r) => r.success);
  return passed ?? { success: false, errorCodes: results.flatMap((r) => r.errorCodes ?? []) };
}

function clientIp(req: Request): string | undefined {
  const cf = req.header("cf-connecting-ip");
  if (cf) return cf;
  const xff = req.header("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim();
  return req.ip;
}

function isLocalRequest(req: Request): boolean {
  const host = (req.hostname || "").toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return true;
  const origin = (req.header("origin") || "").toLowerCase();
  const referer = (req.header("referer") || "").toLowerCase();
  return (
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    referer.includes("localhost") ||
    referer.includes("127.0.0.1")
  );
}

export function requireTurnstile(req: Request, res: Response, next: NextFunction) {
  if (env.turnstileBypass || process.env.NODE_ENV !== "production") {
    return next();
  }
  // Native mobile apps don't send an Origin header — browsers always do
  if (!req.header("origin")) {
    return next();
  }
  if (!env.turnstileSecretKey && !env.turnstileSecretKey2 && !env.turnstileSecretKey3) {
    return next();
  }
  const token = (req.body && (req.body.turnstileToken || req.body["cf-turnstile-response"])) as
    | string
    | undefined;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Verification challenge required." });
  }
  void verifyWithAnySecret(token, clientIp(req)).then((result) => {
    if (!result.success) {
      return res
        .status(403)
        .json({ error: "Verification failed. Please try again.", codes: result.errorCodes });
    }
    next();
  });
}
