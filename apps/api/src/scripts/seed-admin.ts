import { AdminCreateUserCommand, AdminGetUserCommand, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { eq } from "drizzle-orm";

import { env } from "../config/env";
import { cognitoClient } from "../lib/aws";
import { db } from "../db";
import { userTable } from "../db/schema";

const email = process.env.ADMIN_EMAIL ?? "admin@gmail.com";
const name = process.env.ADMIN_NAME ?? "Admin";
const password = process.env.ADMIN_PASSWORD ?? "";

function generatePassword() {
  const base = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let out = "";
  for (let i = 0; i < 20; i += 1) {
    out += base[Math.floor(Math.random() * base.length)];
  }
  return out;
}

async function ensureCognitoUser(tempPassword: string) {
  try {
    await cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: env.cognitoUserPoolId,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "name", Value: name },
        ],
        TemporaryPassword: tempPassword,
        MessageAction: "SUPPRESS",
      })
    );
  } catch (error: any) {
    if (error?.name !== "UsernameExistsException") {
      throw error;
    }
  }

  const user = await cognitoClient.send(
    new AdminGetUserCommand({
      UserPoolId: env.cognitoUserPoolId,
      Username: email,
    })
  );

  const sub = user.UserAttributes?.find((attr) => attr.Name === "sub")?.Value;
  if (!sub) {
    throw new Error("Missing Cognito sub");
  }

  return sub;
}

async function setPermanentPassword(tempPassword: string, permanentPassword?: string) {
  if (!permanentPassword) {
    return tempPassword;
  }

  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: env.cognitoUserPoolId,
      Username: email,
      Password: permanentPassword,
      Permanent: true,
    })
  );

  return permanentPassword;
}

async function upsertAdmin(sub: string) {
  const existing = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
  if (existing[0]) {
    await db.update(userTable).set({ role: "admin", cognitoSub: sub, name }).where(eq(userTable.id, existing[0].id));
    return existing[0].id;
  }

  const inserted = await db
    .insert(userTable)
    .values({
      email,
      name,
      role: "admin",
      cognitoSub: sub,
    })
    .returning();

  return inserted[0].id;
}

async function main() {
  if (!env.cognitoUserPoolId) {
    throw new Error("COGNITO_USER_POOL_ID is required");
  }

  const tempPassword = generatePassword();
  const sub = await ensureCognitoUser(tempPassword);
  const finalPassword = await setPermanentPassword(tempPassword, password);
  await upsertAdmin(sub);

  if (!password) {
    console.log(`Temporary password for ${email}: ${finalPassword}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
