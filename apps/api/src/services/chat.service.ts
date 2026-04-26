import { and, asc, desc, eq, ilike, inArray, lt, ne, or, sql } from "drizzle-orm";
import { sendPushNotification } from "./push.service";

import { db } from "../db";
import { publicDisplayName } from "../lib/display-name";
import {
  chatGroupMemberTable,
  chatGroupMessageReactionTable,
  chatGroupMessageReceiptTable,
  chatGroupMessageTable,
  chatGroupTable,
  messageTable,
  teamTable,
  userTable,
} from "../db/schema";
import { getSocketServer } from "../socket-hub";
import { attachGroupMessageReactions } from "./reaction.service";
import { resolveMessageMediaType } from "../lib/media-message-type";
import { withTransientDbRetryConfigured } from "../lib/db-connectivity";

let cachedSupportsGroupLastReadAt: boolean | null = null;

function errorMentionsMissingColumn(error: unknown, columnName: string) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return message.toLowerCase().includes(`column`) && message.includes(columnName);
}

function toUserKey(userId: number | null | undefined) {
  const normalized = Number(userId ?? Number.NaN);
  return Number.isFinite(normalized) && normalized > 0 ? `user:${normalized}` : "user:unknown";
}

function toMessageKey(groupId: number | null | undefined, messageId: number | null | undefined) {
  const normalizedGroupId = Number(groupId ?? Number.NaN);
  const normalizedMessageId = Number(messageId ?? Number.NaN);
  if (!Number.isFinite(normalizedGroupId) || !Number.isFinite(normalizedMessageId)) {
    return "group:unknown:message:unknown";
  }
  return `group:${normalizedGroupId}:message:${normalizedMessageId}`;
}

function resolveDisplayName(params: { name?: string | null; email?: string | null; senderId?: number | null }) {
  const senderId = Number(params.senderId ?? Number.NaN);
  if (Number.isFinite(senderId) && senderId > 0) {
    return publicDisplayName({
      id: senderId,
      name: params.name ?? null,
      email: params.email ?? null,
    });
  }
  const trimmedName = String(params.name ?? "").trim();
  if (trimmedName) return trimmedName;
  const trimmedEmail = String(params.email ?? "").trim();
  if (trimmedEmail) return trimmedEmail;
  return "Unknown";
}

export async function createDirectMessage(input: {
  senderId: number;
  receiverId: number;
  content: string;
  contentType?: "text" | "image" | "video";
  mediaUrl?: string | null;
}) {
  const safeContent = input.content.trim() || "Attachment";
  const result = await db
    .insert(messageTable)
    .values({
      senderId: input.senderId,
      receiverId: input.receiverId,
      content: safeContent,
      contentType: input.contentType ?? "text",
      mediaUrl: input.mediaUrl ?? null,
    })
    .returning();

  const message = result[0];

  try {
    const sender = await db
      .select({ name: userTable.name, email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, input.senderId))
      .limit(1);
    const senderName = resolveDisplayName({
      name: sender[0]?.name,
      email: sender[0]?.email,
      senderId: input.senderId,
    });
    const title = `New message from ${senderName}`;
    const body =
      (input.contentType ?? "text") === "text"
        ? safeContent
        : `Sent a ${input.contentType ?? "message"}`;

    await sendPushNotification(input.receiverId, title, body, {
      type: "message",
      threadId: String(input.senderId),
      url: `/messages/${String(input.senderId)}`,
      mediaUrl: input.mediaUrl ?? null,
    });
  } catch (error) {
    console.error("[Push] Failed to send direct chat push notification:", error);
  }

  return message;
}

export async function createGroup(input: {
  name: string;
  category?: "announcement" | "coach_group" | "team";
  createdBy: number;
  memberIds: number[];
}) {
  const group = await db
    .insert(chatGroupTable)
    .values({
      name: input.name,
      category: input.category ?? "coach_group",
      createdBy: input.createdBy,
    })
    .returning();

  const groupId = group[0].id;
  const memberIds = Array.from(new Set([input.createdBy, ...input.memberIds]));
  if (memberIds.length) {
    await db.insert(chatGroupMemberTable).values(
      memberIds.map((userId) => ({
        groupId,
        userId,
      })),
    );
  }
  return group[0];
}

