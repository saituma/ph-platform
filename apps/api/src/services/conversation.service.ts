import { and, desc, eq, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";

import { db } from "../db";
import {
  conversationMessageReactionTable,
  conversationMessageTable,
  conversationParticipantTable,
  conversationReceiptTable,
  conversationTable,
  userTable,
} from "../db/schema";
import { getSocketServer } from "../socket-hub";
import { resolveMessageMediaType } from "../lib/media-message-type";
import { hasUserBlockBetween } from "./user-block.service";

/**
 * Direct messages as participant-based conversations. A direct conversation has exactly two
 * participants; read state lives solely in conversation_receipts. Co-managers are never
 * participants of someone else's DM, which is what structurally fixes the old fan-out.
 *
 * The public API here is peer-based (peerUserId) so the existing HTTP/socket contract is
 * preserved — callers keep talking in terms of the other user, we resolve the conversation.
 */

export const DIRECT_THREAD_MESSAGE_LIMIT = 120;

export function directKeyFor(a: number, b: number): string {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return `${lo}:${hi}`;
}

/** Find-or-create the direct conversation for a user pair, ensuring both participant rows. */
export async function getOrCreateDirectConversation(userA: number, userB: number): Promise<number> {
  const key = directKeyFor(userA, userB);
  const [existing] = await db
    .select({ id: conversationTable.id })
    .from(conversationTable)
    .where(eq(conversationTable.directKey, key))
    .limit(1);

  let conversationId = existing?.id ?? null;
  if (conversationId == null) {
    const inserted = await db
      .insert(conversationTable)
      .values({ kind: "direct", directKey: key })
      .onConflictDoNothing({ target: conversationTable.directKey })
      .returning({ id: conversationTable.id });
    conversationId = inserted[0]?.id ?? null;
    if (conversationId == null) {
      const [row] = await db
        .select({ id: conversationTable.id })
        .from(conversationTable)
        .where(eq(conversationTable.directKey, key))
        .limit(1);
      conversationId = row?.id ?? null;
    }
  }
  if (conversationId == null) throw new Error("Failed to resolve direct conversation");

  await db
    .insert(conversationParticipantTable)
    .values([
      { conversationId, userId: userA },
      { conversationId, userId: userB },
    ])
    .onConflictDoNothing({
      target: [conversationParticipantTable.conversationId, conversationParticipantTable.userId],
    });

  return conversationId;
}

type PersistedDirectMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  receiverId: number;
  content: string;
  contentType: "text" | "image" | "video";
  mediaUrl: string | null;
  clientMessageId: string | null;
  createdAt: Date;
  insertedNew: boolean;
};

/**
 * Persist a direct message into its conversation (idempotent on clientMessageId), create the two
 * receipts (sender read, receiver unread), and bump the conversation for inbox ordering.
 * Authorization (blocks, tier, team rules, AI-coach gating) is the caller's responsibility — this
 * is the storage primitive.
 */
export async function persistDirectMessage(input: {
  senderId: number;
  receiverId: number;
  content: string;
  contentType: "text" | "image" | "video";
  mediaUrl?: string | null;
  clientMessageId?: string | null;
}): Promise<PersistedDirectMessage> {
  const conversationId = await getOrCreateDirectConversation(input.senderId, input.receiverId);

  let insertedNew = true;
  let row: typeof conversationMessageTable.$inferSelect | undefined;

  if (input.clientMessageId) {
    const inserted = await db
      .insert(conversationMessageTable)
      .values({
        conversationId,
        senderId: input.senderId,
        content: input.content,
        contentType: input.contentType,
        mediaUrl: input.mediaUrl ?? null,
        clientMessageId: input.clientMessageId,
      })
      .onConflictDoNothing({
        target: [
          conversationMessageTable.conversationId,
          conversationMessageTable.senderId,
          conversationMessageTable.clientMessageId,
        ],
      })
      .returning();
    row = inserted[0];
    if (!row) {
      insertedNew = false;
      [row] = await db
        .select()
        .from(conversationMessageTable)
        .where(
          and(
            eq(conversationMessageTable.conversationId, conversationId),
            eq(conversationMessageTable.senderId, input.senderId),
            eq(conversationMessageTable.clientMessageId, input.clientMessageId),
          ),
        )
        .limit(1);
    }
  } else {
    const inserted = await db
      .insert(conversationMessageTable)
      .values({
        conversationId,
        senderId: input.senderId,
        content: input.content,
        contentType: input.contentType,
        mediaUrl: input.mediaUrl ?? null,
      })
      .returning();
    row = inserted[0];
  }

  if (!row) throw new Error("Failed to persist conversation message");

  if (insertedNew) {
    await db
      .insert(conversationReceiptTable)
      .values([
        { messageId: row.id, userId: input.senderId, deliveredAt: row.createdAt, readAt: row.createdAt },
        { messageId: row.id, userId: input.receiverId, deliveredAt: row.createdAt, readAt: null },
      ])
      .onConflictDoNothing({
        target: [conversationReceiptTable.messageId, conversationReceiptTable.userId],
      });

    await db
      .update(conversationTable)
      .set({ updatedAt: row.createdAt })
      .where(eq(conversationTable.id, conversationId));
  }

  return {
    id: row.id,
    conversationId,
    senderId: input.senderId,
    receiverId: input.receiverId,
    content: row.content,
    contentType: row.contentType,
    mediaUrl: row.mediaUrl ?? null,
    clientMessageId: row.clientMessageId ?? null,
    createdAt: row.createdAt,
    insertedNew,
  };
}

