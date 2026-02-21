import { and, eq } from "drizzle-orm";

import { db } from "../db";
import { sql } from "drizzle-orm";
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

async function ensureChatTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "chat_groups" (
      "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      "name" varchar(255) NOT NULL,
      "createdBy" integer NOT NULL REFERENCES "users"("id"),
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "chat_group_members" (
      "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      "groupId" integer NOT NULL REFERENCES "chat_groups"("id"),
      "userId" integer NOT NULL REFERENCES "users"("id"),
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "chat_group_messages" (
      "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      "groupId" integer NOT NULL REFERENCES "chat_groups"("id"),
      "senderId" integer NOT NULL REFERENCES "users"("id"),
      "content" varchar(500) NOT NULL,
      "contentType" message_type NOT NULL DEFAULT 'text',
      "mediaUrl" varchar(500),
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);
}

export async function createGroup(input: { name: string; createdBy: number; memberIds: number[] }) {
  await ensureChatTables();
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
  await ensureChatTables();
  const unique = Array.from(new Set(memberIds));
  if (!unique.length) return [];
  await db.insert(chatGroupMemberTable).values(
    unique.map((userId) => ({
      groupId,
      userId,
    }))
  );
  return unique;
}

export async function listGroupsForUser(userId: number) {
  await ensureChatTables();
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
  await ensureChatTables();
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
  await ensureChatTables();
  const result = await db
    .select()
    .from(chatGroupMemberTable)
    .where(and(eq(chatGroupMemberTable.groupId, groupId), eq(chatGroupMemberTable.userId, userId)))
    .limit(1);
  return Boolean(result[0]);
}

export async function listGroupMessages(groupId: number) {
  await ensureChatTables();
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
}) {
  await ensureChatTables();
  const safeContent = input.content.trim() || "Attachment";
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
  const io = getSocketServer();
  if (io) {
    io.to(`group:${input.groupId}`).emit("group:message", { ...message, reactions: [] });
  }
  return message;
}

export async function deleteGroupMessage(input: { groupId: number; messageId: number; userId: number }) {
  await ensureChatTables();
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
