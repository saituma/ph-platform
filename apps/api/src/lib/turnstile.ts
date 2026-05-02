import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface VerifyResult {
  success: boolean;
  errorCodes?: string[];
}

async function verifyToken(token: string, remoteIp?: string): Promise<VerifyResult> {
  const secret = env.turnstileSecretKey;
  if (!secret) {
    return { success: true };
  }
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

function clientIp(req: Request): string | undefined {
  const cf = req.header("cf-connecting-ip");
  if (cf) return cf;
  const xff = req.header("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim();
  return req.ip;
}

export function requireTurnstile(req: Request, res: Response, next: NextFunction) {
  if (!env.turnstileSecretKey) {
    return next();
  }
  const token = (req.body && (req.body.turnstileToken || req.body["cf-turnstile-response"])) as
    | string
    | undefined;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Verification challenge required." });
  }
  void verifyToken(token, clientIp(req)).then((result) => {
    if (!result.success) {
      return res
        .status(403)
        .json({ error: "Verification failed. Please try again.", codes: result.errorCodes });
    }
    next();
  });
}
