import { and, desc, eq, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";

import { db } from "../db";
import {
  athleteTable,
  messageReactionTable,
  messageReceiptTable,
  messageTable,
  teamTable,
  userTable,
} from "../db/schema";
import { env } from "../config/env";
import { getSocketServer } from "../socket-hub";
import { attachDirectMessageReactions } from "./reaction.service";
import { ROLES_TRAINING_STAFF } from "../lib/user-roles";
import { withTransientDbRetryConfigured } from "../lib/db-connectivity";
import { sendPushNotification } from "./push.service";
import { resolveMessageMediaType } from "../lib/media-message-type";

const AI_COACH_EMAIL = "ai-coach@football-performance.ai";

/** Cap DM history per request — unbounded scans caused multi-second GET /api/messages. */
const DIRECT_THREAD_MESSAGE_LIMIT = 500;

export async function getCoachUser() {
  return withTransientDbRetryConfigured(
    "getCoachUser",
    async () => {
      const users = await db
        .select()
        .from(userTable)
        .where(
          and(
            inArray(userTable.role, ROLES_TRAINING_STAFF),
            eq(userTable.isDeleted, false),
            eq(userTable.isBlocked, false),
            ne(userTable.email, AI_COACH_EMAIL),
          ),
        )
        .orderBy(
          desc(sql`length(trim(coalesce(${userTable.profilePicture}, ''))) > 0`),
          desc(sql`lower(trim(coalesce(${userTable.name}, ''))) not in ('admin', 'administrator')`),
          desc(userTable.updatedAt),
        )
        .limit(1);
      return users[0] ?? null;
    },
    { maxAttempts: 2 },
  );
}

export async function getCoachUserById(userId: number) {
  return withTransientDbRetryConfigured(
    "getCoachUserById",
    async () => {
      const users = await db
        .select()
        .from(userTable)
        .where(and(eq(userTable.id, userId), eq(userTable.isDeleted, false), eq(userTable.isBlocked, false)))
        .limit(1);
      return users[0] ?? null;
    },
    { maxAttempts: 2 },
  );
}

export async function getAdminCoachIds() {
  return withTransientDbRetryConfigured(
    "getAdminCoachIds",
    async () => {
      const admins = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(
          and(
            inArray(userTable.role, ROLES_TRAINING_STAFF),
            eq(userTable.isDeleted, false),
            eq(userTable.isBlocked, false),
          ),
        );
      return admins.map((row) => row.id);
    },
    { maxAttempts: 2 },
  );
}

export async function getTeamManagerForUser(userId: number) {
  const rows = await withTransientDbRetryConfigured(
    "getTeamManagerForUser:athleteTeam",
    () =>
      db
        .select({ managerId: teamTable.adminId })
        .from(athleteTable)
        .innerJoin(teamTable, eq(athleteTable.teamId, teamTable.id))
        .where(eq(athleteTable.userId, userId))
        .limit(1),
    { maxAttempts: 2 },
  );

  if (rows[0]?.managerId) {
    return getCoachUserById(rows[0].managerId);
  }

  // also check guardian's active athlete
  const { guardianTable } = await import("../db/schema");
  const guardianRows = await withTransientDbRetryConfigured(
    "getTeamManagerForUser:guardianTeam",
    () =>
      db
        .select({ managerId: teamTable.adminId })
        .from(guardianTable)
        .innerJoin(athleteTable, eq(guardianTable.id, athleteTable.guardianId))
        .innerJoin(teamTable, eq(athleteTable.teamId, teamTable.id))
        .where(eq(guardianTable.userId, userId))
        .limit(1),
    { maxAttempts: 2 },
  );

  if (guardianRows[0]?.managerId) {
    return getCoachUserById(guardianRows[0].managerId);
  }

  return null;
}

export async function getLastAdminContact(userId: number) {
  const adminIds = await getAdminCoachIds();
  // Exclude AI Coach from "last admin contact" — it has its own thread
  const aiCoachRows = await withTransientDbRetryConfigured(
    "getLastAdminContact:aiCoachLookup",
    () => db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, AI_COACH_EMAIL)).limit(1),
    { maxAttempts: 2 },
  );
  const aiCoachId = aiCoachRows[0]?.id;
  const humanAdminIds = aiCoachId ? adminIds.filter((id) => id !== aiCoachId) : adminIds;
  if (!humanAdminIds.length) return null;
  const messages = await withTransientDbRetryConfigured(
    "getLastAdminContact:lastMessage",
    () =>
      db
        .select()
        .from(messageTable)
        .where(
          or(
            and(eq(messageTable.senderId, userId), inArray(messageTable.receiverId, humanAdminIds)),
            and(inArray(messageTable.senderId, humanAdminIds), eq(messageTable.receiverId, userId)),
          ),
        )
        .orderBy(desc(messageTable.createdAt))
        .limit(1),
    { maxAttempts: 2 },
  );
  const last = messages[0];
  if (!last) return null;
  const otherId = last.senderId === userId ? last.receiverId : last.senderId;
  return getCoachUserById(otherId);
}

