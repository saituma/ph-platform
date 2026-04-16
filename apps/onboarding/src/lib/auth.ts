import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { importPKCS8, SignJWT } from "jose";

async function generateAppleClientSecret(clientId, teamId, keyId, privateKey) {
  const key = await importPKCS8(privateKey, "ES256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key);
}

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: process.env.APPLE_PRIVATE_KEY
    ? {
      apple: {
        clientId: process.env.APPLE_CLIENT_ID!,
        clientSecret: await generateAppleClientSecret(
          process.env.APPLE_CLIENT_ID!,
          process.env.APPLE_TEAM_ID!,
          process.env.APPLE_KEY_ID!,
          process.env.APPLE_PRIVATE_KEY!,
        ),
        appBundleIdentifier: process.env
          .APPLE_APP_BUNDLE_IDENTIFIER as string,
      },
    }
    : {},
  plugins: [tanstackStartCookies()],
  trustedOrigins: ["https://appleid.apple.com"],
});