/** Emit `message:new` to both participants' rooms + admin oversight, preserving the old payload shape. */
export function emitDirectMessageNew(
  message: PersistedDirectMessage,
  extra: { senderName?: string | null; senderProfilePicture?: string | null; clientId?: string | null } = {},
) {
  const io = getSocketServer();
  if (!io) return;
  const enriched = {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    receiverId: message.receiverId,
    content: message.content,
    contentType: resolveMessageMediaType({ contentType: message.contentType, mediaUrl: message.mediaUrl }),
    mediaUrl: message.mediaUrl,
    read: false,
    createdAt: message.createdAt,
    senderName: extra.senderName ?? null,
    senderProfilePicture: extra.senderProfilePicture ?? null,
    deliveredCount: 2,
    readCount: 1,
    myReadAt: message.createdAt,
    ...(extra.clientId ? { clientId: extra.clientId } : {}),
  };
  io.to(`user:${message.senderId}`).emit("message:new", enriched);
  io.to(`user:${message.receiverId}`).emit("message:new", enriched);
  io.to("admin:all").emit("message:new", enriched);
}

async function attachConversationReactions(rows: Array<{ id: number; [k: string]: unknown }>) {
  if (!rows.length) return rows.map((r) => ({ ...r, reactions: [] as ReactionSummary[] }));
  const ids = rows.map((r) => r.id);
  const reactionRows = await db
    .select({
      messageId: conversationMessageReactionTable.messageId,
      emoji: conversationMessageReactionTable.emoji,
      userId: conversationMessageReactionTable.userId,
    })
    .from(conversationMessageReactionTable)
    .where(inArray(conversationMessageReactionTable.messageId, ids));
  const byMessage = new Map<number, Map<string, number[]>>();
  for (const r of reactionRows) {
    let m = byMessage.get(r.messageId);
    if (!m) byMessage.set(r.messageId, (m = new Map()));
    const list = m.get(r.emoji) ?? [];
    list.push(r.userId);
    m.set(r.emoji, list);
  }
  return rows.map((r) => {
    const m = byMessage.get(r.id);
    const reactions: ReactionSummary[] = m
      ? [...m.entries()].map(([emoji, userIds]) => ({ emoji, count: userIds.length, userIds }))
      : [];
    return { ...r, reactions };
  });
}

type ReactionSummary = { emoji: string; count: number; userIds: number[] };

