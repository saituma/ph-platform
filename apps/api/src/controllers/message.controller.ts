import type { Request, Response } from "express";
import { z } from "zod";

import {
  listThread,
  markThreadRead,
  sendMessage,
  getCoachUser,
  getLastAdminContact,
  isUserPremium,
  deleteDirectMessage,
} from "../services/message.service";
import { listGroupsForUser } from "../services/chat.service";
import { listMessageThreadsAdmin } from "../services/admin/message.service";
import { db } from "../db";
import { and, eq, inArray } from "drizzle-orm";
import { userTable } from "../db/schema";
import { toggleDirectMessageReaction } from "../services/reaction.service";
import { publicDisplayName } from "../lib/display-name";
import { isTrainingStaff } from "../lib/user-roles";

const sendSchema = z
  .object({
    content: z.string().trim().optional().default(""),
    contentType: z.enum(["text", "image", "video"]).default("text"),
    mediaUrl: z.string().url().optional(),
    videoUploadId: z.number().int().min(1).optional(),
    replyToMessageId: z.number().int().min(1).optional(),
    replyPreview: z.string().trim().max(160).optional(),
    clientId: z.string().trim().min(1).optional(),
    receiverId: z.number().int().optional(),
  })
  .refine((value) => Boolean(value.content) || Boolean(value.mediaUrl), {
    message: "Message content or mediaUrl is required",
  });

const reactionSchema = z.object({
  emoji: z.string().min(1).max(16),
});

const listMessagesQuerySchema = z.object({
  includeVideoResponses: z.union([z.literal("1"), z.literal("0"), z.literal("true"), z.literal("false")]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.coerce.number().int().min(1).optional(),
  peerUserId: z.coerce.number().int().min(1).optional(),
});

const listInboxQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  includeAdminThreads: z.union([z.literal("1"), z.literal("0"), z.literal("true"), z.literal("false")]).optional(),
});

function stripReplyPrefix(content: string | null | undefined) {
  return String(content ?? "")
    .replace(/^\[reply:\d+:[^\]]*\]\s*/i, "")
    .trim();
}

function toIsoTime(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value ?? ""));
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

