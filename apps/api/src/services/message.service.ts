import { and, desc, eq, inArray, or } from "drizzle-orm";

import { db } from "../db";
import { messageReactionTable, messageTable, userTable } from "../db/schema";
import { getSocketServer } from "../socket-hub";
import { attachDirectMessageReactions } from "./reaction.service";

export async function getCoachUser() {
  const users = await db
    .select()
    .from(userTable)
    .where(
      and(
        or(eq(userTable.role, "coach"), eq(userTable.role, "admin"), eq(userTable.role, "superAdmin")),
        eq(userTable.isDeleted, false),
        eq(userTable.isBlocked, false)
      )
    )
    .orderBy(desc(userTable.updatedAt));
  return users[0] ?? null;
}

export async function getCoachUserById(userId: number) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.id, userId), eq(userTable.isDeleted, false), eq(userTable.isBlocked, false)))
    .limit(1);
  return users[0] ?? null;
}

export async function getAdminCoachIds() {
  const admins = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(
      and(
        or(eq(userTable.role, "coach"), eq(userTable.role, "admin"), eq(userTable.role, "superAdmin")),
        eq(userTable.isDeleted, false),
        eq(userTable.isBlocked, false)
      )
    );
  return admins.map((row) => row.id);
}

export async function getLastAdminContact(userId: number) {
  const adminIds = await getAdminCoachIds();
  if (!adminIds.length) return null;
  const messages = await db
    .select()
    .from(messageTable)
    .where(
      or(
        and(eq(messageTable.senderId, userId), inArray(messageTable.receiverId, adminIds)),
        and(inArray(messageTable.senderId, adminIds), eq(messageTable.receiverId, userId))
      )
    )
    .orderBy(desc(messageTable.createdAt))
    .limit(1);
  const last = messages[0];
  if (!last) return null;
  const otherId = last.senderId === userId ? last.receiverId : last.senderId;
  return getCoachUserById(otherId);
}

export async function listThread(userId: number) {
  const adminIds = await getAdminCoachIds();
  if (!adminIds.length) return [];
  const messages = await db
    .select()
    .from(messageTable)
    .where(
      or(
        and(eq(messageTable.senderId, userId), inArray(messageTable.receiverId, adminIds)),
        and(inArray(messageTable.senderId, adminIds), eq(messageTable.receiverId, userId))
      )
    )
    .orderBy(messageTable.createdAt);
  return attachDirectMessageReactions(messages);
}

export async function sendMessage(input: {
  senderId: number;
  receiverId: number;
  content: string;
  contentType: "text" | "image" | "video";
  mediaUrl?: string | null;
  videoUploadId?: number | null;
}) {
  const safeContent = input.content.trim() || "Attachment";
  const result = await db
    .insert(messageTable)
    .values({
      senderId: input.senderId,
      receiverId: input.receiverId,
      content: safeContent,
      contentType: input.contentType,
      mediaUrl: input.mediaUrl ?? null,
      videoUploadId: input.videoUploadId ?? null,
    })
    .returning();

  const message = result[0];
  const io = getSocketServer();
  if (io) {
    io.to(`user:${input.senderId}`).emit("message:new", message);
    io.to(`user:${input.receiverId}`).emit("message:new", message);
    io.to("admin:all").emit("message:new", message);
  }
  return message;
}

export async function markThreadRead(userId: number) {
  const adminIds = await getAdminCoachIds();
  if (!adminIds.length) return 0;
  const result = await db
    .update(messageTable)
    .set({ read: true })
    .where(and(eq(messageTable.receiverId, userId), inArray(messageTable.senderId, adminIds)));
  return result.rowCount ?? 0;
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
  await db.delete(messageTable).where(eq(messageTable.id, input.messageId));
  const io = getSocketServer();
  if (io) {
    io.to(`user:${message.senderId}`).emit("message:deleted", { messageId: input.messageId });
    io.to(`user:${message.receiverId}`).emit("message:deleted", { messageId: input.messageId });
    io.to("admin:all").emit("message:deleted", { messageId: input.messageId });
  }
  return { deleted: true };
}