/** The conversations a user participates in, shaped for the inbox (one direct thread per peer). */
export async function listConversationThreadsForUser(userId: number, limit = 200) {
  const rows = await db
    .select({
      conversationId: conversationTable.id,
      updatedAt: conversationTable.updatedAt,
      peerUserId: sql<number>`(
        select p2."userId" from ${conversationParticipantTable} p2
        where p2."conversationId" = ${conversationTable.id} and p2."userId" <> ${userId}
        limit 1
      )`.as("peerUserId"),
      lastReadAt: conversationParticipantTable.lastReadAt,
    })
    .from(conversationParticipantTable)
    .innerJoin(conversationTable, eq(conversationTable.id, conversationParticipantTable.conversationId))
    .where(eq(conversationParticipantTable.userId, userId))
    .orderBy(desc(conversationTable.updatedAt))
    .limit(limit);

  const conversationIds = rows.map((r) => r.conversationId);
  if (!conversationIds.length) return [];

  // Last message per conversation
  const lastMsgs = await db
    .select({
      conversationId: conversationMessageTable.conversationId,
      id: conversationMessageTable.id,
      senderId: conversationMessageTable.senderId,
      content: conversationMessageTable.content,
      contentType: conversationMessageTable.contentType,
      createdAt: conversationMessageTable.createdAt,
    })
    .from(conversationMessageTable)
    .where(inArray(conversationMessageTable.conversationId, conversationIds))
    .orderBy(desc(conversationMessageTable.id));
  const lastByConversation = new Map<number, (typeof lastMsgs)[number]>();
  for (const m of lastMsgs) if (!lastByConversation.has(m.conversationId)) lastByConversation.set(m.conversationId, m);

  // Unread per conversation = my receipts with readAt null on messages I didn't send
  const unreadRows = await db
    .select({
      conversationId: conversationMessageTable.conversationId,
      unread: sql<number>`count(*)::int`,
    })
    .from(conversationReceiptTable)
    .innerJoin(conversationMessageTable, eq(conversationMessageTable.id, conversationReceiptTable.messageId))
    .where(
      and(
        eq(conversationReceiptTable.userId, userId),
        isNull(conversationReceiptTable.readAt),
        ne(conversationMessageTable.senderId, userId),
        inArray(conversationMessageTable.conversationId, conversationIds),
      ),
    )
    .groupBy(conversationMessageTable.conversationId);
  const unreadByConversation = new Map<number, number>(unreadRows.map((r) => [r.conversationId, Number(r.unread)]));

  return rows
    .filter((r) => Number.isFinite(r.peerUserId) && r.peerUserId > 0)
    .map((r) => {
      const last = lastByConversation.get(r.conversationId);
      return {
        peerUserId: Number(r.peerUserId),
        conversationId: r.conversationId,
        unread: unreadByConversation.get(r.conversationId) ?? 0,
        preview: last?.content ?? "",
        lastMessageId: last?.id ?? null,
        lastMessageSenderId: last?.senderId ?? null,
        lastMessageContentType: last?.contentType ?? null,
        updatedAt: (last?.createdAt ?? r.updatedAt).toISOString(),
      };
    });
}

/** Messages of the direct conversation (userId, peerUserId), oldest→newest, with receipt + reaction data. */
export async function listConversationMessagesForPair(
  userId: number,
  peerUserId: number,
  options?: { limit?: number; cursorId?: number },
) {
  if (await hasUserBlockBetween(userId, peerUserId)) {
    return { messages: [], hasMore: false, nextCursor: null as number | null };
  }
  const key = directKeyFor(userId, peerUserId);
  const [conversation] = await db
    .select({ id: conversationTable.id })
    .from(conversationTable)
    .where(eq(conversationTable.directKey, key))
    .limit(1);
  if (!conversation) return { messages: [], hasMore: false, nextCursor: null as number | null };

  const limit = Math.max(1, Math.min(200, Math.floor(options?.limit ?? DIRECT_THREAD_MESSAGE_LIMIT)));
  const cursorId = options?.cursorId && Number.isFinite(options.cursorId) ? Math.floor(options.cursorId) : null;

  const rows = await db
    .select()
    .from(conversationMessageTable)
    .where(
      and(
        eq(conversationMessageTable.conversationId, conversation.id),
        cursorId ? lt(conversationMessageTable.id, cursorId) : sql`true`,
      ),
    )
    .orderBy(desc(conversationMessageTable.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;
  const messageIds = page.map((m) => m.id);

  const receipts = messageIds.length
    ? await db
        .select({
          messageId: conversationReceiptTable.messageId,
          userId: conversationReceiptTable.userId,
          readAt: conversationReceiptTable.readAt,
        })
        .from(conversationReceiptTable)
        .where(inArray(conversationReceiptTable.messageId, messageIds))
    : [];
  const readCountByMessage = new Map<number, number>();
  const myReadAtByMessage = new Map<number, Date | null>();
  for (const r of receipts) {
    if (r.readAt) readCountByMessage.set(r.messageId, (readCountByMessage.get(r.messageId) ?? 0) + 1);
    if (r.userId === userId) myReadAtByMessage.set(r.messageId, r.readAt ?? null);
  }

  const shaped = page
    .reverse()
    .map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      receiverId: m.senderId === userId ? peerUserId : userId,
      content: m.content,
      contentType: resolveMessageMediaType({ contentType: m.contentType, mediaUrl: m.mediaUrl }),
      mediaUrl: m.mediaUrl ?? null,
      read: (myReadAtByMessage.get(m.id) ?? null) != null,
      myReadAt: (myReadAtByMessage.get(m.id) ?? null)?.toISOString() ?? null,
      deliveredCount: 2,
      readCount: readCountByMessage.get(m.id) ?? 0,
      pinnedAt: m.pinnedAt ? m.pinnedAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
    }));

  const withReactions = await attachConversationReactions(shaped);
  return { messages: withReactions, hasMore, nextCursor };
}