function normalizeTeamKey(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function canonicalTeamMatchKey(value: string | null | undefined) {
  const normalized = normalizeTeamKey(value);
  const stripped = normalized
    .replace(/\b(team|inbox|group|chat)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || normalized;
}

function shouldReplaceTeamThread(
  current: {
    hasMessage: boolean;
    unread: number;
    updatedAtMs: number;
    groupId: number;
  },
  incoming: {
    hasMessage: boolean;
    unread: number;
    updatedAtMs: number;
    groupId: number;
  },
) {
  if (incoming.hasMessage !== current.hasMessage) {
    return incoming.hasMessage;
  }
  if (incoming.unread !== current.unread) {
    return incoming.unread > current.unread;
  }
  if (incoming.updatedAtMs !== current.updatedAtMs) {
    return incoming.updatedAtMs > current.updatedAtMs;
  }
  return incoming.groupId > current.groupId;
}

export async function listInbox(req: Request, res: Response) {
  const userId = req.user!.id;
  const role = req.user?.role ?? null;
  const { limit, includeAdminThreads } = listInboxQuerySchema.parse(req.query ?? {});
  const pageLimit = limit ?? 200;
  const shouldIncludeAdminThreads =
    includeAdminThreads === "1" ||
    includeAdminThreads === "true" ||
    (includeAdminThreads == null && isTrainingStaff(role));

  const [threadPage, groups, adminThreads] = await Promise.all([
    listThread(userId, { limit: pageLimit }),
    listGroupsForUser(userId, { limit: Math.min(100, pageLimit) }),
    shouldIncludeAdminThreads ? listMessageThreadsAdmin(userId, { limit: pageLimit }) : Promise.resolve([]),
  ]);

  const peerIds = Array.from(
    new Set(
      (threadPage.messages ?? [])
        .map((message) => (message.senderId === userId ? Number(message.receiverId) : Number(message.senderId)))
        .filter((id) => Number.isFinite(id) && id > 0 && id !== userId),
    ),
  );

  const peers = peerIds.length
    ? await db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          role: userTable.role,
          profilePicture: userTable.profilePicture,
          lastSeenAt: userTable.lastSeenAt,
        })
        .from(userTable)
        .where(and(inArray(userTable.id, peerIds), eq(userTable.isDeleted, false), eq(userTable.isBlocked, false)))
    : [];
  const peerById = new Map<number, (typeof peers)[number]>();
  peers.forEach((peer) => peerById.set(peer.id, peer));

  const directByPeer = new Map<
    number,
    {
      peerUserId: number;
      name: string;
      role: string;
      avatarUrl: string | null;
      preview: string;
      unread: number;
      updatedAt: string;
      lastSeenAt: string | null;
    }
  >();

  for (const message of threadPage.messages ?? []) {
    const senderId = Number(message.senderId);
    const receiverId = Number(message.receiverId);
    const peerUserId = senderId === userId ? receiverId : senderId;
    if (!Number.isFinite(peerUserId) || peerUserId <= 0 || peerUserId === userId) continue;
    const existing = directByPeer.get(peerUserId);
    const messageTime = toIsoTime(message.createdAt);
    const peer = peerById.get(peerUserId);
    const defaultName = publicDisplayName({
      id: peerUserId,
      name: peer?.name ?? null,
      email: peer?.email ?? null,
    });
    const unreadDelta = senderId === peerUserId && message.read === false ? 1 : 0;

    if (!existing) {
      directByPeer.set(peerUserId, {
        peerUserId,
        name: defaultName,
        role: String(peer?.role ?? "Member"),
        avatarUrl: peer?.profilePicture ?? null,
        preview: stripReplyPrefix(message.content) || "Start a conversation",
        unread: unreadDelta,
        updatedAt: messageTime,
        lastSeenAt: peer?.lastSeenAt ? peer.lastSeenAt.toISOString() : null,
      });
      continue;
    }

    existing.unread += unreadDelta;
    if (new Date(messageTime).getTime() > new Date(existing.updatedAt).getTime()) {
      existing.updatedAt = messageTime;
      existing.preview = stripReplyPrefix(message.content) || existing.preview;
    }
  }

  // Team/admin staff thread view should align with admin inbox across clients.
  for (const thread of adminThreads) {
    const peerUserId = Number(thread.userId);
    if (!Number.isFinite(peerUserId) || peerUserId <= 0) continue;
    const existing = directByPeer.get(peerUserId);
    const threadTime = toIsoTime(thread.time);
    if (!existing) {
      directByPeer.set(peerUserId, {
        peerUserId,
        name: String(thread.name ?? `User ${peerUserId}`),
        role: "Athlete",
        avatarUrl: null,
        preview: stripReplyPrefix(thread.preview) || "Start a conversation",
        unread: Number(thread.unread ?? 0) || 0,
        updatedAt: threadTime,
        lastSeenAt: null,
      });
      continue;
    }
    existing.unread = Math.max(existing.unread, Number(thread.unread ?? 0) || 0);
    if (new Date(threadTime).getTime() > new Date(existing.updatedAt).getTime()) {
      existing.updatedAt = threadTime;
      existing.preview = stripReplyPrefix(thread.preview) || existing.preview;
      existing.name = String(thread.name ?? existing.name);
    }
  }

  const directThreads = Array.from(directByPeer.values()).map((thread) => ({
    id: `direct:${thread.peerUserId}`,
    type: "direct" as const,
    peerUserId: thread.peerUserId,
    name: thread.name,
    role: thread.role,
    avatarUrl: thread.avatarUrl,
    preview: thread.preview,
    unread: thread.unread,
    updatedAt: thread.updatedAt,
    lastSeenAt: thread.lastSeenAt,
  }));

  const mappedGroupThreads = groups.map((group) => {
    const messageType = String(group.lastMessage?.contentType ?? "").toLowerCase();
    const messageText =
      messageType === "image"
        ? "Photo"
        : messageType === "video"
          ? "Video"
          : stripReplyPrefix(group.lastMessage?.content) || "No messages yet";
    const sender = String(group.lastMessage?.senderName ?? "").trim();
    return {
      id: `group:${group.id}`,
      type: "group" as const,
      groupId: group.id,
      groupCategory: String(group.category ?? "coach_group"),
      name: String(group.name ?? "Group"),
      role: String(group.category ?? "Group"),
      avatarUrl: null,
      preview: sender ? `${sender}: ${messageText}` : messageText,
      unread: Number(group.unreadCount ?? 0) || 0,
      updatedAt: toIsoTime(group.lastMessage?.createdAt ?? group.createdAt),
      lastMessageId: group.lastMessage?.id ?? null,
      lastMessageSenderId: group.lastMessage?.senderId ?? null,
      lastMessageSenderName: sender || null,
      lastMessageSenderProfilePicture: group.lastMessage?.senderProfilePicture ?? null,
      lastMessageContent: stripReplyPrefix(group.lastMessage?.content) || null,
      lastMessageContentType: group.lastMessage?.contentType ?? null,
      lastMessageCreatedAt: group.lastMessage?.createdAt ? toIsoTime(group.lastMessage.createdAt) : null,
      hasMessages: Boolean(group.lastMessage),
    };
  });

  // Some environments contain legacy duplicate `team` groups for the same roster.
  // Collapse them so clients see one canonical team inbox.
  const dedupedGroupThreads = new Map<string, (typeof mappedGroupThreads)[number]>();
  for (const thread of mappedGroupThreads) {
    const isTeam = thread.groupCategory === "team";
    const dedupeKey = isTeam ? canonicalTeamMatchKey(thread.name) : thread.id;
    const existing = dedupedGroupThreads.get(dedupeKey);
    if (!existing) {
      dedupedGroupThreads.set(dedupeKey, thread);
      continue;
    }
    const shouldReplace = shouldReplaceTeamThread(
      {
        hasMessage: Boolean(existing.hasMessages),
        unread: Number(existing.unread ?? 0) || 0,
        updatedAtMs: new Date(existing.updatedAt).getTime(),
        groupId: Number(existing.groupId ?? 0),
      },
      {
        hasMessage: Boolean(thread.hasMessages),
        unread: Number(thread.unread ?? 0) || 0,
        updatedAtMs: new Date(thread.updatedAt).getTime(),
        groupId: Number(thread.groupId ?? 0),
      },
    );
    if (shouldReplace) dedupedGroupThreads.set(dedupeKey, thread);
  }

  const groupThreads = Array.from(dedupedGroupThreads.values()).map((thread) => {
    const { hasMessages, ...rest } = thread;
    return rest;
  });

  let allThreads = [...directThreads, ...groupThreads].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  // For non-staff users with no threads, inject the admin/coach as a default
  // "contact your coach" thread so the inbox is never blank.
  if (!isTrainingStaff(role) && allThreads.length === 0) {
    const defaultCoach = await getLastAdminContact(userId).catch(() => null)
      ?? await getCoachUser().catch(() => null);
    if (defaultCoach) {
      allThreads = [
        {
          id: `direct:${defaultCoach.id}`,
          type: "direct" as const,
          peerUserId: defaultCoach.id,
          name: publicDisplayName({ id: defaultCoach.id, name: defaultCoach.name ?? null, email: defaultCoach.email ?? null }),
          role: defaultCoach.role ?? "Coach",
          avatarUrl: defaultCoach.profilePicture ?? null,
          preview: "Start a conversation",
          unread: 0,
          updatedAt: new Date(0).toISOString(),
          lastSeenAt: null,
        },
      ];
    }
  }

  return res.status(200).json({ threads: allThreads });
}

