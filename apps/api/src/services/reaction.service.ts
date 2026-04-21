import { and, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "../db";
import {
  chatGroupMessageReactionTable,
  chatGroupMessageTable,
  messageReactionTable,
  messageTable,
  userTable,
} from "../db/schema";
import { getSocketServer } from "../socket-hub";

export type MessageReaction = {
  emoji: string;
  count: number;
  userIds: number[];
};

type DirectMessageRow = typeof messageTable.$inferSelect;
type GroupMessageRow = typeof chatGroupMessageTable.$inferSelect;

async function ensureReactionTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "message_reactions" (
      "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      "messageId" integer NOT NULL REFERENCES "messages"("id"),
      "userId" integer NOT NULL REFERENCES "users"("id"),
      "emoji" varchar(16) NOT NULL,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "message_reactions_unique_idx"
    ON "message_reactions" ("messageId", "userId", "emoji")
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "chat_group_message_reactions" (
      "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      "messageId" integer NOT NULL REFERENCES "chat_group_messages"("id"),
      "userId" integer NOT NULL REFERENCES "users"("id"),
      "emoji" varchar(16) NOT NULL,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "chat_group_message_reactions_unique_idx"
    ON "chat_group_message_reactions" ("messageId", "userId", "emoji")
  `);
}

function buildReactionMap(rows: { messageId: number; emoji: string; userId: number }[]) {
  const byMessage = new Map<number, Map<string, Set<number>>>();
  for (const row of rows) {
    if (!byMessage.has(row.messageId)) {
      byMessage.set(row.messageId, new Map());
    }
    const byEmoji = byMessage.get(row.messageId)!;
    if (!byEmoji.has(row.emoji)) {
      byEmoji.set(row.emoji, new Set());
    }
    byEmoji.get(row.emoji)!.add(row.userId);
  }
  const result = new Map<number, MessageReaction[]>();
  for (const [messageId, byEmoji] of byMessage.entries()) {
    const reactions = Array.from(byEmoji.entries()).map(([emoji, users]) => ({
      emoji,
      count: users.size,
      userIds: Array.from(users),
    }));
    result.set(messageId, reactions);
  }
  return result;
}

export async function attachDirectMessageReactions<T extends { id: number }>(messages: T[]) {
  await ensureReactionTables();
  if (!messages.length) {
    return messages.map((message) => ({ ...message, reactions: [] as MessageReaction[] }));
  }
  const ids = messages.map((message) => message.id);
  const rows = await db
    .select({
      messageId: messageReactionTable.messageId,
      emoji: messageReactionTable.emoji,
      userId: messageReactionTable.userId,
    })
    .from(messageReactionTable)
    .where(inArray(messageReactionTable.messageId, ids));
  const mapped = buildReactionMap(rows);
  return messages.map((message) => ({
    ...message,
    reactions: mapped.get(message.id) ?? [],
  }));
}

export async function attachGroupMessageReactions<T extends { id: number }>(messages: T[]) {
  await ensureReactionTables();
  if (!messages.length) {
    return messages.map((message) => ({ ...message, reactions: [] as MessageReaction[] }));
  }
  const ids = messages.map((message) => message.id);
  const rows = await db
    .select({
      messageId: chatGroupMessageReactionTable.messageId,
      emoji: chatGroupMessageReactionTable.emoji,
      userId: chatGroupMessageReactionTable.userId,
    })
    .from(chatGroupMessageReactionTable)
    .where(inArray(chatGroupMessageReactionTable.messageId, ids));
  const mapped = buildReactionMap(rows);
  return messages.map((message) => ({
    ...message,
    reactions: mapped.get(message.id) ?? [],
  }));
}

export async function toggleDirectMessageReaction(input: { messageId: number; userId: number; emoji: string }) {
  await ensureReactionTables();
  const messageRows = await db.select().from(messageTable).where(eq(messageTable.id, input.messageId)).limit(1);
  const message = messageRows[0] as DirectMessageRow | undefined;
  if (!message) {
    throw new Error("Message not found");
  }
  const actorRows = await db
    .select({ role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, input.userId))
    .limit(1);
  const actorRole = actorRows[0]?.role ?? "";
  const actorIsStaff = actorRole === "admin" || actorRole === "superAdmin" || actorRole === "coach";

  if (!actorIsStaff && message.senderId !== input.userId && message.receiverId !== input.userId) {
    throw new Error("Forbidden");
  }
  const existing = await db
    .select({ id: messageReactionTable.id })
    .from(messageReactionTable)
    .where(
      and(
        eq(messageReactionTable.messageId, input.messageId),
        eq(messageReactionTable.userId, input.userId),
        eq(messageReactionTable.emoji, input.emoji),
      ),
    )
    .limit(1);
  if (existing[0]) {
    await db.delete(messageReactionTable).where(eq(messageReactionTable.id, existing[0].id));
  } else {
    await db.insert(messageReactionTable).values({
      messageId: input.messageId,
      userId: input.userId,
      emoji: input.emoji,
    });
  }
  const [enriched] = await attachDirectMessageReactions([message]);
  const io = getSocketServer();
  if (io) {
    const payload = { messageId: input.messageId, reactions: enriched.reactions };
    io.to(`user:${message.senderId}`).emit("message:reaction", payload);
    io.to(`user:${message.receiverId}`).emit("message:reaction", payload);
    io.to("admin:all").emit("message:reaction", payload);
  }
  return { messageId: input.messageId, reactions: enriched.reactions };
}

export async function toggleGroupMessageReaction(input: {
  groupId: number;
  messageId: number;
  userId: number;
  emoji: string;
}) {
  await ensureReactionTables();
  const messageRows = await db
    .select()
    .from(chatGroupMessageTable)
    .where(and(eq(chatGroupMessageTable.id, input.messageId), eq(chatGroupMessageTable.groupId, input.groupId)))
    .limit(1);
  const message = messageRows[0] as GroupMessageRow | undefined;
  if (!message) {
    throw new Error("Message not found");
  }
  const existing = await db
    .select({ id: chatGroupMessageReactionTable.id })
    .from(chatGroupMessageReactionTable)
    .where(
      and(
        eq(chatGroupMessageReactionTable.messageId, input.messageId),
        eq(chatGroupMessageReactionTable.userId, input.userId),
        eq(chatGroupMessageReactionTable.emoji, input.emoji),
      ),
    )
    .limit(1);
  if (existing[0]) {
    await db.delete(chatGroupMessageReactionTable).where(eq(chatGroupMessageReactionTable.id, existing[0].id));
  } else {
    await db.insert(chatGroupMessageReactionTable).values({
      messageId: input.messageId,
      userId: input.userId,
      emoji: input.emoji,
    });
  }
  const [enriched] = await attachGroupMessageReactions([message]);
  const io = getSocketServer();
  if (io) {
    io.to(`group:${input.groupId}`).emit("group:reaction", {
      groupId: input.groupId,
      messageId: input.messageId,
      reactions: enriched.reactions,
    });
  }
  return { groupId: input.groupId, messageId: input.messageId, reactions: enriched.reactions };
}
