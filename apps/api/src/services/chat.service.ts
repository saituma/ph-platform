import { and, eq, ne } from "drizzle-orm";
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

export async function createGroup(input: { name: string; createdBy: number; memberIds: number[] }) {
  const group = await db
    .insert(chatGroupTable)
    .values({
      name: input.name,
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

export async function listGroupsForUser(userId: number) {
  return db
    .select({
      id: chatGroupTable.id,
      name: chatGroupTable.name,
      createdBy: chatGroupTable.createdBy,
      createdAt: chatGroupTable.createdAt,
    })
    .from(chatGroupMemberTable)
    .innerJoin(chatGroupTable, eq(chatGroupMemberTable.groupId, chatGroupTable.id))
    .where(eq(chatGroupMemberTable.userId, userId));
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