export async function addGroupMembers(groupId: number, memberIds: number[]) {
  const unique = Array.from(new Set(memberIds));
  if (!unique.length) return [];
  await db
    .insert(chatGroupMemberTable)
    .values(
      unique.map((userId) => ({
        groupId,
        userId,
      })),
    )
    .onConflictDoNothing();
  return unique;
}

async function ensureManagedTeamInboxMemberships(userId: number) {
  const [user] = await db
    .select({ role: userTable.role })
    .from(userTable)
    .where(and(eq(userTable.id, userId), eq(userTable.isDeleted, false)))
    .limit(1);

  const role = String(user?.role ?? "");
  const isTeamManagerRole =
    role === "team_coach" || role === "coach" || role === "program_coach";
  if (!isTeamManagerRole) return;

  const managedTeams = await db
    .select({ name: teamTable.name })
    .from(teamTable)
    .where(eq(teamTable.adminId, userId));

  const managedTeamNames = Array.from(
    new Set(
      managedTeams
        .map((team) => String(team.name ?? "").trim())
        .filter(Boolean),
    ),
  );
  if (!managedTeamNames.length) return;

  const managedTeamGroups = await db
    .select({ id: chatGroupTable.id })
    .from(chatGroupTable)
    .where(
      and(
        eq(chatGroupTable.category, "team"),
        inArray(chatGroupTable.name, managedTeamNames),
      ),
    );

  const values = managedTeamGroups
    .map((group) => Number(group.id))
    .filter((groupId) => Number.isFinite(groupId) && groupId > 0)
    .map((groupId) => ({ groupId, userId }));
  if (!values.length) return;

  await db
    .insert(chatGroupMemberTable)
    .values(values)
    .onConflictDoNothing({
      target: [chatGroupMemberTable.groupId, chatGroupMemberTable.userId],
    });
}

