import { eq } from "drizzle-orm";

import { db } from "../db";
import { userTable } from "../db/schema";
import { verifyLocalPassword } from "./auth.service";
import { isTrainingStaff } from "../lib/user-roles";

/**
 * Self-service account removal: invalidates sessions and blocks sign-in.
 * Data is retained for legal/ops (soft delete); the account cannot be used again with the same flow.
 */
export async function deleteOwnAccount(userId: number, password: string) {
  const rows = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
  const user = rows[0];
  if (!user || user.isDeleted) {
    throw { status: 404, message: "Account not found." };
  }
  if (isTrainingStaff(user.role)) {
    throw { status: 403, message: "Staff accounts cannot be deleted from the app." };
  }

  const ok = verifyLocalPassword(password, user.passwordHash, user.passwordSalt);
  if (!ok) {
    throw { status: 401, message: "Invalid password." };
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

  return { ok: true as const };
}