export async function listThread(
  userId: number,
  options?: {
    includeVideoResponses?: boolean;
    limit?: number;
    cursorId?: number;
    peerUserId?: number;
  },
) {
  const [adminIdList, manager] = await Promise.all([getAdminCoachIds(), getTeamManagerForUser(userId)]);
  const adminIds = [...adminIdList];
  const senderIsStaff = adminIds.includes(userId);
  if (manager) {
    adminIds.push(manager.id);
  }

  const targetPeerId =
    typeof options?.peerUserId === "number" && Number.isFinite(options.peerUserId)
      ? Math.floor(options.peerUserId)
      : null;
  const cursorId =
    typeof options?.cursorId === "number" && Number.isFinite(options.cursorId) ? Math.floor(options.cursorId) : null;
  const pageLimit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(200, Math.floor(options.limit)))
      : DIRECT_THREAD_MESSAGE_LIMIT;

  const includeVideoResponses = options?.includeVideoResponses === true;
  const allowedPeerIds = senderIsStaff
    ? targetPeerId != null
      ? targetPeerId === userId
        ? []
        : [targetPeerId]
      : null
    : targetPeerId != null
      ? adminIds.includes(targetPeerId)
        ? [targetPeerId]
        : []
      : adminIds;
  if (!senderIsStaff && (!allowedPeerIds || allowedPeerIds.length === 0)) {
    return { messages: [], hasMore: false, nextCursor: null, teamManager: manager };
  }
  if (senderIsStaff && Array.isArray(allowedPeerIds) && allowedPeerIds.length === 0) {
    return { messages: [], hasMore: false, nextCursor: null, teamManager: manager };
  }

  const rows = await db
    .select()
    .from(messageTable)
    .where(
      and(
        senderIsStaff
          ? or(
              eq(messageTable.senderId, userId),
              eq(messageTable.receiverId, userId),
            )
          : or(
              and(eq(messageTable.senderId, userId), inArray(messageTable.receiverId, [...(allowedPeerIds ?? []), -1])),
              and(inArray(messageTable.senderId, [...(allowedPeerIds ?? []), -1]), eq(messageTable.receiverId, userId)),
            ),
        senderIsStaff && Array.isArray(allowedPeerIds)
          ? or(
              and(eq(messageTable.senderId, userId), inArray(messageTable.receiverId, allowedPeerIds)),
              and(inArray(messageTable.senderId, allowedPeerIds), eq(messageTable.receiverId, userId)),
            )
          : undefined,
        includeVideoResponses
          ? undefined
          : or(ne(messageTable.contentType, "video"), isNull(messageTable.videoUploadId)),
        cursorId ? lt(messageTable.id, cursorId) : undefined,
      ),
    )
    .orderBy(desc(messageTable.id))
    .limit(pageLimit + 1);

  const hasMore = rows.length > pageLimit;
  const pageRows = hasMore ? rows.slice(0, pageLimit) : rows;
  const chronologicalRows = [...pageRows].reverse();
  const withReactions = await attachDirectMessageReactions(chronologicalRows);
  const messageIds = withReactions.map((message) => Number(message.id)).filter((id) => Number.isFinite(id) && id > 0);

  const receiptStatsByMessage = new Map<number, { deliveredCount: number; readCount: number }>();
  const myReadAtByMessage = new Map<number, Date | null>();

  if (messageIds.length) {
    const receiptStats = await db
      .select({
        messageId: messageReceiptTable.messageId,
        deliveredCount: sql<number>`count(*)::int`,
        readCount: sql<number>`count(*) filter (where ${messageReceiptTable.readAt} is not null)::int`,
      })
      .from(messageReceiptTable)
      .where(inArray(messageReceiptTable.messageId, messageIds))
      .groupBy(messageReceiptTable.messageId);

    for (const row of receiptStats) {
      const messageId = Number(row.messageId);
      if (!Number.isFinite(messageId)) continue;
      receiptStatsByMessage.set(messageId, {
        deliveredCount: Number(row.deliveredCount) || 0,
        readCount: Number(row.readCount) || 0,
      });
    }

    const myReceipts = await db
      .select({
        messageId: messageReceiptTable.messageId,
        readAt: messageReceiptTable.readAt,
      })
      .from(messageReceiptTable)
      .where(and(eq(messageReceiptTable.userId, userId), inArray(messageReceiptTable.messageId, messageIds)));

    for (const row of myReceipts) {
      const messageId = Number(row.messageId);
      if (!Number.isFinite(messageId)) continue;
      myReadAtByMessage.set(messageId, row.readAt ?? null);
    }
  }

  const messages = withReactions.map((message) => ({
    ...message,
    contentType: resolveMessageMediaType({
      contentType: message.contentType,
      mediaUrl: message.mediaUrl,
    }),
    deliveredCount: receiptStatsByMessage.get(Number(message.id))?.deliveredCount ?? 0,
    readCount: receiptStatsByMessage.get(Number(message.id))?.readCount ?? 0,
    myReadAt: myReadAtByMessage.get(Number(message.id)) ?? null,
  }));
  const nextCursor = hasMore && pageRows.length > 0 ? Number(pageRows[pageRows.length - 1]?.id ?? NaN) : null;

  return {
    messages,
    hasMore,
    nextCursor: Number.isFinite(nextCursor) ? nextCursor : null,
    /** Included so /api/messages can build coach metadata without a second getTeamManagerForUser call. */
    teamManager: manager,
  };
}

