import { decodeJwt, jwtVerify, SignJWT } from "jose";

import { env } from "../config/env";

export async function verifyAccessToken(token: string) {
  const clockTolerance = env.allowExpiredTokens ? 60 * 60 * 24 * 365 * 100 : undefined;
  const secret = new TextEncoder().encode(env.jwtSecret);
  const { payload } = await jwtVerify(token, secret, clockTolerance ? { clockTolerance } : undefined);
  return payload;
}

export async function createLocalToken(input: {
  sub: string;
  email: string;
  name: string;
  role: string;
  userId: number;
  tokenVersion: number;
  expiresIn?: string | number;
}) {
  const secret = new TextEncoder().encode(env.jwtSecret);
  const signer = new SignJWT({
    sub: input.sub,
    email: input.email,
    name: input.name,
    role: input.role,
    user_id: input.userId,
    token_version: input.tokenVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt();

  if (!env.allowExpiredTokens) {
    signer.setExpirationTime(input.expiresIn ?? "30d");
  }

  return await signer.sign(secret);
}

/** Decode without verification (e.g. diagnostics only). */
export function decodeAccessToken(token: string) {
  return decodeJwt(token);
}

/**
 * Sign a single-use invite token (carries plan id + email so the public invite page
 * doesn't need a DB-backed nonce table). 14-day expiry.
 */
export async function createPlanInviteToken(input: {
  planId: number;
  email: string;
  invitedByUserId?: number;
  invitedByName?: string;
}) {
  const secret = new TextEncoder().encode(env.jwtSecret);
  return await new SignJWT({
    purpose: "plan_invite",
    plan_id: input.planId,
    email: input.email,
    invited_by_user_id: input.invitedByUserId ?? null,
    invited_by_name: input.invitedByName ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret);
}

export async function verifyPlanInviteToken(token: string) {
  const payload = await verifyAccessToken(token);
  if (payload.purpose !== "plan_invite") {
    throw new Error("Invalid invite token");
  }
  const planId = Number(payload.plan_id);
  const email = typeof payload.email === "string" ? payload.email : "";
  if (!Number.isFinite(planId) || planId < 1 || !email) {
    throw new Error("Invalid invite payload");
  }
  return {
    planId,
    email,
    invitedByName:
      typeof payload.invited_by_name === "string" ? payload.invited_by_name : null,
  };
}
