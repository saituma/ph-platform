import { and, desc, eq, ilike, inArray, isNull, lt, ne, sql } from "drizzle-orm";

import { db } from "../db";
import {
  athleteTable,
  conversationMessageReactionTable,
  conversationMessageTable,
  conversationParticipantTable,
  conversationReceiptTable,
  conversationTable,
  programSessionCompletionTable,
  userTable,
} from "../db/schema";
import { getSocketServer } from "../socket-hub";
import { resolveMessageMediaType } from "../lib/media-message-type";
import { hasUserBlockBetween } from "./user-block.service";
import { createLogger } from "../lib/logger";
import { logRealtimeLatency, type RealtimeTrace } from "../lib/realtime-latency";
import { runBestEffortBackgroundTask } from "../lib/background-task";
import { batchedPush } from "../lib/notification-batcher";
import { isSharedInboxViewer } from "../lib/messaging-access";
import { getAdminCoachIds, getTeamManagersForUser } from "./message.service";
import { publicDisplayName } from "../lib/display-name";
import { getManagedTeamIds } from "./team-membership";

const log = createLogger({ component: "conversation-service" });

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
  videoUploadId: number | null;
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
  videoUploadId?: number | null;
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
        videoUploadId: input.videoUploadId ?? null,
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
        videoUploadId: input.videoUploadId ?? null,
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
    videoUploadId: row.videoUploadId ?? null,
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
    videoUploadId: message.videoUploadId,
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

async function attachConversationReactions<T extends { id: number }>(rows: T[]): Promise<Array<T & { reactions: ReactionSummary[] }>> {
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

async function peerBlockedByCurrentManagerScope(viewerId: number, peerUserId: number): Promise<boolean> {
  const managedTeamIds = await getManagedTeamIds(viewerId);
  if (!managedTeamIds.length) return false;

  const [viewer] = await db.select({ role: userTable.role }).from(userTable).where(eq(userTable.id, viewerId)).limit(1);
  if (await isSharedInboxViewer(viewerId, viewer?.role ?? null)) return false;

  const [peerAthlete] = await db
    .select({ teamId: athleteTable.teamId })
    .from(athleteTable)
    .where(eq(athleteTable.userId, peerUserId))
    .limit(1);
  if (!peerAthlete) return false;
  return peerAthlete.teamId == null || !managedTeamIds.includes(peerAthlete.teamId);
}

async function filterPeersForCurrentManagerScope<T extends { peerUserId: number }>(
  viewerId: number,
  rows: T[],
): Promise<T[]> {
  const managedTeamIds = await getManagedTeamIds(viewerId);
  if (!managedTeamIds.length || !rows.length) return rows;

  const [viewer] = await db.select({ role: userTable.role }).from(userTable).where(eq(userTable.id, viewerId)).limit(1);
  if (await isSharedInboxViewer(viewerId, viewer?.role ?? null)) return rows;

  const peerIds = Array.from(new Set(rows.map((row) => row.peerUserId)));
  const athleteRows = await db
    .select({ userId: athleteTable.userId, teamId: athleteTable.teamId })
    .from(athleteTable)
    .where(inArray(athleteTable.userId, peerIds));
  const athleteTeamByUserId = new Map(athleteRows.map((row) => [row.userId, row.teamId]));

  return rows.filter((row) => {
    if (!athleteTeamByUserId.has(row.peerUserId)) return true;
    const teamId = athleteTeamByUserId.get(row.peerUserId);
    return teamId != null && managedTeamIds.includes(teamId);
  });
}

function safeLimit(value: unknown, fallback: number, max = 200) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(n)));
}

function encodeReplyPrefix(input: {
  content: string;
  replyToMessageId?: number | null;
  replyPreview?: string | null;
}) {
  const safeBaseContent = input.content.trim() || "Attachment";
  const safeReplyPreview = encodeURIComponent((input.replyPreview ?? "").trim().slice(0, 160));
  const replyPrefix =
    input.replyToMessageId && Number.isFinite(input.replyToMessageId)
      ? `[reply:${input.replyToMessageId}:${safeReplyPreview}] `
      : "";
  return `${replyPrefix}${safeBaseContent}`;
}