export async function sendMessage(input: {
  senderId: number;
  receiverId: number;
  content: string;
  contentType: "text" | "image" | "video";
  mediaUrl?: string | null;
  videoUploadId?: number | null;
  replyToMessageId?: number | null;
  replyPreview?: string | null;
  clientId?: string | null;
  /** When true, athletes without messaging-enabled tiers can still message a human coach (e.g. app feedback). */
  bypassMessagingTierForCoach?: boolean;
}) {
  const safeBaseContent = input.content.trim() || "Attachment";
  const safeReplyPreview = encodeURIComponent((input.replyPreview ?? "").trim().slice(0, 160));
  const replyPrefix =
    input.replyToMessageId && Number.isFinite(input.replyToMessageId)
      ? `[reply:${input.replyToMessageId}:${safeReplyPreview}] `
      : "";
  const safeContent = `${replyPrefix}${safeBaseContent}`;

  // Detect if message is to AI Coach (virtual ID: -1 or real AI coach user ID)
  let resolvedReceiverId = input.receiverId;
  let aiCoachId: number | null = null;

  if (input.receiverId === -1) {
    // Legacy virtual ID path
    const { ensureAiCoachUser } = await import("./ai.service");
    aiCoachId = await ensureAiCoachUser();
    resolvedReceiverId = aiCoachId;
  } else {
    // Check if the receiver is the AI coach user by email
    const aiCoachEmail = "ai-coach@football-performance.ai";
    const [aiUser] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, aiCoachEmail))
      .limit(1);
    if (aiUser && aiUser.id === input.receiverId) {
      aiCoachId = aiUser.id;
    }
  }

  const adminIds = await getAdminCoachIds();
  const senderIsStaff = adminIds.includes(input.senderId);
  if (!senderIsStaff) {
    if (aiCoachId !== null && resolvedReceiverId === aiCoachId) {
      if (!(await isUserPremium(input.senderId))) {
        throw new Error("AI_COACH_REQUIRES_PREMIUM");
      }
    } else if (adminIds.includes(resolvedReceiverId)) {
      if (!input.bypassMessagingTierForCoach) {
        // Team manager is `team_coach` (in adminIds) but athletes must always be able to DM them.
        const myTeamManager = await getTeamManagerForUser(input.senderId);
        const isMessagingMyTeamManager =
          myTeamManager && myTeamManager.id === resolvedReceiverId;
        if (!isMessagingMyTeamManager) {
          const { getAthleteForUser } = await import("./user.service");
          const { getMessagingAccessTiers } = await import("./messaging-policy.service");
          const athlete = await getAthleteForUser(input.senderId);
          const tier = athlete?.currentProgramTier ?? null;
          const allowed = await getMessagingAccessTiers();
          if (!tier || !(allowed as readonly string[]).includes(tier)) {
            throw new Error("MESSAGING_DISABLED_FOR_TIER");
          }
        }
      }
    }
  }

  let insertedNewMessage = true;
  let message:
    | {
        id: number;
        senderId: number;
        receiverId: number;
        content: string;
        contentType: "text" | "image" | "video";
        mediaUrl: string | null;
        clientMessageId: string | null;
        videoUploadId: number | null;
        read: boolean;
        createdAt: Date;
        updatedAt: Date;
      }
    | undefined;

  if (input.clientId) {
    const result = await db
      .insert(messageTable)
      .values({
        senderId: input.senderId,
        receiverId: resolvedReceiverId,
        content: safeContent,
        contentType: input.contentType,
        mediaUrl: input.mediaUrl ?? null,
        clientMessageId: input.clientId,
        videoUploadId: input.videoUploadId ?? null,
      })
      .onConflictDoNothing({
        target: [messageTable.senderId, messageTable.receiverId, messageTable.clientMessageId],
      })
      .returning();
    message = result[0];
    if (!message) {
      insertedNewMessage = false;
      const existing = await db
        .select()
        .from(messageTable)
        .where(
          and(
            eq(messageTable.senderId, input.senderId),
            eq(messageTable.receiverId, resolvedReceiverId),
            eq(messageTable.clientMessageId, input.clientId),
          ),
        )
        .limit(1);
      message = existing[0];
    }
  } else {
    const result = await db
      .insert(messageTable)
      .values({
        senderId: input.senderId,
        receiverId: resolvedReceiverId,
        content: safeContent,
        contentType: input.contentType,
        mediaUrl: input.mediaUrl ?? null,
        clientMessageId: null,
        videoUploadId: input.videoUploadId ?? null,
      })
      .returning();
    message = result[0];
  }

  if (!message) {
    throw new Error("Failed to persist direct message");
  }

  let participantIdsForDelivery: number[] = [];
  if (insertedNewMessage) {
    participantIdsForDelivery = Array.from(
      new Set([input.senderId, resolvedReceiverId].filter((id) => Number.isFinite(id) && id > 0)),
    );
    if (participantIdsForDelivery.length) {
      await db
        .insert(messageReceiptTable)
        .values(
          participantIdsForDelivery.map((participantId) => ({
            messageId: message.id,
            userId: participantId,
            deliveredAt: message.createdAt,
            readAt: participantId === input.senderId ? message.createdAt : null,
          })),
        )
        .onConflictDoNothing({
          target: [messageReceiptTable.messageId, messageReceiptTable.userId],
        });
    }
  }

  // If message is to AI Coach, generate and send AI response
  if (aiCoachId !== null && insertedNewMessage) {
    const { generateAiCoachResponse } = await import("./ai.service");

    // Fetch recent history for context (last 5 messages)
    const historyRows = await db
      .select({
        role: sql<string>`case when ${messageTable.senderId} = ${input.senderId} then 'user' else 'assistant' end`.as(
          "role",
        ),
        content: messageTable.content,
      })
      .from(messageTable)
      .where(
        or(
          and(eq(messageTable.senderId, input.senderId), eq(messageTable.receiverId, aiCoachId)),
          and(eq(messageTable.senderId, aiCoachId), eq(messageTable.receiverId, input.senderId)),
        ),
      )
      .orderBy(desc(messageTable.createdAt))
      .limit(5);

    const history = historyRows.reverse().map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    }));

    const aiResponse = await generateAiCoachResponse(input.content, history);

    // Save AI response to DB
    const aiResult = await db
      .insert(messageTable)
      .values({
        senderId: aiCoachId,
        receiverId: input.senderId,
        content: aiResponse,
        contentType: "text",
      })
      .returning();

    const aiMessage = aiResult[0];

    // Emit AI response via socket
    const io = getSocketServer();
    if (io) {
      io.to(`user:${input.senderId}`).emit("message:new", aiMessage);
    }
  }

  // Send push notification to receiver (skip for AI coach)
  if (aiCoachId === null && insertedNewMessage) {
    let senderMeta: { name: string | null; profilePicture: string | null } | null = null;
    try {
      const sender = await db
        .select({ name: userTable.name, profilePicture: userTable.profilePicture })
        .from(userTable)
        .where(eq(userTable.id, input.senderId))
        .limit(1);
      senderMeta = sender[0]
        ? { name: sender[0].name ?? null, profilePicture: sender[0].profilePicture ?? null }
        : null;

      const title = `New message from ${senderMeta?.name ?? "Coach"}`;
      const body = input.contentType === "text" ? input.content : `Sent a ${input.contentType}`;

      await sendPushNotification(resolvedReceiverId, title, body, {
        type: "message",
        threadId: String(input.senderId),
        url: `/messages/${String(input.senderId)}`,
        mediaUrl: input.mediaUrl ?? null,
      });
    } catch (error) {
      console.error("[Push] Failed to send message push notification:", error);
    }

    const io = getSocketServer();
    if (io) {
      const enriched = {
        ...(input.clientId ? { ...message, clientId: input.clientId } : message),
        contentType: resolveMessageMediaType({
          contentType: message.contentType,
          mediaUrl: message.mediaUrl,
        }),
        senderName: senderMeta?.name ?? null,
        senderProfilePicture: senderMeta?.profilePicture ?? null,
        deliveredCount: participantIdsForDelivery.length || 0,
        readCount: participantIdsForDelivery.length ? 1 : 0,
        myReadAt: message.createdAt,
      };
      console.log(
        `[Socket] Emitting message:new for ID ${message.id} to rooms: user:${input.senderId}, user:${resolvedReceiverId}, admin:all`,
      );
      io.to(`user:${input.senderId}`).emit("message:new", enriched);
      io.to(`user:${resolvedReceiverId}`).emit("message:new", enriched);
      io.to("admin:all").emit("message:new", enriched);
      return message;
    }
  }

  const io = getSocketServer();
  if (!io) {
    console.warn("[Socket] Failed to emit message:new - IO server NOT initialized");
    return message;
  }
  if (aiCoachId !== null && insertedNewMessage) {
    // Only emit user's message back to user for AI coach thread
    const enriched = {
      ...(input.clientId ? { ...message, clientId: input.clientId } : message),
      contentType: resolveMessageMediaType({
        contentType: message.contentType,
        mediaUrl: message.mediaUrl,
      }),
      deliveredCount: participantIdsForDelivery.length || 0,
      readCount: participantIdsForDelivery.length ? 1 : 0,
      myReadAt: message.createdAt,
    };
    io.to(`user:${input.senderId}`).emit("message:new", enriched);
  }
  return {
    ...message,
    contentType: resolveMessageMediaType({
      contentType: message.contentType,
      mediaUrl: message.mediaUrl,
    }),
    deliveredCount: participantIdsForDelivery.length || 0,
    readCount: participantIdsForDelivery.length ? 1 : 0,
    myReadAt: message.createdAt,
  };
}