export async function listGroupsForUser(userId: number, options?: { q?: string; limit?: number }) {
  const q = options?.q?.trim() ?? "";
  const requestedLimit = options?.limit;
  const limit =
    typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
      : 50;

  // Backfill legacy data: older team groups may miss chat_group_members rows for team managers.
  // Without this, `/api/chat/groups` omits the team inbox even though the manager owns the team.
  await withTransientDbRetryConfigured(
    "listGroupsForUser:ensureManagedMemberships",
    () => ensureManagedTeamInboxMemberships(userId),
    { maxAttempts: 2 },
  );

  const readGroups = async (useLastReadAtColumn: boolean) => {
    if (!useLastReadAtColumn) {
      return db
        .select({
          id: chatGroupTable.id,
          name: chatGroupTable.name,
          category: chatGroupTable.category,
          createdBy: chatGroupTable.createdBy,
          createdAt: chatGroupTable.createdAt,
          memberCreatedAt: chatGroupMemberTable.createdAt,
          memberLastReadAt: sql<Date | null>`null`,
        })
        .from(chatGroupMemberTable)
        .innerJoin(chatGroupTable, eq(chatGroupMemberTable.groupId, chatGroupTable.id))
        .where(and(eq(chatGroupMemberTable.userId, userId), q ? ilike(chatGroupTable.name, `%${q}%`) : undefined))
        .orderBy(desc(chatGroupTable.createdAt))
        .limit(limit);
    }

    return db
      .select({
        id: chatGroupTable.id,
        name: chatGroupTable.name,
        category: chatGroupTable.category,
        createdBy: chatGroupTable.createdBy,
        createdAt: chatGroupTable.createdAt,
        memberCreatedAt: chatGroupMemberTable.createdAt,
        memberLastReadAt: chatGroupMemberTable.lastReadAt,
      })
      .from(chatGroupMemberTable)
      .innerJoin(chatGroupTable, eq(chatGroupMemberTable.groupId, chatGroupTable.id))
      .where(and(eq(chatGroupMemberTable.userId, userId), q ? ilike(chatGroupTable.name, `%${q}%`) : undefined))
      .orderBy(desc(chatGroupTable.createdAt))
      .limit(limit);
  };

  let groups: Array<{
    id: number;
    name: string | null;
    category: string | null;
    createdBy: number;
    createdAt: Date;
    memberCreatedAt: Date;
    memberLastReadAt: Date | null;
  }>;

  const shouldUseLastReadAtColumn = () => cachedSupportsGroupLastReadAt !== false;

  try {
    groups = await withTransientDbRetryConfigured(
      "listGroupsForUser:readGroups",
      () => readGroups(shouldUseLastReadAtColumn()),
      { maxAttempts: 2 },
    );
    cachedSupportsGroupLastReadAt = shouldUseLastReadAtColumn() ? true : cachedSupportsGroupLastReadAt;
  } catch (error) {
    if (shouldUseLastReadAtColumn() && errorMentionsMissingColumn(error, "lastReadAt")) {
      cachedSupportsGroupLastReadAt = false;
      groups = await withTransientDbRetryConfigured("listGroupsForUser:readGroupsFallback", () => readGroups(false), {
        maxAttempts: 2,
      });
    } else {
      throw error;
    }
  }

  const groupIds = groups.map((group) => Number(group.id)).filter((id) => Number.isFinite(id));
  if (!groupIds.length) {
    return groups.map((group) => ({
      ...group,
      unreadCount: 0,
      lastMessage: null as any,
    }));
  }

  const lastMessageRows = await withTransientDbRetryConfigured(
    "listGroupsForUser:lastMessages",
    () =>
      db
        .select({
          groupId: chatGroupMessageTable.groupId,
          id: chatGroupMessageTable.id,
          senderId: chatGroupMessageTable.senderId,
          content: chatGroupMessageTable.content,
          contentType: chatGroupMessageTable.contentType,
          mediaUrl: chatGroupMessageTable.mediaUrl,
          createdAt: chatGroupMessageTable.createdAt,
          senderName: userTable.name,
          senderEmail: userTable.email,
          senderProfilePicture: userTable.profilePicture,
        })
        .from(chatGroupMessageTable)
        .innerJoin(userTable, eq(chatGroupMessageTable.senderId, userTable.id))
        .where(inArray(chatGroupMessageTable.groupId, groupIds))
        .orderBy(asc(chatGroupMessageTable.groupId), desc(chatGroupMessageTable.createdAt)),
    { maxAttempts: 2 },
  );

  const lastMessageByGroup = new Map<number, (typeof lastMessageRows)[number]>();
  for (const row of lastMessageRows) {
    const id = Number(row.groupId);
    if (!Number.isFinite(id)) continue;
    if (!lastMessageByGroup.has(id)) {
      lastMessageByGroup.set(id, row);
    }
  }

  const unreadRows = await withTransientDbRetryConfigured(
    "listGroupsForUser:unreadCounts",
    () =>
      db
        .select({
          groupId: chatGroupMessageTable.groupId,
          unreadCount: sql<number>`count(*)::int`,
        })
        .from(chatGroupMessageTable)
        .innerJoin(
          chatGroupMemberTable,
          and(eq(chatGroupMemberTable.groupId, chatGroupMessageTable.groupId), eq(chatGroupMemberTable.userId, userId)),
        )
        .where(
          and(
            inArray(chatGroupMessageTable.groupId, groupIds),
            ne(chatGroupMessageTable.senderId, userId),
            cachedSupportsGroupLastReadAt === false
              ? sql`${chatGroupMessageTable.createdAt} > ${chatGroupMemberTable.createdAt}`
              : sql`${chatGroupMessageTable.createdAt} > coalesce(${chatGroupMemberTable.lastReadAt}, ${chatGroupMemberTable.createdAt})`,
          ),
        )
        .groupBy(chatGroupMessageTable.groupId),
    { maxAttempts: 2 },
  );

  const unreadByGroup = new Map<number, number>();
  for (const row of unreadRows) {
    const id = Number(row.groupId);
    if (!Number.isFinite(id)) continue;
    unreadByGroup.set(id, Number(row.unreadCount) || 0);
  }

  return groups.map((group) => {
    const id = Number(group.id);
    const last = Number.isFinite(id) ? (lastMessageByGroup.get(id) ?? null) : null;
    const unreadCount = Number.isFinite(id) ? (unreadByGroup.get(id) ?? 0) : 0;
    return {
      id: group.id,
      name: group.name,
      category: group.category,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      unreadCount,
      lastMessage: last
        ? {
            id: last.id,
            messageKey: toMessageKey(group.id, last.id),
            senderId: last.senderId,
            senderUserKey: toUserKey(last.senderId),
            senderName: resolveDisplayName({
              name: last.senderName,
              email: last.senderEmail,
              senderId: last.senderId,
            }),
            senderProfilePicture: last.senderProfilePicture,
            content: last.content,
            contentType: resolveMessageMediaType({
              contentType: last.contentType,
              mediaUrl: last.mediaUrl,
            }),
            mediaUrl: last.mediaUrl,
            createdAt: last.createdAt,
          }
        : null,
    };
  });
}

