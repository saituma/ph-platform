import { and, asc, desc, eq, ilike, inArray, ne, sql } from "drizzle-orm";
import { sendPushNotification } from "./push.service";

import { db } from "../db";
import {
  chatGroupMemberTable,
  chatGroupMessageReactionTable,
  chatGroupMessageTable,
  chatGroupTable,
  messageTable,
  userTable,
} from "../db/schema";
import { getSocketServer } from "../socket-hub";
import { attachGroupMessageReactions } from "./reaction.service";

let cachedSupportsGroupLastReadAt: boolean | null = null;

function errorMentionsMissingColumn(error: unknown, columnName: string) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return message.toLowerCase().includes(`column`) && message.includes(columnName);
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

  return result[0];
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
      }))
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
      }))
    )
    .onConflictDoNothing();
  return unique;
}

export async function listGroupsForUser(userId: number, options?: { q?: string; limit?: number }) {
  const q = options?.q?.trim() ?? "";
  const requestedLimit = options?.limit;
  const limit =
    typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
      : 50;

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
        .innerJoin(
          chatGroupTable,
          eq(chatGroupMemberTable.groupId, chatGroupTable.id),
        )
        .where(
          and(
            eq(chatGroupMemberTable.userId, userId),
            q ? ilike(chatGroupTable.name, `%${q}%`) : undefined,
          ),
        )
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
      .innerJoin(
        chatGroupTable,
        eq(chatGroupMemberTable.groupId, chatGroupTable.id),
      )
      .where(
        and(
          eq(chatGroupMemberTable.userId, userId),
          q ? ilike(chatGroupTable.name, `%${q}%`) : undefined,
        ),
      )
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
    groups = await readGroups(shouldUseLastReadAtColumn());
    cachedSupportsGroupLastReadAt = shouldUseLastReadAtColumn() ? true : cachedSupportsGroupLastReadAt;
  } catch (error) {
    if (shouldUseLastReadAtColumn() && errorMentionsMissingColumn(error, "lastReadAt")) {
      cachedSupportsGroupLastReadAt = false;
      groups = await readGroups(false);
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

  const lastMessageRows = await db
    .select({
      groupId: chatGroupMessageTable.groupId,
      id: chatGroupMessageTable.id,
      senderId: chatGroupMessageTable.senderId,
      content: chatGroupMessageTable.content,
      contentType: chatGroupMessageTable.contentType,
      mediaUrl: chatGroupMessageTable.mediaUrl,
      createdAt: chatGroupMessageTable.createdAt,
      senderName: userTable.name,
      senderProfilePicture: userTable.profilePicture,
    })
    .from(chatGroupMessageTable)
    .innerJoin(userTable, eq(chatGroupMessageTable.senderId, userTable.id))
    .where(inArray(chatGroupMessageTable.groupId, groupIds))
    .orderBy(asc(chatGroupMessageTable.groupId), desc(chatGroupMessageTable.createdAt));

  const lastMessageByGroup = new Map<number, (typeof lastMessageRows)[number]>();
  for (const row of lastMessageRows) {
    const id = Number(row.groupId);
    if (!Number.isFinite(id)) continue;
    if (!lastMessageByGroup.has(id)) {
      lastMessageByGroup.set(id, row);
    }
  }

  const unreadRows = await db
    .select({
      groupId: chatGroupMessageTable.groupId,
      unreadCount: sql<number>`count(*)::int`,
    })
    .from(chatGroupMessageTable)
    .innerJoin(
      chatGroupMemberTable,
      and(
        eq(chatGroupMemberTable.groupId, chatGroupMessageTable.groupId),
        eq(chatGroupMemberTable.userId, userId),
      ),
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
    .groupBy(chatGroupMessageTable.groupId);

  const unreadByGroup = new Map<number, number>();
  for (const row of unreadRows) {
    const id = Number(row.groupId);
    if (!Number.isFinite(id)) continue;
    unreadByGroup.set(id, Number(row.unreadCount) || 0);
  }

  return groups.map((group) => {
    const id = Number(group.id);
    const last = Number.isFinite(id) ? lastMessageByGroup.get(id) ?? null : null;
    const unreadCount = Number.isFinite(id) ? unreadByGroup.get(id) ?? 0 : 0;
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
            senderId: last.senderId,
            senderName: last.senderName,
            senderProfilePicture: last.senderProfilePicture,
            content: last.content,
            contentType: last.contentType,
            mediaUrl: last.mediaUrl,
            createdAt: last.createdAt,
          }
        : null,
    };
  });
}

