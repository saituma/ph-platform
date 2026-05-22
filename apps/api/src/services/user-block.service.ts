import { and, eq, inArray, or } from "drizzle-orm";

import { db } from "../db";
import { userBlockTable } from "../db/schema";

export async function blockUserPair(input: { blockerId: number; blockedId: number }) {
  await db
    .insert(userBlockTable)
    .values({
      blockerId: input.blockerId,
      blockedId: input.blockedId,
    })
    .onConflictDoNothing({
      target: [userBlockTable.blockerId, userBlockTable.blockedId],
    });
}

export async function hasUserBlockBetween(userId: number, otherUserId: number) {
  const rows = await db
    .select({ id: userBlockTable.id })
    .from(userBlockTable)
    .where(
      or(
        and(eq(userBlockTable.blockerId, userId), eq(userBlockTable.blockedId, otherUserId)),
        and(eq(userBlockTable.blockerId, otherUserId), eq(userBlockTable.blockedId, userId)),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

export async function filterBlockedRecipientsForSender(senderId: number, recipientIds: number[]) {
  const uniqueRecipientIds = Array.from(new Set(recipientIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (!uniqueRecipientIds.length) return [];

  const rows = await db
    .select({
      blockerId: userBlockTable.blockerId,
      blockedId: userBlockTable.blockedId,
    })
    .from(userBlockTable)
    .where(
      or(
        and(eq(userBlockTable.blockerId, senderId), inArray(userBlockTable.blockedId, uniqueRecipientIds)),
        and(inArray(userBlockTable.blockerId, uniqueRecipientIds), eq(userBlockTable.blockedId, senderId)),
      ),
    );

  const suppressedRecipients = new Set<number>();
  for (const row of rows) {
    if (row.blockerId === senderId) {
      suppressedRecipients.add(row.blockedId);
    } else {
      suppressedRecipients.add(row.blockerId);
    }
  }

  return uniqueRecipientIds.filter((id) => !suppressedRecipients.has(id));
}
