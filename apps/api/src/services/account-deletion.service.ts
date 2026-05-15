import { eq } from "drizzle-orm";

import { db } from "../db";
import { userTable, userDeviceTokensTable, userLocationTable } from "../db/schema";
import { verifyLocalPassword } from "./auth.service";
import { isTrainingStaff } from "../lib/user-roles";

/**
 * Self-service account removal (GDPR Article 17 — right to erasure).
 * PII is immediately nulled out; non-identifying training records are retained
 * for operational integrity but are no longer linkable to a real person.
 * The row is kept (isDeleted: true) so FK references in historical records stay intact.
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

  // Erase all PII fields.
  await db
    .update(userTable)
    .set({
      isDeleted: true,
      name: "Deleted User",
      email: `deleted-${userId}@deleted.invalid`,
      cognitoSub: `deleted-${userId}`,
      profilePicture: null,
      coverImage: null,
      passwordHash: null,
      passwordSalt: null,
      verificationCode: null,
      expoPushToken: null,
      devicePushToken: null,
      devicePushTokenType: null,
      nutritionReminderEnabled: false,
      nutritionReminderTimeLocal: null,
      nutritionReminderTimezone: null,
      tokenVersion: (user.tokenVersion ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId));

  // Delete device push tokens and GPS location records (direct PII, no FK dependency needed).
  await Promise.all([
    db.delete(userDeviceTokensTable).where(eq(userDeviceTokensTable.userId, userId)),
    db.delete(userLocationTable).where(eq(userLocationTable.userId, userId)),
  ]);

  return { ok: true as const };
}
