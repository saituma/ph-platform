import { SignJWT } from "jose";

export async function signAppJwt(input: {
  jwtSecret: string;
  allowExpiredTokens?: boolean;
  sub: string;
  email: string;
  name: string;
  role: string;
  userId: number;
  tokenVersion: number;
}) {
  const secret = new TextEncoder().encode(input.jwtSecret);
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

  if (!input.allowExpiredTokens) {
    signer.setExpirationTime("30d");
  }

  return signer.sign(secret);
}