export async function markGroupRead(input: { groupId: number; userId: number; readAt?: Date }) {
  const readAt = input.readAt ?? new Date();
  if (cachedSupportsGroupLastReadAt === false) return null;
  try {
    const result = await db
      .update(chatGroupMemberTable)
      .set({ lastReadAt: readAt })
      .where(
        and(
          eq(chatGroupMemberTable.groupId, input.groupId),
          eq(chatGroupMemberTable.userId, input.userId),
        ),
      )
      .returning();
    cachedSupportsGroupLastReadAt = true;
    return result[0] ?? null;
  } catch (error) {
    if (errorMentionsMissingColumn(error, "lastReadAt")) {
      cachedSupportsGroupLastReadAt = false;
      return null;
    }
    throw error;
  }
}

export async function listGroupMembers(groupId: number) {
  return db
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
}

export async function isGroupMember(groupId: number, userId: number) {
  const result = await db
    .select()
    .from(chatGroupMemberTable)
    .where(and(eq(chatGroupMemberTable.groupId, groupId), eq(chatGroupMemberTable.userId, userId)))
    .limit(1);
  return Boolean(result[0]);
}

export async function listGroupMessages(groupId: number) {
  const messages = await db
    .select()
    .from(chatGroupMessageTable)
    .where(eq(chatGroupMessageTable.groupId, groupId))
    .orderBy(chatGroupMessageTable.createdAt);
  return attachGroupMessageReactions(messages);
}

export async function createGroupMessage(input: {
  groupId: number;
  senderId: number;
  content: string;
  contentType?: "text" | "image" | "video";
  mediaUrl?: string | null;
  replyToMessageId?: number | null;
  replyPreview?: string | null;
}) {
  const safeBaseContent = input.content.trim() || "Attachment";
  const safeReplyPreview = encodeURIComponent((input.replyPreview ?? "").trim().slice(0, 160));
  const replyPrefix =
    input.replyToMessageId && Number.isFinite(input.replyToMessageId)
      ? `[reply:${input.replyToMessageId}:${safeReplyPreview}] `
      : "";
  const safeContent = `${replyPrefix}${safeBaseContent}`;
  const result = await db
    .insert(chatGroupMessageTable)
    .values({
      groupId: input.groupId,
      senderId: input.senderId,
      content: safeContent,
      contentType: input.contentType ?? "text",
      mediaUrl: input.mediaUrl ?? null,
    })
    .returning();
  const message = result[0];

  // Push notifications
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
      .select({ name: userTable.name })
      .from(userTable)
      .where(eq(userTable.id, input.senderId))
      .limit(1);

    const group = await db
      .select({ name: chatGroupTable.name })
      .from(chatGroupTable)
      .where(eq(chatGroupTable.id, input.groupId))
      .limit(1);

    const title = `${sender[0]?.name ?? "User"} in ${group[0]?.name ?? "Group"}`;
    const body = safeContent;

    for (const member of members) {
      if (member.expoPushToken) {
        await sendPushNotification(member.id, title, body, {
          type: "group-message",
          threadId: `group:${input.groupId}`,
          url: `/messages/group:${input.groupId}`,
        });
      }
    }
  } catch (error) {
    console.error("[Push] Group notification error:", error);
  }

  const io = getSocketServer();
  if (io) {
    io.to(`group:${input.groupId}`).emit("group:message", { ...message, reactions: [] });
  }
  return message;
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
  await db
    .delete(chatGroupMessageReactionTable)
    .where(eq(chatGroupMessageReactionTable.messageId, input.messageId));
  await db
    .delete(chatGroupMessageTable)
    .where(and(eq(chatGroupMessageTable.id, input.messageId), eq(chatGroupMessageTable.groupId, input.groupId)));
  const io = getSocketServer();
  if (io) {
    io.to(`group:${input.groupId}`).emit("group:message:deleted", { messageId: input.messageId });
  }
  return { deleted: true };
}
