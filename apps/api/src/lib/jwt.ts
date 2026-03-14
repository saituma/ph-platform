import { createRemoteJWKSet, decodeJwt, jwtVerify, SignJWT } from "jose";

import { env } from "../config/env";

const issuer = env.cognitoUserPoolId
  ? `https://cognito-idp.${env.awsRegion}.amazonaws.com/${env.cognitoUserPoolId}`
  : "";

const jwks = issuer ? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)) : null;

export async function verifyAccessToken(token: string) {
  const clockTolerance = env.allowExpiredTokens ? 60 * 60 * 24 * 365 * 100 : undefined;
  if (env.authMode === "local") {
    const secret = new TextEncoder().encode(env.jwtSecret);
    const { payload } = await jwtVerify(token, secret, clockTolerance ? { clockTolerance } : undefined);
    return payload;
  }
  if (!issuer || !jwks) {
    throw new Error("Cognito issuer not configured");
  }

  let payload: Record<string, unknown>;
  try {
    ({ payload } = await jwtVerify(
      token,
      jwks,
      clockTolerance ? { issuer, clockTolerance } : { issuer }
    ));
  } catch (error: any) {
    if (env.nodeEnv !== "production" && env.allowJwtBypass && error?.code === "ERR_JWKS_TIMEOUT") {
      return decodeJwt(token) as Record<string, unknown>;
    }
    throw error;
  }

  const tokenUse = payload.token_use as string | undefined;
  if (tokenUse === "access") {
    if (payload.client_id !== env.cognitoClientId) {
      throw new Error("Invalid token");
    }
  } else if (tokenUse === "id") {
    if (payload.aud !== env.cognitoClientId) {
      throw new Error("Invalid token");
    }
  } else {
    throw new Error("Invalid token");
  }

  return payload;
}

export async function createLocalToken(input: {
  sub: string;
  email: string;
  name: string;
  role: string;
  userId: number;
  tokenVersion: number;
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
    signer.setExpirationTime("1h");
  }

  return await signer.sign(secret);
}
