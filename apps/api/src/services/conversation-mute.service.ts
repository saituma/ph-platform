import { and, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db } from "../db";
import { conversationMutesTable } from "../db/schema";

export async function muteThread(
  userId: number,
  threadId: string,
  mutedUntil?: Date | null,
): Promise<void> {
  await db
    .insert(conversationMutesTable)
    .values({ userId, threadId, mutedUntil: mutedUntil ?? null })
    .onConflictDoUpdate({
      target: [conversationMutesTable.userId, conversationMutesTable.threadId],
      set: { mutedUntil: mutedUntil ?? null, updatedAt: new Date() },
    });
}

export async function unmuteThread(userId: number, threadId: string): Promise<void> {
  await db
    .delete(conversationMutesTable)
    .where(
      and(eq(conversationMutesTable.userId, userId), eq(conversationMutesTable.threadId, threadId)),
    );
}

export async function isThreadMuted(userId: number, threadId: string): Promise<boolean> {
  const now = new Date();
  const [row] = await db
    .select({ id: conversationMutesTable.id, mutedUntil: conversationMutesTable.mutedUntil })
    .from(conversationMutesTable)
    .where(
      and(
        eq(conversationMutesTable.userId, userId),
        eq(conversationMutesTable.threadId, threadId),
      ),
    )
    .limit(1);

  if (!row) return false;
  // Indefinite mute
  if (!row.mutedUntil) return true;
  // Timed mute still active
  return row.mutedUntil > now;
}

export async function listMutedThreads(userId: number): Promise<
  { threadId: string; mutedUntil: Date | null }[]
> {
  const now = new Date();
  const rows = await db
    .select({ threadId: conversationMutesTable.threadId, mutedUntil: conversationMutesTable.mutedUntil })
    .from(conversationMutesTable)
    .where(
      and(
        eq(conversationMutesTable.userId, userId),
        or(isNull(conversationMutesTable.mutedUntil), gt(conversationMutesTable.mutedUntil, now)),
      ),
    );
  return rows;
}

export async function cleanupExpiredMutes(): Promise<void> {
  const now = new Date();
  await db
    .delete(conversationMutesTable)
    .where(and(isNotNull(conversationMutesTable.mutedUntil), lt(conversationMutesTable.mutedUntil, now)));
}