/** Mark the user's receipts read for the direct conversation, update lastReadAt, emit message:read. */
export async function markConversationReadForPair(userId: number, peerUserId: number): Promise<number> {
  const key = directKeyFor(userId, peerUserId);
  const [conversation] = await db
    .select({ id: conversationTable.id })
    .from(conversationTable)
    .where(eq(conversationTable.directKey, key))
    .limit(1);
  if (!conversation) return 0;

  const readAt = new Date();
  const result = await db
    .update(conversationReceiptTable)
    .set({ readAt })
    .where(
      and(
        eq(conversationReceiptTable.userId, userId),
        isNull(conversationReceiptTable.readAt),
        inArray(
          conversationReceiptTable.messageId,
          db
            .select({ id: conversationMessageTable.id })
            .from(conversationMessageTable)
            .where(eq(conversationMessageTable.conversationId, conversation.id)),
        ),
      ),
    );
  const updated = result.rowCount ?? 0;

  await db
    .update(conversationParticipantTable)
    .set({ lastReadAt: readAt })
    .where(
      and(
        eq(conversationParticipantTable.conversationId, conversation.id),
        eq(conversationParticipantTable.userId, userId),
      ),
    );

  if (updated > 0) {
    const io = getSocketServer();
    if (io) {
      const payload = {
        scope: "direct" as const,
        readerUserId: userId,
        peerUserIds: [peerUserId],
        readAt: readAt.toISOString(),
        updated,
      };
      io.to(`user:${userId}`).emit("message:read", payload);
      io.to(`user:${peerUserId}`).emit("message:read", payload);
      io.to("admin:all").emit("message:read", payload);
    }
  }
  return updated;
}

/** Delete a conversation message the user authored; cascades receipts/reactions; emits message:deleted. */
export async function deleteConversationMessage(userId: number, messageId: number): Promise<boolean> {
  const [message] = await db
    .select({
      id: conversationMessageTable.id,
      senderId: conversationMessageTable.senderId,
      conversationId: conversationMessageTable.conversationId,
    })
    .from(conversationMessageTable)
    .where(eq(conversationMessageTable.id, messageId))
    .limit(1);
  if (!message || message.senderId !== userId) return false;

  const participants = await db
    .select({ userId: conversationParticipantTable.userId })
    .from(conversationParticipantTable)
    .where(eq(conversationParticipantTable.conversationId, message.conversationId));

  await db.delete(conversationMessageTable).where(eq(conversationMessageTable.id, messageId));

  const io = getSocketServer();
  if (io) {
    for (const p of participants) io.to(`user:${p.userId}`).emit("message:deleted", { messageId });
    io.to("admin:all").emit("message:deleted", { messageId });
  }
  return true;
}

/** Toggle a reaction on a conversation message (participant or staff). Returns the new reaction summary. */
export async function toggleConversationReaction(input: {
  userId: number;
  messageId: number;
  emoji: string;
  actorIsStaff: boolean;
}): Promise<ReactionSummary[] | null> {
  const [message] = await db
    .select({
      id: conversationMessageTable.id,
      conversationId: conversationMessageTable.conversationId,
    })
    .from(conversationMessageTable)
    .where(eq(conversationMessageTable.id, input.messageId))
    .limit(1);
  if (!message) return null;

  const participants = await db
    .select({ userId: conversationParticipantTable.userId })
    .from(conversationParticipantTable)
    .where(eq(conversationParticipantTable.conversationId, message.conversationId));
  const participantIds = participants.map((p) => p.userId);
  if (!input.actorIsStaff && !participantIds.includes(input.userId)) return null;

  const [existing] = await db
    .select({ id: conversationMessageReactionTable.id })
    .from(conversationMessageReactionTable)
    .where(
      and(
        eq(conversationMessageReactionTable.messageId, input.messageId),
        eq(conversationMessageReactionTable.userId, input.userId),
        eq(conversationMessageReactionTable.emoji, input.emoji),
      ),
    )
    .limit(1);
  if (existing) {
    await db.delete(conversationMessageReactionTable).where(eq(conversationMessageReactionTable.id, existing.id));
  } else {
    await db
      .insert(conversationMessageReactionTable)
      .values({ messageId: input.messageId, userId: input.userId, emoji: input.emoji });
  }

  const [enriched] = await attachConversationReactions([{ id: input.messageId }]);
  const reactions = (enriched as { reactions: ReactionSummary[] }).reactions;
  const io = getSocketServer();
  if (io) {
    for (const id of participantIds) io.to(`user:${id}`).emit("message:reaction", { messageId: input.messageId, reactions });
    io.to("admin:all").emit("message:reaction", { messageId: input.messageId, reactions });
  }
  return reactions;
}