export async function listMessages(req: Request, res: Response) {
  const userId = req.user!.id;
  const { includeVideoResponses, limit, cursor, peerUserId } = listMessagesQuerySchema.parse(req.query ?? {});

  const [threadPage, lastCoach, premium] = await Promise.all([
    listThread(userId, {
      includeVideoResponses: includeVideoResponses === "1" || includeVideoResponses === "true",
      limit,
      cursorId: cursor,
      peerUserId,
    }),
    getLastAdminContact(userId),
    isUserPremium(userId),
  ]);

  const manager = threadPage.teamManager;
  const coach = lastCoach ?? manager ?? (await getCoachUser());

  const coachesMap = new Map<number, any>();
  if (coach) coachesMap.set(coach.id, coach);
  if (manager && manager.id !== coach?.id) coachesMap.set(manager.id, manager);

  if (premium) {
    const { ensureAiCoachUser } = await import("../services/ai.service");
    const aiCoachId = await ensureAiCoachUser();
    // Only add AI coach if it's not already the same as the regular coach
    if (!coachesMap.has(aiCoachId)) {
      coachesMap.set(aiCoachId, {
        id: aiCoachId,
        name: "AI Coach",
        role: "AI Assistant",
        profilePicture: null,
        isAi: true,
      });
    }
  }

  const peerIds = Array.from(
    new Set(
      (threadPage.messages ?? [])
        .map((message) =>
          message.senderId === userId ? Number(message.receiverId) : Number(message.senderId),
        )
        .filter((id) => Number.isFinite(id) && id > 0 && id !== userId),
    ),
  );

  if (peerIds.length > 0) {
    const peerUsers = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: userTable.role,
        profilePicture: userTable.profilePicture,
      })
      .from(userTable)
      .where(
        and(
          inArray(userTable.id, peerIds),
          eq(userTable.isDeleted, false),
          eq(userTable.isBlocked, false),
        ),
      );

    for (const peer of peerUsers) {
      if (!coachesMap.has(peer.id)) {
        coachesMap.set(peer.id, {
          id: peer.id,
          name: peer.name,
          email: peer.email,
          role: peer.role ?? "Member",
          profilePicture: peer.profilePicture ?? null,
          isAi: false,
        });
      }
    }
  }

  const coaches = Array.from(coachesMap.values()).map((c) => {
    if (c.isAi) {
      return {
        id: c.id,
        name: c.name,
        role: c.role,
        profilePicture: c.profilePicture ?? null,
        isAi: true,
      };
    }
    return {
      id: c.id,
      name: publicDisplayName({ id: c.id, name: c.name, email: c.email ?? null }),
      role: c.role ?? "Member",
      profilePicture: c.profilePicture ?? null,
      isAi: false,
    };
  });
  return res.status(200).json({
    messages: threadPage.messages,
    hasMore: threadPage.hasMore,
    nextCursor: threadPage.nextCursor,
    coaches,
    coach: coaches[0] ?? null,
  });
}