export async function markThreadRead(userId: number, peerUserId?: number) {
  const adminIds = await getAdminCoachIds();
  if (!adminIds.length) return 0;

  // When peerUserId is provided (e.g. from notification action), scope to that
  // thread only instead of marking every DM as read.
  const senderFilter =
    peerUserId && adminIds.includes(peerUserId)
      ? [peerUserId]
      : adminIds;

  const readAt = new Date();
  await db
    .update(messageReceiptTable)
    .set({ readAt })
    .where(
      and(
        eq(messageReceiptTable.userId, userId),
        inArray(
          messageReceiptTable.messageId,
          db
            .select({ id: messageTable.id })
            .from(messageTable)
            .where(and(eq(messageTable.receiverId, userId), inArray(messageTable.senderId, senderFilter))),
        ),
        or(sql`${messageReceiptTable.readAt} is null`, sql`${messageReceiptTable.readAt} < ${readAt}`),
      ),
    );
  const result = await db
    .update(messageTable)
    .set({ read: true })
    .where(and(eq(messageTable.receiverId, userId), inArray(messageTable.senderId, senderFilter)));
  const updated = result.rowCount ?? 0;
  if (updated > 0) {
    const io = getSocketServer();
    if (io) {
      const payload = {
        scope: "direct" as const,
        readerUserId: userId,
        peerUserIds: senderFilter,
        readAt: readAt.toISOString(),
        updated,
      };
      io.to(`user:${userId}`).emit("message:read", payload);
      for (const peerId of senderFilter) {
        io.to(`user:${peerId}`).emit("message:read", payload);
      }
      io.to("admin:all").emit("message:read", payload);
    }
  }
  return updated;
}

export async function deleteDirectMessage(input: { messageId: number; userId: number }) {
  const rows = await db.select().from(messageTable).where(eq(messageTable.id, input.messageId)).limit(1);
  const message = rows[0];
  if (!message) {
    throw new Error("Message not found");
  }
  if (message.senderId !== input.userId) {
    throw new Error("Forbidden");
  }
  await db.delete(messageReactionTable).where(eq(messageReactionTable.messageId, input.messageId));
  await db.delete(messageReceiptTable).where(eq(messageReceiptTable.messageId, input.messageId));
  await db.delete(messageTable).where(eq(messageTable.id, input.messageId));
  const io = getSocketServer();
  if (io) {
    io.to(`user:${message.senderId}`).emit("message:deleted", { messageId: input.messageId });
    io.to(`user:${message.receiverId}`).emit("message:deleted", { messageId: input.messageId });
    io.to("admin:all").emit("message:deleted", { messageId: input.messageId });
  }
  return { deleted: true };
}

export async function isUserPremium(userId: number): Promise<boolean> {
  const { getAthleteForUser } = await import("./user.service");
  const athlete = await getAthleteForUser(userId);
  return athlete?.currentProgramTier === "PHP_Premium";
}
