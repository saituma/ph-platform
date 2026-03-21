import { AdminDeleteUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { eq } from "drizzle-orm";

import { env } from "../config/env";
import { cognitoClient } from "../lib/aws";
import { db } from "../db";
import { userTable } from "../db/schema";
import { loginUser, verifyLocalPassword } from "./auth.service";

/**
 * Self-service account removal: invalidates sessions, blocks sign-in, optionally removes Cognito user.
 * Data is retained for legal/ops (soft delete); the account cannot be used again with the same flow.
 */
export async function deleteOwnAccount(userId: number, password: string) {
  const rows = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
  const user = rows[0];
  if (!user || user.isDeleted) {
    throw { status: 404, message: "Account not found." };
  }
  if (user.role === "coach" || user.role === "admin" || user.role === "superAdmin") {
    throw { status: 403, message: "Staff accounts cannot be deleted from the app." };
  }

  if (env.authMode === "local") {
    const ok = verifyLocalPassword(password, user.passwordHash, user.passwordSalt);
    if (!ok) {
      throw { status: 401, message: "Invalid password." };
    }
  } else {
    try {
      await loginUser({ email: user.email, password });
    } catch {
      throw { status: 401, message: "Invalid password." };
    }
  }

  await db
    .update(userTable)
    .set({
      isDeleted: true,
      tokenVersion: (user.tokenVersion ?? 0) + 1,
      expoPushToken: null,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId));

  if (env.authMode !== "local" && env.cognitoUserPoolId && !user.cognitoSub.startsWith("local:")) {
    try {
      await cognitoClient.send(
        new AdminDeleteUserCommand({
          UserPoolId: env.cognitoUserPoolId,
          Username: user.email,
        })
      );
    } catch (err) {
      console.warn("[AccountDeletion] Cognito AdminDeleteUser failed (account still disabled in DB):", err);
    }
  }

  return { ok: true as const };
}