export async function sendMessageToCoach(req: Request, res: Response) {
  const input = sendSchema.parse(req.body);
  const userId = req.user!.id;

  let receiverId = input.receiverId;
  if (!receiverId) {
    const lastCoach = await getLastAdminContact(userId);
    const coach = lastCoach ?? (await getCoachUser());
    if (!coach) {
      return res.status(400).json({ error: "Coach not available" });
    }
    receiverId = coach.id;
  }

  try {
    const message = await sendMessage({
      senderId: userId,
      receiverId: receiverId,
      content: input.content,
      contentType: input.contentType,
      mediaUrl: input.mediaUrl,
      videoUploadId: input.videoUploadId,
      replyToMessageId: input.replyToMessageId,
      replyPreview: input.replyPreview,
      clientId: input.clientId,
    });
    return res.status(201).json({ message });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "MESSAGING_DISABLED_FOR_TIER") {
      return res.status(403).json({ error: "Messaging is not enabled for your plan." });
    }
    if (msg === "AI_COACH_REQUIRES_PREMIUM") {
      return res.status(403).json({ error: "AI coach chat requires PHP Premium." });
    }
    throw err;
  }
}

export async function markRead(req: Request, res: Response) {
  const userId = req.user!.id;
  const peerUserId = z.coerce.number().int().positive().optional().parse(req.body?.peerUserId);
  const count = await markThreadRead(userId, peerUserId);
  return res.status(200).json({ updated: count });
}

export async function toggleReaction(req: Request, res: Response) {
  const messageId = z.coerce.number().int().min(1).parse(req.params.messageId);
  const { emoji } = reactionSchema.parse(req.body);
  const actingUserId = req.user!.id;
  try {
    const result = await toggleDirectMessageReaction({ messageId, userId: actingUserId, emoji });
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    if (message === "Forbidden") {
      return res.status(403).json({ error: message });
    }
    if (message === "Message not found") {
      return res.status(404).json({ error: message });
    }
    throw error;
  }
}

export async function deleteMessage(req: Request, res: Response) {
  const messageId = z.coerce.number().int().min(1).parse(req.params.messageId);
  const actingUserId = req.user!.id;
  try {
    const result = await deleteDirectMessage({ messageId, userId: actingUserId });
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    if (message === "Forbidden") {
      return res.status(403).json({ error: message });
    }
    if (message === "Message not found") {
      return res.status(404).json({ error: message });
    }
    throw error;
  }
}