export async function markGroupRead(input: { groupId: number; userId: number; readAt?: Date }) {
  const readAt = input.readAt ?? new Date();
  await db
    .update(chatGroupMessageReceiptTable)
    .set({ readAt })
    .where(
      and(
        eq(chatGroupMessageReceiptTable.userId, input.userId),
        sql`exists (
          select 1
          from ${chatGroupMessageTable}
          where ${chatGroupMessageTable.id} = ${chatGroupMessageReceiptTable.messageId}
            and ${chatGroupMessageTable.groupId} = ${input.groupId}
            and ${chatGroupMessageTable.createdAt} <= ${readAt}
        )`,
        or(
          sql`${chatGroupMessageReceiptTable.readAt} is null`,
          sql`${chatGroupMessageReceiptTable.readAt} < ${readAt}`,
        ),
      ),
    );

  if (cachedSupportsGroupLastReadAt === false) return null;
  try {
    const result = await db
      .update(chatGroupMemberTable)
      .set({ lastReadAt: readAt })
      .where(and(eq(chatGroupMemberTable.groupId, input.groupId), eq(chatGroupMemberTable.userId, input.userId)))
      .returning();
    cachedSupportsGroupLastReadAt = true;
    const updatedMember = result[0] ?? null;
    if (updatedMember) {
      const io = getSocketServer();
      if (io) {
        const memberRows = await db
          .select({ userId: chatGroupMemberTable.userId })
          .from(chatGroupMemberTable)
          .where(eq(chatGroupMemberTable.groupId, input.groupId));
        const memberIds = Array.from(
          new Set(memberRows.map((row) => Number(row.userId)).filter((id) => Number.isFinite(id) && id > 0)),
        );
        const payload = {
          scope: "group" as const,
          groupId: input.groupId,
          readerUserId: input.userId,
          readAt: readAt.toISOString(),
        };
        io.to(`group:${input.groupId}`).emit("group:read", payload);
        for (const memberId of memberIds) {
          io.to(`user:${memberId}`).emit("group:read", payload);
        }
        io.to("admin:all").emit("group:read", payload);
      }
    }
    return updatedMember;
  } catch (error) {
    if (errorMentionsMissingColumn(error, "lastReadAt")) {
      cachedSupportsGroupLastReadAt = false;
      return null;
    }
    throw error;
  }
}

export async function listGroupMembers(groupId: number) {
  const members = await db
    .select({
      userId: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      profilePicture: userTable.profilePicture,
    })
    .from(chatGroupMemberTable)
    .innerJoin(userTable, eq(chatGroupMemberTable.userId, userTable.id))
    .where(eq(chatGroupMemberTable.groupId, groupId));

  return members.map((member) => {
    const displayName = resolveDisplayName({
      name: member.name,
      email: member.email,
      senderId: Number(member.userId),
    });
    return {
      ...member,
      name: displayName,
      userKey: toUserKey(member.userId),
      displayName,
    };
  });
}

export async function isGroupMember(groupId: number, userId: number) {
  const result = await db
    .select()
    .from(chatGroupMemberTable)
    .where(and(eq(chatGroupMemberTable.groupId, groupId), eq(chatGroupMemberTable.userId, userId)))
    .limit(1);
  return Boolean(result[0]);
}

