import { createRemoteJWKSet, decodeJwt, jwtVerify, SignJWT } from "jose";

import { env } from "../config/env";

const issuer = env.cognitoUserPoolId
  ? `https://cognito-idp.${env.awsRegion}.amazonaws.com/${env.cognitoUserPoolId}`
  : "";

const jwks = issuer ? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)) : null;

export async function verifyAccessToken(token: string) {
  if (env.authMode === "local") {
    const secret = new TextEncoder().encode(env.localJwtSecret);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  }
  if (!issuer || !jwks) {
    throw new Error("Cognito issuer not configured");
  }

  let payload: Record<string, unknown>;
  try {
    ({ payload } = await jwtVerify(token, jwks, { issuer }));
  } catch (error: any) {
    if (env.allowJwtBypass && (error?.code === "ERR_JWKS_TIMEOUT" || env.nodeEnv === "development")) {
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

export async function createLocalToken(input: { sub: string; email: string; name: string; role: string; userId: number }) {
  const secret = new TextEncoder().encode(env.localJwtSecret);
  return await new SignJWT({
    sub: input.sub,
    email: input.email,
    name: input.name,
    role: input.role,
    user_id: input.userId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}