export async function sendDirectMessage(input: {
  senderId: number;
  receiverId: number;
  content: string;
  contentType: "text" | "image" | "video";
  mediaUrl?: string | null;
  videoUploadId?: number | null;
  replyToMessageId?: number | null;
  replyPreview?: string | null;
  clientId?: string | null;
  senderRole?: string | null;
  bypassMessagingTierForCoach?: boolean;
  trace?: RealtimeTrace;
}) {
  const trace = input.trace;
  if (input.receiverId <= 0) throw new Error("Invalid receiver");
  logRealtimeLatency(trace, "direct.service.start", {
    senderId: input.senderId,
    receiverId: input.receiverId,
    hasMedia: Boolean(input.mediaUrl),
  });

  if (await hasUserBlockBetween(input.senderId, input.receiverId)) {
    throw new Error("USER_BLOCKED");
  }

  if (await peerBlockedByCurrentManagerScope(input.senderId, input.receiverId)) {
    throw new Error("MESSAGING_DISABLED_FOR_TIER");
  }

  const adminIds = await getAdminCoachIds();
  const senderIsStaff = adminIds.includes(input.senderId);
  if (!senderIsStaff && adminIds.includes(input.receiverId)) {
    const myTeamManagers = await getTeamManagersForUser(input.senderId);
    const isMessagingMyTeamManager = myTeamManagers.some((m) => m.id === input.receiverId);

    if (input.senderRole === "team_athlete" && !isMessagingMyTeamManager) {
      throw new Error("MESSAGING_DISABLED_FOR_TIER");
    }

    if (input.senderRole === "adult_athlete" || input.senderRole === "youth_athlete") {
      const [receiverUser] = await db
        .select({ role: userTable.role })
        .from(userTable)
        .where(eq(userTable.id, input.receiverId))
        .limit(1);
      if (receiverUser?.role === "team_coach") {
        throw new Error("MESSAGING_DISABLED_FOR_TIER");
      }
    }

    if (!input.bypassMessagingTierForCoach && !isMessagingMyTeamManager) {
      const { getAthleteForUser, getGuardianAndAthlete } = await import("./user.service");
      const { getMessagingAccessTiers } = await import("./messaging-policy.service");
      const athlete = await getAthleteForUser(input.senderId);
      const tier = athlete?.currentProgramTier ?? null;
      let hasActivePlan = athlete?.currentPlanId != null;
      if (!hasActivePlan) {
        const { guardian } = await getGuardianAndAthlete(input.senderId);
        if (guardian?.currentPlanId != null) hasActivePlan = true;
      }
      const allowed = await getMessagingAccessTiers();
      if (!hasActivePlan && (!tier || !(allowed as readonly string[]).includes(tier))) {
        throw new Error("MESSAGING_DISABLED_FOR_TIER");
      }
    }
  }

  logRealtimeLatency(trace, "direct.db.before_insert", {
    senderId: input.senderId,
    receiverId: input.receiverId,
    clientId: input.clientId ?? null,
  });
  const message = await persistDirectMessage({
    senderId: input.senderId,
    receiverId: input.receiverId,
    content: encodeReplyPrefix(input),
    contentType: input.contentType,
    mediaUrl: input.mediaUrl ?? null,
    videoUploadId: input.videoUploadId ?? null,
    clientMessageId: input.clientId ?? null,
  });
  logRealtimeLatency(trace, "direct.db.after_insert", {
    messageId: message.id,
    insertedNewMessage: message.insertedNew,
    receiverId: input.receiverId,
  });

  if (!message.insertedNew) {
    return {
      ...message,
      read: false,
      updatedAt: message.createdAt,
      deliveredCount: 2,
      readCount: 1,
      myReadAt: message.createdAt,
    };
  }

  let senderMeta: { name: string | null; profilePicture: string | null } | null = null;
  try {
    const [sender] = await db
      .select({ name: userTable.name, profilePicture: userTable.profilePicture })
      .from(userTable)
      .where(eq(userTable.id, input.senderId))
      .limit(1);
    senderMeta = sender ? { name: sender.name ?? null, profilePicture: sender.profilePicture ?? null } : null;
  } catch (error) {
    log.error({ err: error, traceId: trace?.traceId, messageId: message.id }, "Failed to load sender metadata");
  }

  emitDirectMessageNew(message, {
    senderName: senderMeta?.name ?? null,
    senderProfilePicture: senderMeta?.profilePicture ?? null,
    clientId: input.clientId ?? null,
  });
  logRealtimeLatency(trace, "direct.socket.after_broadcast", {
    messageId: message.id,
    senderId: input.senderId,
    receiverId: input.receiverId,
  });

  if (input.contentType === "video" && input.videoUploadId) {
    const io = getSocketServer();
    if (io) {
      const [completion] = await db
        .select({
          id: programSessionCompletionTable.id,
          sessionId: programSessionCompletionTable.sessionId,
          athleteId: programSessionCompletionTable.athleteId,
        })
        .from(programSessionCompletionTable)
        .where(eq(programSessionCompletionTable.id, input.videoUploadId))
        .limit(1);
      io.to(`user:${input.receiverId}`).emit("program:session:coach-video-response", {
        sessionId: completion?.sessionId ?? null,
        completionId: completion?.id ?? null,
        athleteId: completion?.athleteId ?? null,
        mediaUrl: input.mediaUrl ?? null,
        createdAt: message.createdAt,
      });
    }
  }

  runBestEffortBackgroundTask(
    "direct-message-push",
    { traceId: trace?.traceId, messageId: message.id, receiverId: input.receiverId, userId: input.receiverId },
    async () => {
      const threadId = String(input.senderId);
      await batchedPush(
        input.receiverId,
        threadId,
        `New message from ${senderMeta?.name ?? "Coach"}`,
        input.contentType === "text" ? input.content : `Sent a ${input.contentType}`,
        {
          type: "message",
          threadId,
          url: `/messages/${threadId}`,
          mediaUrl: input.mediaUrl ?? null,
          senderAvatar: senderMeta?.profilePicture ?? null,
        },
      );
    },
  );

  return {
    ...message,
    read: false,
    updatedAt: message.createdAt,
    deliveredCount: 2,
    readCount: 1,
    myReadAt: message.createdAt,
  };
}

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

  const shaped = rows
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
  return filterPeersForCurrentManagerScope(userId, shaped);
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
  if (await peerBlockedByCurrentManagerScope(userId, peerUserId)) {
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
      videoUploadId: m.videoUploadId ?? null,
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

/** Latest participant messages across all of the user's direct conversations. */
export async function listConversationMessagesForUser(
  userId: number,
  options?: { limit?: number; cursorId?: number; peerUserId?: number },
) {
  if (options?.peerUserId) {
    return listConversationMessagesForPair(userId, options.peerUserId, options);
  }

  const limit = safeLimit(options?.limit, DIRECT_THREAD_MESSAGE_LIMIT);
  const cursorId = options?.cursorId && Number.isFinite(options.cursorId) ? Math.floor(options.cursorId) : null;
  const participantRows = await db
    .select({ conversationId: conversationParticipantTable.conversationId })
    .from(conversationParticipantTable)
    .where(eq(conversationParticipantTable.userId, userId));
  const conversationIds = participantRows.map((r) => r.conversationId);
  if (!conversationIds.length) return { messages: [], hasMore: false, nextCursor: null as number | null };

  const rows = await db
    .select()
    .from(conversationMessageTable)
    .where(
      and(
        inArray(conversationMessageTable.conversationId, conversationIds),
        cursorId ? lt(conversationMessageTable.id, cursorId) : sql`true`,
      ),
    )
    .orderBy(desc(conversationMessageTable.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;
  const conversationPeers = await db
    .select({
      conversationId: conversationParticipantTable.conversationId,
      userId: conversationParticipantTable.userId,
    })
    .from(conversationParticipantTable)
    .where(inArray(conversationParticipantTable.conversationId, Array.from(new Set(page.map((m) => m.conversationId)))));
  const peerByConversation = new Map<number, number>();
  for (const row of conversationPeers) {
    if (row.userId !== userId) peerByConversation.set(row.conversationId, row.userId);
  }

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
    .map((m) => {
      const peerUserId = peerByConversation.get(m.conversationId) ?? userId;
      return {
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        receiverId: m.senderId === userId ? peerUserId : userId,
        content: m.content,
        contentType: resolveMessageMediaType({ contentType: m.contentType, mediaUrl: m.mediaUrl }),
        mediaUrl: m.mediaUrl ?? null,
        videoUploadId: m.videoUploadId ?? null,
        read: (myReadAtByMessage.get(m.id) ?? null) != null,
        myReadAt: (myReadAtByMessage.get(m.id) ?? null)?.toISOString() ?? null,
        deliveredCount: 2,
        readCount: readCountByMessage.get(m.id) ?? 0,
        pinnedAt: m.pinnedAt ? m.pinnedAt.toISOString() : null,
        createdAt: m.createdAt.toISOString(),
      };
    });

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

export async function markConversationRead(userId: number, peerUserId?: number): Promise<number> {
  if (peerUserId) return markConversationReadForPair(userId, peerUserId);

  const unreadRows = await db
    .select({
      messageId: conversationReceiptTable.messageId,
      conversationId: conversationMessageTable.conversationId,
      senderId: conversationMessageTable.senderId,
    })
    .from(conversationReceiptTable)
    .innerJoin(conversationMessageTable, eq(conversationMessageTable.id, conversationReceiptTable.messageId))
    .where(
      and(
        eq(conversationReceiptTable.userId, userId),
        isNull(conversationReceiptTable.readAt),
        ne(conversationMessageTable.senderId, userId),
      ),
    );
  if (!unreadRows.length) return 0;

  const readAt = new Date();
  const messageIds = unreadRows.map((r) => r.messageId);
  const result = await db
    .update(conversationReceiptTable)
    .set({ readAt })
    .where(and(eq(conversationReceiptTable.userId, userId), inArray(conversationReceiptTable.messageId, messageIds)));
  const conversationIds = Array.from(new Set(unreadRows.map((r) => r.conversationId)));
  await db
    .update(conversationParticipantTable)
    .set({ lastReadAt: readAt })
    .where(
      and(
        eq(conversationParticipantTable.userId, userId),
        inArray(conversationParticipantTable.conversationId, conversationIds),
      ),
    );

  const peerUserIds = Array.from(new Set(unreadRows.map((r) => r.senderId)));
  const updated = result.rowCount ?? unreadRows.length;
  const io = getSocketServer();
  if (io && updated > 0) {
    const payload = {
      scope: "direct" as const,
      readerUserId: userId,
      peerUserIds,
      readAt: readAt.toISOString(),
      updated,
    };
    io.to(`user:${userId}`).emit("message:read", payload);
    for (const peerId of peerUserIds) io.to(`user:${peerId}`).emit("message:read", payload);
    io.to("admin:all").emit("message:read", payload);
  }
  return updated;
}

export async function markConversationMessageDelivered(messageId: number, receiverUserId: number) {
  const now = new Date();
  await db
    .update(conversationReceiptTable)
    .set({ deliveredAt: now })
    .where(
      and(
        eq(conversationReceiptTable.messageId, messageId),
        eq(conversationReceiptTable.userId, receiverUserId),
        isNull(conversationReceiptTable.deliveredAt),
      ),
    );
  const [message] = await db
    .select({ senderId: conversationMessageTable.senderId })
    .from(conversationMessageTable)
    .where(eq(conversationMessageTable.id, messageId))
    .limit(1);
  if (message?.senderId && message.senderId !== receiverUserId) {
    getSocketServer()?.to(`user:${message.senderId}`).emit("message:status", {
      messageId,
      status: "delivered",
      byUserId: receiverUserId,
      at: now.toISOString(),
    });
  }
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

export async function pinConversationMessage(input: { userId: number; messageId: number }): Promise<boolean | null> {
  const [message] = await db
    .select({
      id: conversationMessageTable.id,
      conversationId: conversationMessageTable.conversationId,
      pinnedAt: conversationMessageTable.pinnedAt,
    })
    .from(conversationMessageTable)
    .where(eq(conversationMessageTable.id, input.messageId))
    .limit(1);
  if (!message) return null;

  const [participant] = await db
    .select({ id: conversationParticipantTable.id })
    .from(conversationParticipantTable)
    .where(
      and(
        eq(conversationParticipantTable.conversationId, message.conversationId),
        eq(conversationParticipantTable.userId, input.userId),
      ),
    )
    .limit(1);
  if (!participant) throw new Error("Forbidden");

  const nowPinned = message.pinnedAt === null;
  await db
    .update(conversationMessageTable)
    .set({ pinnedAt: nowPinned ? new Date() : null })
    .where(eq(conversationMessageTable.id, input.messageId));
  return nowPinned;
}

export async function searchConversationMessages(input: { userId: number; q: string; peerUserId?: number }) {
  const escaped = input.q.replace(/[%_\\]/g, "\\$&");
  const participantRows = await db
    .select({ conversationId: conversationParticipantTable.conversationId })
    .from(conversationParticipantTable)
    .where(eq(conversationParticipantTable.userId, input.userId));
  let conversationIds = participantRows.map((r) => r.conversationId);
  if (input.peerUserId) {
    const key = directKeyFor(input.userId, input.peerUserId);
    const [conversation] = await db
      .select({ id: conversationTable.id })
      .from(conversationTable)
      .where(eq(conversationTable.directKey, key))
      .limit(1);
    conversationIds = conversation ? [conversation.id] : [];
  }
  if (!conversationIds.length) return [];

  const rows = await db
    .select({
      id: conversationMessageTable.id,
      conversationId: conversationMessageTable.conversationId,
      content: conversationMessageTable.content,
      senderId: conversationMessageTable.senderId,
      createdAt: conversationMessageTable.createdAt,
      contentType: conversationMessageTable.contentType,
      mediaUrl: conversationMessageTable.mediaUrl,
    })
    .from(conversationMessageTable)
    .where(and(ilike(conversationMessageTable.content, `%${escaped}%`), inArray(conversationMessageTable.conversationId, conversationIds)))
    .orderBy(desc(conversationMessageTable.createdAt))
    .limit(50);

  const participants = await db
    .select({
      conversationId: conversationParticipantTable.conversationId,
      userId: conversationParticipantTable.userId,
    })
    .from(conversationParticipantTable)
    .where(inArray(conversationParticipantTable.conversationId, Array.from(new Set(rows.map((r) => r.conversationId)))));
  const peerByConversation = new Map<number, number>();
  for (const row of participants) {
    if (row.userId !== input.userId) peerByConversation.set(row.conversationId, row.userId);
  }

  return rows.map((row) => {
    const peerUserId = peerByConversation.get(row.conversationId) ?? input.userId;
    return {
      id: row.id,
      conversationId: row.conversationId,
      content: row.content,
      senderId: row.senderId,
      receiverId: row.senderId === input.userId ? peerUserId : input.userId,
      createdAt: row.createdAt,
      contentType: resolveMessageMediaType({ contentType: row.contentType, mediaUrl: row.mediaUrl }),
    };
  });
}

export async function canAccessConversationMessage(userId: number, messageId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: conversationMessageTable.id })
    .from(conversationMessageTable)
    .innerJoin(
      conversationParticipantTable,
      eq(conversationParticipantTable.conversationId, conversationMessageTable.conversationId),
    )
    .where(and(eq(conversationMessageTable.id, messageId), eq(conversationParticipantTable.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function getConversationMessageForForward(userId: number, messageId: number) {
  const [row] = await db
    .select({
      id: conversationMessageTable.id,
      content: conversationMessageTable.content,
      contentType: conversationMessageTable.contentType,
      mediaUrl: conversationMessageTable.mediaUrl,
    })
    .from(conversationMessageTable)
    .innerJoin(
      conversationParticipantTable,
      eq(conversationParticipantTable.conversationId, conversationMessageTable.conversationId),
    )
    .where(and(eq(conversationMessageTable.id, messageId), eq(conversationParticipantTable.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function listConversationThreadsAdmin(coachId: number, options?: { q?: string; limit?: number }) {
  const limit = safeLimit(options?.limit, 50, 200);
  const q = options?.q?.trim().toLowerCase() ?? "";
  const adminIds = await getAdminCoachIds();
  if (!adminIds.includes(coachId)) return [];

  const [callerUser] = await db.select({ role: userTable.role }).from(userTable).where(eq(userTable.id, coachId)).limit(1);
  const sharedViewer = await isSharedInboxViewer(coachId, callerUser?.role ?? null);
  const visibleAdminIds = sharedViewer ? adminIds : [coachId];
  const visibleConversationIdsSubquery = db
    .select({ conversationId: conversationParticipantTable.conversationId })
    .from(conversationParticipantTable)
    .where(inArray(conversationParticipantTable.userId, visibleAdminIds));

  const participantRows = await db
    .select({
      conversationId: conversationParticipantTable.conversationId,
      userId: conversationParticipantTable.userId,
      updatedAt: conversationTable.updatedAt,
    })
    .from(conversationParticipantTable)
    .innerJoin(conversationTable, eq(conversationTable.id, conversationParticipantTable.conversationId))
    .where(inArray(conversationParticipantTable.conversationId, visibleConversationIdsSubquery))
    .orderBy(desc(conversationTable.updatedAt))
    .limit(limit * 4);

  const byConversation = new Map<number, { updatedAt: Date; participantIds: number[] }>();
  for (const row of participantRows) {
    const current = byConversation.get(row.conversationId) ?? { updatedAt: row.updatedAt, participantIds: [] };
    current.participantIds.push(row.userId);
    byConversation.set(row.conversationId, current);
  }

  let entries = [...byConversation.entries()]
    .map(([conversationId, info]) => ({
      conversationId,
      updatedAt: info.updatedAt,
      userId: info.participantIds.find((id) => !visibleAdminIds.includes(id) && id !== coachId) ?? info.participantIds.find((id) => id !== coachId) ?? null,
    }))
    .filter((entry): entry is { conversationId: number; updatedAt: Date; userId: number } => entry.userId != null);
  if (!sharedViewer) {
    const filtered = await filterPeersForCurrentManagerScope(
      coachId,
      entries.map((entry) => ({ ...entry, peerUserId: entry.userId })),
    );
    entries = filtered.map(({ peerUserId: _peerUserId, ...entry }) => entry);
  }
  if (!entries.length) return [];

  const conversationIds = entries.map((entry) => entry.conversationId);
  const latestRows = await db
    .select({
      conversationId: conversationMessageTable.conversationId,
      content: conversationMessageTable.content,
      createdAt: conversationMessageTable.createdAt,
    })
    .from(conversationMessageTable)
    .where(inArray(conversationMessageTable.conversationId, conversationIds))
    .orderBy(desc(conversationMessageTable.id));
  const latestByConversation = new Map<number, (typeof latestRows)[number]>();
  for (const row of latestRows) if (!latestByConversation.has(row.conversationId)) latestByConversation.set(row.conversationId, row);

  const unreadRows = await db
    .select({
      conversationId: conversationMessageTable.conversationId,
      unread: sql<number>`count(*)::int`,
    })
    .from(conversationReceiptTable)
    .innerJoin(conversationMessageTable, eq(conversationMessageTable.id, conversationReceiptTable.messageId))
    .where(
      and(
        eq(conversationReceiptTable.userId, coachId),
        isNull(conversationReceiptTable.readAt),
        ne(conversationMessageTable.senderId, coachId),
        inArray(conversationMessageTable.conversationId, conversationIds),
      ),
    )
    .groupBy(conversationMessageTable.conversationId);
  const unreadByConversation = new Map<number, number>(unreadRows.map((row) => [row.conversationId, Number(row.unread)]));

  const userIds = Array.from(new Set(entries.map((entry) => entry.userId)));
  const users = userIds.length ? await db.select().from(userTable).where(inArray(userTable.id, userIds)) : [];
  const usersById = new Map(users.map((user) => [user.id, user]));
  const tierRows = await db
    .select({ userId: athleteTable.userId, programTier: sql<string | null>`${athleteTable.currentProgramTier}::text` })
    .from(athleteTable)
    .where(inArray(athleteTable.userId, userIds));
  const tierByUserId = new Map(tierRows.map((row) => [row.userId, row.programTier]));

  const mapped = entries.map((entry) => {
    const user = usersById.get(entry.userId);
    const latest = latestByConversation.get(entry.conversationId);
    const programTier = tierByUserId.get(entry.userId) ?? null;
    return {
      userId: entry.userId,
      name: publicDisplayName({ id: entry.userId, name: user?.name ?? null, email: user?.email ?? null }),
      preview: latest?.content ?? "Start the conversation",
      time: latest?.createdAt ?? entry.updatedAt,
      unread: unreadByConversation.get(entry.conversationId) ?? 0,
      programTier,
      premium: programTier === "PHP_Premium",
    };
  });

  const filtered = q
    ? mapped.filter((item) =>
        [item.name, item.preview, item.programTier, item.userId]
          .map((value) => String(value ?? "").toLowerCase())
          .some((value) => value.includes(q)),
      )
    : mapped;
  return filtered.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, limit);
}

export async function listConversationMessagesAdmin(coachId: number, userId: number, options?: { limit?: number }) {
  const limit = safeLimit(options?.limit, 200);
  const adminIds = await getAdminCoachIds();
  if (!adminIds.includes(coachId)) return [];

  const [callerUser] = await db.select({ role: userTable.role }).from(userTable).where(eq(userTable.id, coachId)).limit(1);
  const sharedViewer = await isSharedInboxViewer(coachId, callerUser?.role ?? null);
  const visibleAdminIds = sharedViewer ? adminIds : [coachId];

  const conversationIdRows = await db
    .select({ conversationId: conversationParticipantTable.conversationId })
    .from(conversationParticipantTable)
    .where(eq(conversationParticipantTable.userId, userId));
  const userConversationIds = conversationIdRows.map((row) => row.conversationId);
  if (!userConversationIds.length) return [];

  const visibleRows = await db
    .select({ conversationId: conversationParticipantTable.conversationId })
    .from(conversationParticipantTable)
    .where(
      and(
        inArray(conversationParticipantTable.conversationId, userConversationIds),
        inArray(conversationParticipantTable.userId, visibleAdminIds),
      ),
    );
  const conversationIds = visibleRows.map((row) => row.conversationId);
  if (!conversationIds.length) return [];

  const rows = await db
    .select()
    .from(conversationMessageTable)
    .where(inArray(conversationMessageTable.conversationId, conversationIds))
    .orderBy(conversationMessageTable.createdAt)
    .limit(limit);

  const participants = await db
    .select({
      conversationId: conversationParticipantTable.conversationId,
      userId: conversationParticipantTable.userId,
    })
    .from(conversationParticipantTable)
    .where(inArray(conversationParticipantTable.conversationId, conversationIds));
  const otherByConversationAndSender = new Map<string, number>();
  for (const row of participants) {
    for (const other of participants.filter((p) => p.conversationId === row.conversationId && p.userId !== row.userId)) {
      otherByConversationAndSender.set(`${row.conversationId}:${row.userId}`, other.userId);
    }
  }

  const shaped = rows.map((row) => ({
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    receiverId: otherByConversationAndSender.get(`${row.conversationId}:${row.senderId}`) ?? userId,
    content: row.content,
    contentType: resolveMessageMediaType({ contentType: row.contentType, mediaUrl: row.mediaUrl }),
    mediaUrl: row.mediaUrl,
    videoUploadId: row.videoUploadId,
    pinnedAt: row.pinnedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  return attachConversationReactions(shaped);
}

export async function markConversationReadAdmin(coachId: number, userId: number) {
  const adminIds = await getAdminCoachIds();
  if (!adminIds.includes(coachId)) return 0;
  return markConversationReadForPair(coachId, userId);
}

export async function deleteConversationThreadAdmin(coachId: number, userId: number) {
  const adminIds = await getAdminCoachIds();
  if (!adminIds.includes(coachId)) return 0;
  const [callerUser] = await db.select({ role: userTable.role }).from(userTable).where(eq(userTable.id, coachId)).limit(1);
  const sharedViewer = await isSharedInboxViewer(coachId, callerUser?.role ?? null);
  const visibleAdminIds = sharedViewer ? adminIds : [coachId];

  const conversationIdRows = await db
    .select({ conversationId: conversationParticipantTable.conversationId })
    .from(conversationParticipantTable)
    .where(eq(conversationParticipantTable.userId, userId));
  const userConversationIds = conversationIdRows.map((row) => row.conversationId);
  if (!userConversationIds.length) return 0;

  const visibleRows = await db
    .select({ conversationId: conversationParticipantTable.conversationId })
    .from(conversationParticipantTable)
    .where(
      and(
        inArray(conversationParticipantTable.conversationId, userConversationIds),
        inArray(conversationParticipantTable.userId, visibleAdminIds),
      ),
    );
  const conversationIds = visibleRows.map((row) => row.conversationId);
  if (!conversationIds.length) return 0;

  const result = await db
    .delete(conversationMessageTable)
    .where(inArray(conversationMessageTable.conversationId, conversationIds));
  return result.rowCount ?? 0;
}

export async function sendConversationMessageAdmin(input: {
  coachId: number;
  userId: number;
  content: string;
  contentType?: "text" | "image" | "video";
  mediaUrl?: string;
  videoUploadId?: number;
  replyToMessageId?: number;
  replyPreview?: string;
}) {
  return sendDirectMessage({
    senderId: input.coachId,
    receiverId: input.userId,
    content: input.content,
    contentType: input.contentType ?? "text",
    mediaUrl: input.mediaUrl,
    videoUploadId: input.videoUploadId,
    replyToMessageId: input.replyToMessageId,
    replyPreview: input.replyPreview,
  });
}
