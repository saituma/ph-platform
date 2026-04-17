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