export async function listGroupMessages(
  groupId: number,
  options?: { limit?: number; cursorId?: number; viewerUserId?: number },
) {
  const pageLimit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(100, Math.floor(options.limit)))
      : 50;

  const cursorId =
    typeof options?.cursorId === "number" && Number.isFinite(options.cursorId) ? Math.floor(options.cursorId) : null;

  const rawMessages = await db
    .select({
      id: chatGroupMessageTable.id,
      groupId: chatGroupMessageTable.groupId,
      senderId: chatGroupMessageTable.senderId,
      content: chatGroupMessageTable.content,
      contentType: chatGroupMessageTable.contentType,
      mediaUrl: chatGroupMessageTable.mediaUrl,
      createdAt: chatGroupMessageTable.createdAt,
      senderName: userTable.name,
      senderEmail: userTable.email,
      senderProfilePicture: userTable.profilePicture,
    })
    .from(chatGroupMessageTable)
    .innerJoin(userTable, eq(chatGroupMessageTable.senderId, userTable.id))
    .where(
      and(eq(chatGroupMessageTable.groupId, groupId), cursorId ? lt(chatGroupMessageTable.id, cursorId) : undefined),
    )
    .orderBy(desc(chatGroupMessageTable.id))
    .limit(pageLimit + 1);

  const hasMore = rawMessages.length > pageLimit;
  const pageRows = hasMore ? rawMessages.slice(0, pageLimit) : rawMessages;
  const chronologicalRows = [...pageRows].reverse();
  const withReactions = await attachGroupMessageReactions(chronologicalRows as any[]);
  const messageIds = withReactions.map((message) => Number(message.id)).filter((id) => Number.isFinite(id) && id > 0);

  const receiptStatsByMessage = new Map<number, { deliveredCount: number; readCount: number }>();
  const myReadAtByMessage = new Map<number, Date | null>();

  if (messageIds.length) {
    const receiptStats = await db
      .select({
        messageId: chatGroupMessageReceiptTable.messageId,
        deliveredCount: sql<number>`count(*)::int`,
        readCount: sql<number>`count(*) filter (where ${chatGroupMessageReceiptTable.readAt} is not null)::int`,
      })
      .from(chatGroupMessageReceiptTable)
      .where(inArray(chatGroupMessageReceiptTable.messageId, messageIds))
      .groupBy(chatGroupMessageReceiptTable.messageId);

    for (const row of receiptStats) {
      const messageId = Number(row.messageId);
      if (!Number.isFinite(messageId)) continue;
      receiptStatsByMessage.set(messageId, {
        deliveredCount: Number(row.deliveredCount) || 0,
        readCount: Number(row.readCount) || 0,
      });
    }

    if (options?.viewerUserId) {
      const myReceipts = await db
        .select({
          messageId: chatGroupMessageReceiptTable.messageId,
          readAt: chatGroupMessageReceiptTable.readAt,
        })
        .from(chatGroupMessageReceiptTable)
        .where(
          and(
            eq(chatGroupMessageReceiptTable.userId, options.viewerUserId),
            inArray(chatGroupMessageReceiptTable.messageId, messageIds),
          ),
        );

      for (const row of myReceipts) {
        const messageId = Number(row.messageId);
        if (!Number.isFinite(messageId)) continue;
        myReadAtByMessage.set(messageId, row.readAt ?? null);
      }
    }
  }

  const messages = withReactions.map((message) => ({
    ...message,
    contentType: resolveMessageMediaType({
      contentType: message.contentType,
      mediaUrl: message.mediaUrl,
    }),
    messageKey: toMessageKey(groupId, Number(message.id)),
    senderUserKey: toUserKey(Number(message.senderId)),
    senderName: resolveDisplayName({
      name: message.senderName,
      email: message.senderEmail,
      senderId: Number(message.senderId),
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
  };
}

export async function createGroupMessage(input: {
  groupId: number;
  senderId: number;
  content: string;
  contentType?: "text" | "image" | "video";
  mediaUrl?: string | null;
  replyToMessageId?: number | null;
  replyPreview?: string | null;
  clientId?: string | null;
}) {
  const safeBaseContent = input.content.trim() || "Attachment";
  const safeReplyPreview = encodeURIComponent((input.replyPreview ?? "").trim().slice(0, 160));
  const replyPrefix =
    input.replyToMessageId && Number.isFinite(input.replyToMessageId)
      ? `[reply:${input.replyToMessageId}:${safeReplyPreview}] `
      : "";
  const safeContent = `${replyPrefix}${safeBaseContent}`;
  let insertedNewMessage = true;
  let message:
    | {
        id: number;
        groupId: number;
        senderId: number;
        content: string;
        contentType: "text" | "image" | "video";
        mediaUrl: string | null;
        clientMessageId: string | null;
        createdAt: Date;
      }
    | undefined;

  if (input.clientId) {
    const result = await db
      .insert(chatGroupMessageTable)
      .values({
        groupId: input.groupId,
        senderId: input.senderId,
        content: safeContent,
        contentType: input.contentType ?? "text",
        mediaUrl: input.mediaUrl ?? null,
        clientMessageId: input.clientId,
      })
      .onConflictDoNothing({
        target: [chatGroupMessageTable.groupId, chatGroupMessageTable.senderId, chatGroupMessageTable.clientMessageId],
      })
      .returning();
    message = result[0];
    if (!message) {
      insertedNewMessage = false;
      const existing = await db
        .select()
        .from(chatGroupMessageTable)
        .where(
          and(
            eq(chatGroupMessageTable.groupId, input.groupId),
            eq(chatGroupMessageTable.senderId, input.senderId),
            eq(chatGroupMessageTable.clientMessageId, input.clientId),
          ),
        )
        .limit(1);
      message = existing[0];
    }
  } else {
    const result = await db
      .insert(chatGroupMessageTable)
      .values({
        groupId: input.groupId,
        senderId: input.senderId,
        content: safeContent,
        contentType: input.contentType ?? "text",
        mediaUrl: input.mediaUrl ?? null,
        clientMessageId: null,
      })
      .returning();
    message = result[0];
  }

  if (!message) {
    throw new Error("Failed to persist group message");
  }

  let senderName: string | null = null;
  let senderProfilePicture: string | null = null;
  let groupName: string | null = null;
  let memberIdsForDelivery: number[] = [];

  if (insertedNewMessage) {
    const memberRows = await db
      .select({ userId: chatGroupMemberTable.userId })
      .from(chatGroupMemberTable)
      .where(eq(chatGroupMemberTable.groupId, input.groupId));
    memberIdsForDelivery = Array.from(
      new Set(memberRows.map((row) => Number(row.userId)).filter((id) => Number.isFinite(id) && id > 0)),
    );
    if (memberIdsForDelivery.length) {
      await db
        .insert(chatGroupMessageReceiptTable)
        .values(
          memberIdsForDelivery.map((memberId) => ({
            messageId: message.id,
            userId: memberId,
            deliveredAt: message.createdAt,
            readAt: memberId === input.senderId ? message.createdAt : null,
          })),
        )
        .onConflictDoNothing({
          target: [chatGroupMessageReceiptTable.messageId, chatGroupMessageReceiptTable.userId],
        });
    }
  }

  // Push notifications (only for new messages; skip idempotent retries)
  if (insertedNewMessage) {
    try {
      const members = await db
        .select({
          id: userTable.id,
          expoPushToken: userTable.expoPushToken,
        })
        .from(chatGroupMemberTable)
        .innerJoin(userTable, eq(chatGroupMemberTable.userId, userTable.id))
        .where(and(eq(chatGroupMemberTable.groupId, input.groupId), ne(userTable.id, input.senderId)));

      const sender = await db
        .select({ name: userTable.name, email: userTable.email, profilePicture: userTable.profilePicture })
        .from(userTable)
        .where(eq(userTable.id, input.senderId))
        .limit(1);

      const group = await db
        .select({ name: chatGroupTable.name })
        .from(chatGroupTable)
        .where(eq(chatGroupTable.id, input.groupId))
        .limit(1);

      senderName = resolveDisplayName({
        name: sender[0]?.name,
        email: sender[0]?.email,
        senderId: input.senderId,
      });
      senderProfilePicture = sender[0]?.profilePicture ?? null;
      groupName = group[0]?.name ?? "Group";
      const title = `${senderName} in ${groupName}`;
      const body = safeContent;

      for (const member of members) {
        await sendPushNotification(member.id, title, body, {
          type: "group-message",
          threadId: `group:${input.groupId}`,
          url: `/messages/group:${input.groupId}`,
          mediaUrl: input.mediaUrl ?? null,
        });
      }
    } catch (error) {
      console.error("[Push] Group notification error:", error);
    }
  }

  const io = getSocketServer();
  if (io && insertedNewMessage) {
    const enriched = {
      ...(input.clientId ? { ...message, clientId: input.clientId } : message),
      contentType: resolveMessageMediaType({
        contentType: message.contentType,
        mediaUrl: message.mediaUrl,
      }),
      messageKey: toMessageKey(input.groupId, message.id),
      reactions: [],
      senderUserKey: toUserKey(input.senderId),
      senderName,
      senderProfilePicture,
      groupName,
      deliveredCount: memberIdsForDelivery.length || 0,
      readCount: memberIdsForDelivery.length ? 1 : 0,
      myReadAt: message.createdAt,
    };
    // Broadcast to each member's user room so clients still receive live updates
    // even if they haven't joined the group room (or if group room membership is stale).
    try {
      const memberIds = memberIdsForDelivery.length
        ? memberIdsForDelivery
        : Array.from(
            new Set(
              (
                await db
                  .select({ userId: chatGroupMemberTable.userId })
                  .from(chatGroupMemberTable)
                  .where(eq(chatGroupMemberTable.groupId, input.groupId))
              )
                .map((row) => Number(row.userId))
                .filter((id) => Number.isFinite(id) && id > 0),
            ),
          );
      for (const memberId of memberIds) {
        io.to(`user:${memberId}`).emit("group:message", enriched);
      }
    } catch (error) {
      console.warn("[Socket] Failed to emit group:message to user rooms", error);
    }

    // Admin/coach dashboards listen on admin:all.
    io.to("admin:all").emit("group:message", enriched);
  }
  return {
    ...message,
    contentType: resolveMessageMediaType({
      contentType: message.contentType,
      mediaUrl: message.mediaUrl,
    }),
    messageKey: toMessageKey(input.groupId, message.id),
    senderUserKey: toUserKey(input.senderId),
    senderName,
    senderProfilePicture,
    groupName,
    deliveredCount: memberIdsForDelivery.length || 0,
    readCount: memberIdsForDelivery.length ? 1 : 0,
    myReadAt: message.createdAt,
  };
}

export async function deleteGroupMessage(input: { groupId: number; messageId: number; userId: number }) {
  const rows = await db
    .select()
    .from(chatGroupMessageTable)
    .where(and(eq(chatGroupMessageTable.id, input.messageId), eq(chatGroupMessageTable.groupId, input.groupId)))
    .limit(1);
  const message = rows[0];
  if (!message) {
    throw new Error("Message not found");
  }
  if (message.senderId !== input.userId) {
    throw new Error("Forbidden");
  }
  await db.delete(chatGroupMessageReactionTable).where(eq(chatGroupMessageReactionTable.messageId, input.messageId));
  await db.delete(chatGroupMessageReceiptTable).where(eq(chatGroupMessageReceiptTable.messageId, input.messageId));
  await db
    .delete(chatGroupMessageTable)
    .where(and(eq(chatGroupMessageTable.id, input.messageId), eq(chatGroupMessageTable.groupId, input.groupId)));
  const io = getSocketServer();
  if (io) {
    const payload = { messageId: input.messageId, groupId: input.groupId };
    try {
      const memberRows = await db
        .select({ userId: chatGroupMemberTable.userId })
        .from(chatGroupMemberTable)
        .where(eq(chatGroupMemberTable.groupId, input.groupId));
      const memberIds = Array.from(
        new Set(memberRows.map((row) => Number(row.userId)).filter((id) => Number.isFinite(id) && id > 0)),
      );
      for (const memberId of memberIds) {
        io.to(`user:${memberId}`).emit("group:message:deleted", payload);
      }
    } catch (error) {
      console.warn("[Socket] Failed to emit group:message:deleted to user rooms", error);
    }
    io.to("admin:all").emit("group:message:deleted", payload);
  }
  return { deleted: true };
}
