import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import {
  messageTable,
  messageReceiptTable,
  messageReactionTable,
  conversationTable,
  conversationMessageTable,
  conversationReceiptTable,
  conversationMessageReactionTable,
} from "../src/db/schema";
import { getOrCreateDirectConversation, directKeyFor } from "../src/services/conversation.service";

/**
 * One-time, idempotent backfill of the legacy 1:1 `messages` table into the conversation model.
 * Leaves `messages`/`message_receipts`/`message_reactions` intact (backout = revert the code).
 * Idempotency: each legacy message maps to a conversation_message whose clientMessageId is the
 * original one (if any) or `mig:<legacyId>`; the unique (conversationId, senderId, clientMessageId)
 * makes re-runs a no-op (already-migrated messages are skipped, and only freshly-inserted ones get
 * receipts/reactions copied).
 */
async function main() {
  process.env.PH_API_SCRIPT ??= "1";

  const messages = await db.select().from(messageTable).orderBy(messageTable.id);
  console.log(`Loaded ${messages.length} legacy messages.`);
  if (!messages.length) {
    console.log("Nothing to migrate.");
    process.exit(0);
  }

  const oldIds = messages.map((m) => m.id);
  const receipts = await db.select().from(messageReceiptTable).where(inArray(messageReceiptTable.messageId, oldIds));
  const reactions = await db.select().from(messageReactionTable).where(inArray(messageReactionTable.messageId, oldIds));
  const receiptsByOld = new Map<number, typeof receipts>();
  for (const r of receipts) (receiptsByOld.get(r.messageId) ?? receiptsByOld.set(r.messageId, []).get(r.messageId)!).push(r);
  const reactionsByOld = new Map<number, typeof reactions>();
  for (const r of reactions) (reactionsByOld.get(r.messageId) ?? reactionsByOld.set(r.messageId, []).get(r.messageId)!).push(r);

  const convByKey = new Map<string, number>();
  const convLatestAt = new Map<number, Date>();
  const participantLastReadAt = new Map<string, Date>();
  let migrated = 0;
  let skipped = 0;

  for (const m of messages) {
    const key = directKeyFor(m.senderId, m.receiverId);
    let conversationId = convByKey.get(key);
    if (conversationId == null) {
      conversationId = await getOrCreateDirectConversation(m.senderId, m.receiverId);
      convByKey.set(key, conversationId);
    }
    const latest = convLatestAt.get(conversationId);
    if (!latest || m.createdAt > latest) convLatestAt.set(conversationId, m.createdAt);

    const oldReceipts = receiptsByOld.get(m.id) ?? [];
    if (oldReceipts.length) {
      for (const receipt of oldReceipts) {
        if (!receipt.readAt) continue;
        const lastReadKey = `${conversationId}:${receipt.userId}`;
        const previous = participantLastReadAt.get(lastReadKey);
        if (!previous || receipt.readAt > previous) participantLastReadAt.set(lastReadKey, receipt.readAt);
      }
    } else if (m.read) {
      const lastReadKey = `${conversationId}:${m.receiverId}`;
      const previous = participantLastReadAt.get(lastReadKey);
      if (!previous || m.createdAt > previous) participantLastReadAt.set(lastReadKey, m.createdAt);
    }
    const senderLastReadKey = `${conversationId}:${m.senderId}`;
    const senderPrevious = participantLastReadAt.get(senderLastReadKey);
    if (!senderPrevious || m.createdAt > senderPrevious) participantLastReadAt.set(senderLastReadKey, m.createdAt);

    const clientMessageId = m.clientMessageId ?? `mig:${m.id}`;
    const inserted = await db
      .insert(conversationMessageTable)
      .values({
        conversationId,
        senderId: m.senderId,
        content: m.content.slice(0, 500),
        contentType: m.contentType,
        mediaUrl: m.mediaUrl ?? null,
        videoUploadId: m.videoUploadId ?? null,
        clientMessageId,
        pinnedAt: m.pinnedAt ?? null,
        createdAt: m.createdAt,
        updatedAt: m.createdAt,
      })
      .onConflictDoNothing({
        target: [
          conversationMessageTable.conversationId,
          conversationMessageTable.senderId,
          conversationMessageTable.clientMessageId,
        ],
      })
      .returning({ id: conversationMessageTable.id });

    const newId = inserted[0]?.id;
    if (newId == null) {
      skipped++;
      continue; // already migrated on a prior run
    }

    if (oldReceipts.length) {
      await db
        .insert(conversationReceiptTable)
        .values(
          oldReceipts.map((r) => ({
            messageId: newId,
            userId: r.userId,
            deliveredAt: r.deliveredAt,
            readAt: r.readAt ?? null,
          })),
        )
        .onConflictDoNothing({ target: [conversationReceiptTable.messageId, conversationReceiptTable.userId] });
    } else {
      await db
        .insert(conversationReceiptTable)
        .values([
          { messageId: newId, userId: m.senderId, deliveredAt: m.createdAt, readAt: m.createdAt },
          { messageId: newId, userId: m.receiverId, deliveredAt: m.createdAt, readAt: m.read ? m.createdAt : null },
        ])
        .onConflictDoNothing({ target: [conversationReceiptTable.messageId, conversationReceiptTable.userId] });
    }

    const oldReactions = reactionsByOld.get(m.id) ?? [];
    if (oldReactions.length) {
      await db
        .insert(conversationMessageReactionTable)
        .values(oldReactions.map((r) => ({ messageId: newId, userId: r.userId, emoji: r.emoji })));
    }

    migrated++;
  }

  for (const [conversationId, createdAt] of convLatestAt) {
    await db.update(conversationTable).set({ updatedAt: createdAt }).where(eq(conversationTable.id, conversationId));
  }

  for (const [key, lastReadAt] of participantLastReadAt) {
    const [conversationIdRaw, userIdRaw] = key.split(":");
    const conversationId = Number(conversationIdRaw);
    const userId = Number(userIdRaw);
    if (!Number.isFinite(conversationId) || !Number.isFinite(userId)) continue;
    await db
      .update(conversationParticipantTable)
      .set({ lastReadAt })
      .where(
        and(
          eq(conversationParticipantTable.conversationId, conversationId),
          eq(conversationParticipantTable.userId, userId),
        ),
      );
  }

  console.log(
    `Done. migrated=${migrated} skipped(already)=${skipped} conversations=${convByKey.size}.`,
  );
  process.exit(0);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
