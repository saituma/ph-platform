import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, messageReactionTable, messageTable, userTable } from "../db/schema";
import { env } from "../config/env";
import { getSocketServer } from "../socket-hub";
import { attachDirectMessageReactions } from "./reaction.service";
import { sendPushNotification } from "./push.service";

const AI_COACH_EMAIL = "ai-coach@football-performance.ai";

export async function getCoachUser() {
  const users = await db
    .select()
    .from(userTable)
    .where(
      and(
        or(eq(userTable.role, "coach"), eq(userTable.role, "admin"), eq(userTable.role, "superAdmin")),
        eq(userTable.isDeleted, false),
        eq(userTable.isBlocked, false),
        ne(userTable.email, AI_COACH_EMAIL)
      )
    )
    .orderBy(
      desc(sql`length(trim(coalesce(${userTable.profilePicture}, ''))) > 0`),
      desc(
        sql`lower(trim(coalesce(${userTable.name}, ''))) not in ('admin', 'administrator')`
      ),
      desc(userTable.updatedAt)
    );
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
  // Exclude AI Coach from "last admin contact" — it has its own thread
  const aiCoachRows = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, AI_COACH_EMAIL))
    .limit(1);
  const aiCoachId = aiCoachRows[0]?.id;
  const humanAdminIds = aiCoachId ? adminIds.filter((id) => id !== aiCoachId) : adminIds;
  if (!humanAdminIds.length) return null;
  const messages = await db
    .select()
    .from(messageTable)
    .where(
      or(
        and(eq(messageTable.senderId, userId), inArray(messageTable.receiverId, humanAdminIds)),
        and(inArray(messageTable.senderId, humanAdminIds), eq(messageTable.receiverId, userId))
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
        and(eq(messageTable.senderId, userId), inArray(messageTable.receiverId, [...adminIds, -1])),
        and(inArray(messageTable.senderId, [...adminIds, -1]), eq(messageTable.receiverId, userId))
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
  clientId?: string | null;
  /** When true, athletes without messaging-enabled tiers can still message a human coach (e.g. app feedback). */
  bypassMessagingTierForCoach?: boolean;
}) {
  const safeContent = input.content.trim() || "Attachment";

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

  const result = await db
    .insert(messageTable)
    .values({
      senderId: input.senderId,
      receiverId: resolvedReceiverId,
      content: safeContent,
      contentType: input.contentType,
      mediaUrl: input.mediaUrl ?? null,
      videoUploadId: input.videoUploadId ?? null,
    })
    .returning();

  const message = result[0];

  // If message is to AI Coach, generate and send AI response
  if (aiCoachId !== null) {
    const { generateAiCoachResponse } = await import("./ai.service");
    
    // Fetch recent history for context (last 5 messages)
    const historyRows = await db
      .select({ role: sql<string>`case when ${messageTable.senderId} = ${input.senderId} then 'user' else 'assistant' end`.as("role"), content: messageTable.content })
      .from(messageTable)
      .where(
        or(
          and(eq(messageTable.senderId, input.senderId), eq(messageTable.receiverId, aiCoachId)),
          and(eq(messageTable.senderId, aiCoachId), eq(messageTable.receiverId, input.senderId))
        )
      )
      .orderBy(desc(messageTable.createdAt))
      .limit(5);
    
    const history = historyRows.reverse().map(h => ({ 
      role: h.role as "user" | "assistant", 
      content: h.content 
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
  if (aiCoachId === null) {
    try {
      const sender = await db
        .select({ name: userTable.name })
        .from(userTable)
        .where(eq(userTable.id, input.senderId))
        .limit(1);
        
      const title = `New message from ${sender[0]?.name ?? "Coach"}`;
      const body = input.contentType === "text" ? input.content : `Sent a ${input.contentType}`;

      await sendPushNotification(resolvedReceiverId, title, body, {
        type: "message",
        threadId: String(input.senderId),
        url: `/messages/${String(input.senderId)}`,
      });
    } catch (error) {
      console.error("[Push] Failed to send message push notification:", error);
    }
  }

  const io = getSocketServer();
  if (io && aiCoachId === null) {
    const enriched = input.clientId ? { ...message, clientId: input.clientId } : message;
    console.log(`[Socket] Emitting message:new for ID ${message.id} to rooms: user:${input.senderId}, user:${resolvedReceiverId}, admin:all`);
    io.to(`user:${input.senderId}`).emit("message:new", enriched);
    io.to(`user:${resolvedReceiverId}`).emit("message:new", enriched);
    io.to("admin:all").emit("message:new", enriched);
  } else if (!io) {
    console.warn("[Socket] Failed to emit message:new - IO server NOT initialized");
  } else if (aiCoachId !== null) {
    // Only emit user's message back to user for AI coach thread
    const enriched = input.clientId ? { ...message, clientId: input.clientId } : message;
    io!.to(`user:${input.senderId}`).emit("message:new", enriched);
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

export async function isUserPremium(userId: number): Promise<boolean> {
  const { getAthleteForUser } = await import("./user.service");
  const athlete = await getAthleteForUser(userId);
  return athlete?.currentProgramTier === "PHP_Premium";
}
