import { AdminGetUserCommand, AdminSetUserPasswordCommand, CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";
import dns from "node:dns";
import dotenv from "dotenv";
import fs from "fs";
import net from "node:net";
import path from "path";
import { Pool } from "pg";

dns.setDefaultResultOrder("ipv4first");
if (typeof net.setDefaultAutoSelectFamily === "function") net.setDefaultAutoSelectFamily(false);

function loadEnv() {
  const envPathCandidates = [
    process.env.DOTENV_PATH,
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "apps/api/.env"),
    path.resolve(__dirname, "../../.env"),
  ].filter(Boolean) as string[];

  const resolvedEnvPath = envPathCandidates.find((candidate) => fs.existsSync(candidate));
  dotenv.config({ path: resolvedEnvPath, override: true });
}

function hashPassword(input: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(input, salt, 64).toString("hex");
  return { hash, salt };
}

async function setLocalPassword(email: string, password: string) {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for local auth mode.");
  }

  const databaseSsl = process.env.DATABASE_SSL === "true";
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const { rows } = await pool.query(
      'select id from "users" where email = $1 and "isDeleted" = false limit 1',
      [email]
    );
    const user = rows[0];
    if (!user) {
      throw new Error(`User not found for email: ${email}`);
    }

    const { hash, salt } = hashPassword(password);
    await pool.query(
      'update "users" set "passwordHash" = $1, "passwordSalt" = $2, "updatedAt" = now() where id = $3',
      [hash, salt, user.id]
    );
  } catch (error: any) {
    const message = error?.message ?? String(error);
    const sslHint = databaseSsl
      ? "DATABASE_SSL=true"
      : "Try DATABASE_SSL=true or add sslmode=verify-full to DATABASE_URL if your DB requires SSL.";
    throw new Error(`Failed to update local password: ${message}. ${sslHint}`);
  } finally {
    await pool.end();
  }
}

async function setCognitoPassword(email: string, password: string) {
  const userPoolId = process.env.COGNITO_USER_POOL_ID ?? "";
  if (!userPoolId) {
    throw new Error("COGNITO_USER_POOL_ID is required for cognito auth mode.");
  }

  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";
  const cognitoClient = new CognitoIdentityProviderClient({ region });

  await cognitoClient.send(
    new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: email,
    })
  );

  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
      Password: password,
      Permanent: true,
    })
  );
}

async function main() {
  loadEnv();
  const email = process.env.ADMIN_EMAIL ?? "dawitworkujima@gmail.com";
  const password = process.env.ADMIN_PASSWORD ?? "Password123!";
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
  }

  const authMode = process.env.AUTH_MODE ?? "cognito";
  if (authMode === "local") {
    await setLocalPassword(email, password);
    console.log(`Password updated for ${email} (authMode=local).`);
    return;
  }

  await setCognitoPassword(email, password);
  console.log(`Password updated for ${email} (authMode=cognito).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
