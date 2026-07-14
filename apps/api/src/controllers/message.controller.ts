import type { Request, Response } from "express";
import { z } from "zod";

import { getCoachUser, getLastAdminContact, getTeamManagersForUser, isUserPremium } from "../services/message.service";
import { listGroupsForUser } from "../services/chat.service";
import { MAX_MESSAGE_LENGTH, MAX_REPLY_PREVIEW_LENGTH } from "../lib/message-limits";
import { db } from "../db";
import { and, eq, inArray } from "drizzle-orm";
import { auditLogsTable, userTable } from "../db/schema";
import { publicDisplayName } from "../lib/display-name";
import { isTrainingStaff, isPlatformAdmin } from "../lib/user-roles";
import { createRealtimeTrace, logRealtimeLatency } from "../lib/realtime-latency";
import {
  canAccessConversationMessage,
  deleteConversationMessage,
  editConversationMessage,
  getConversationMessageForForward,
  listConversationMessagesForUser,
  listConversationThreadsAdmin,
  listConversationThreadsForUser,
  markConversationRead,
  pinConversationMessage,
  searchConversationMessages,
  sendDirectMessage,
  toggleConversationReaction,
} from "../services/conversation.service";

const sendSchema = z
  .object({
    content: z.string().trim().max(MAX_MESSAGE_LENGTH).optional().default(""),
    contentType: z.enum(["text", "image", "video"]).default("text"),
    mediaUrl: z.string().url().optional(),
    videoUploadId: z.number().int().min(1).optional(),
    replyToMessageId: z.number().int().min(1).optional(),
    replyPreview: z.string().trim().max(MAX_REPLY_PREVIEW_LENGTH).optional(),
    clientId: z.string().trim().min(1).optional(),
    clientTraceId: z.string().trim().min(1).max(96).optional(),
    clientSentAt: z.union([z.number(), z.string()]).optional(),
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

  const [conversationThreads, groups, adminThreads] = await Promise.all([
    listConversationThreadsForUser(userId, pageLimit),
    listGroupsForUser(userId, { limit: Math.min(100, pageLimit) }),
    shouldIncludeAdminThreads ? listConversationThreadsAdmin(userId, { limit: pageLimit }) : Promise.resolve([]),
  ]);

  // Admin-oversight threads are peers too: an admin watching the shared inbox needs their
  // lastSeenAt, even though they never exchanged a DM with them personally.
  const peerIds = Array.from(
    new Set(
      [
        ...(conversationThreads ?? []).map((thread) => Number(thread.peerUserId)),
        ...adminThreads.map((thread) => Number(thread.userId)),
      ].filter((id) => Number.isFinite(id) && id > 0 && id !== userId),
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

  for (const thread of conversationThreads ?? []) {
    const peerUserId = Number(thread.peerUserId);
    if (!Number.isFinite(peerUserId) || peerUserId <= 0 || peerUserId === userId) continue;
    const existing = directByPeer.get(peerUserId);
    const messageTime = toIsoTime(thread.updatedAt);
    const peer = peerById.get(peerUserId);
    const defaultName = publicDisplayName({
      id: peerUserId,
      name: peer?.name ?? null,
      email: peer?.email ?? null,
    });

    if (!existing) {
      directByPeer.set(peerUserId, {
        peerUserId,
        name: defaultName,
        role: String(peer?.role ?? "Member"),
        avatarUrl: peer?.profilePicture ?? null,
        preview: stripReplyPrefix(thread.preview) || "Start a conversation",
        unread: Number(thread.unread ?? 0) || 0,
        updatedAt: messageTime,
        lastSeenAt: peer?.lastSeenAt ? peer.lastSeenAt.toISOString() : null,
      });
      continue;
    }

    existing.unread += Number(thread.unread ?? 0) || 0;
    if (new Date(messageTime).getTime() > new Date(existing.updatedAt).getTime()) {
      existing.updatedAt = messageTime;
      existing.preview = stripReplyPrefix(thread.preview) || existing.preview;
    }
  }

  // Team/admin staff thread view should align with admin inbox across clients.
  for (const thread of adminThreads) {
    const peerUserId = Number(thread.userId);
    if (!Number.isFinite(peerUserId) || peerUserId <= 0) continue;
    const existing = directByPeer.get(peerUserId);
    const threadTime = toIsoTime(thread.time);
    if (!existing) {
      const peer = peerById.get(peerUserId);
      directByPeer.set(peerUserId, {
        peerUserId,
        name: String(thread.name ?? `User ${peerUserId}`),
        role: "Athlete",
        avatarUrl: peer?.profilePicture ?? null,
        preview: stripReplyPrefix(thread.preview) || "Start a conversation",
        unread: Number(thread.unread ?? 0) || 0,
        updatedAt: threadTime,
        lastSeenAt: peer?.lastSeenAt ? peer.lastSeenAt.toISOString() : null,
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

  const makeContactThread = (coach: {
    id: number;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    profilePicture?: string | null;
  }) => ({
    id: `direct:${coach.id}`,
    type: "direct" as const,
    peerUserId: coach.id,
    name: publicDisplayName({ id: coach.id, name: coach.name ?? null, email: coach.email ?? null }),
    role: coach.role ?? "Coach",
    avatarUrl: coach.profilePicture ?? null,
    preview: "Start a conversation",
    unread: 0,
    updatedAt: new Date(0).toISOString(),
    lastSeenAt: null,
  });

  // Team athletes should always see every one of their team's managers (primary +
  // co-managers) as a startable contact, even before any message is exchanged.
  if (role === "team_athlete") {
    const managers = await getTeamManagersForUser(userId).catch(() => []);
    const existingPeerIds = new Set(
      allThreads.filter((t) => t.type === "direct").map((t) => (t as { peerUserId: number }).peerUserId),
    );
    const managerThreads = managers.filter((m) => !existingPeerIds.has(m.id)).map(makeContactThread);
    if (managerThreads.length) {
      allThreads = [...allThreads, ...managerThreads].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    } else if (allThreads.length === 0) {
      const fallback = await getCoachUser().catch(() => null);
      if (fallback) allThreads = [makeContactThread(fallback)];
    }
  } else if (!isTrainingStaff(role) && allThreads.length === 0) {
    // Other non-staff users with no threads: inject a default "contact your coach" thread.
    const defaultCoach =
      (await getLastAdminContact(userId).catch(() => null)) ?? (await getCoachUser().catch(() => null));
    if (defaultCoach) {
      allThreads = [makeContactThread(defaultCoach)];
    }
  }

  return res.status(200).json({ threads: allThreads });
}

export async function listMessages(req: Request, res: Response) {
  const userId = req.user!.id;
  const role = req.user?.role ?? null;
  const { limit, cursor, peerUserId } = listMessagesQuerySchema.parse(req.query ?? {});

  const [threadPage, lastCoach, premium, managers] = await Promise.all([
    listConversationMessagesForUser(userId, {
      limit,
      cursorId: cursor,
      peerUserId,
    }),
    // Team athletes only contact their team manager — skip the broad admin search.
    role === "team_athlete" ? Promise.resolve(null) : getLastAdminContact(userId),
    isUserPremium(userId),
    role === "team_athlete" ? getTeamManagersForUser(userId) : Promise.resolve([]),
  ]);

  const manager = managers[0] ?? null;
  // Team athletes prefer their team manager, but still need a safe fallback
  // to avoid a blank messaging surface when manager linkage is missing.
  const coach =
    role === "team_athlete" ? (manager ?? (await getCoachUser())) : (lastCoach ?? manager ?? (await getCoachUser()));

  const coachesMap = new Map<number, any>();
  if (coach) coachesMap.set(coach.id, coach);
  if (manager && manager.id !== coach?.id) coachesMap.set(manager.id, manager);

  const peerIds = Array.from(
    new Set(
      (threadPage.messages ?? [])
        .map((message) => (message.senderId === userId ? Number(message.receiverId) : Number(message.senderId)))
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
      .where(and(inArray(userTable.id, peerIds), eq(userTable.isDeleted, false), eq(userTable.isBlocked, false)));

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
  const trace = createRealtimeTrace({
    traceId: input.clientTraceId ?? input.clientId,
    clientSentAt: input.clientSentAt,
  });
  logRealtimeLatency(trace, "http.direct.receive", {
    senderId: userId,
    receiverId: input.receiverId ?? null,
    hasMedia: Boolean(input.mediaUrl),
  });

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
    logRealtimeLatency(trace, "http.direct.before_service", { senderId: userId, receiverId });
    const message = await sendDirectMessage({
      senderId: userId,
      receiverId: receiverId,
      senderRole: req.user?.role ?? null,
      content: input.content,
      contentType: input.contentType,
      mediaUrl: input.mediaUrl,
      videoUploadId: input.videoUploadId,
      replyToMessageId: input.replyToMessageId,
      replyPreview: input.replyPreview,
      clientId: input.clientId,
      trace,
    });
    logRealtimeLatency(trace, "http.direct.after_service", { messageId: message.id, receiverId });
    return res.status(201).json({ message });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "MESSAGING_DISABLED_FOR_TIER") {
      return res.status(403).json({ error: "Messaging is not enabled for your plan." });
    }
    if (msg === "USER_BLOCKED") {
      return res.status(403).json({ error: "Messaging is blocked for this conversation." });
    }
    throw err;
  }
}

export async function markRead(req: Request, res: Response) {
  const userId = req.user!.id;
  // peerUserId was optional, and markConversationRead() with no peer marks EVERY unread
  // message in EVERY conversation as read. An empty POST body silently wiped the user's
  // entire unread state. No client ever relied on that; it is now required.
  const peerUserId = z.coerce.number().int().positive().parse(req.body?.peerUserId);
  const count = await markConversationRead(userId, peerUserId);
  return res.status(200).json({ updated: count });
}

export async function toggleReaction(req: Request, res: Response) {
  const messageId = z.coerce.number().int().min(1).parse(req.params.messageId);
  const { emoji } = reactionSchema.parse(req.body);
  const actingUserId = req.user!.id;
  try {
    const actorIsStaff = isTrainingStaff(req.user?.role ?? null);
    const reactions = await toggleConversationReaction({ messageId, userId: actingUserId, emoji, actorIsStaff });
    if (!reactions) return res.status(404).json({ error: "Message not found" });
    return res.status(200).json({ reactions });
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
  const isAdmin = isPlatformAdmin(req.user!.role);
  try {
    const deleted = await deleteConversationMessage(actingUserId, messageId, isAdmin);
    if (!deleted) return res.status(404).json({ error: "Message not found" });
    return res.status(200).json({ deleted: true });
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

const editMessageSchema = z.object({ content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH) });

export async function editMessage(req: Request, res: Response) {
  const messageId = z.coerce.number().int().min(1).parse(req.params.messageId);
  const { content } = editMessageSchema.parse(req.body);
  const userId = req.user!.id;
  const isAdmin = isPlatformAdmin(req.user!.role);
  try {
    const edited = await editConversationMessage({ messageId, userId, content, isAdmin });
    if (!edited) return res.status(404).json({ error: "Message not found" });
    return res.status(200).json({ edited: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Request failed";
    if (msg === "Forbidden") return res.status(403).json({ error: msg });
    if (msg === "Message not found") return res.status(404).json({ error: msg });
    throw error;
  }
}

// ── Message Search (DMs) ────────────────────────────────────────────────

const searchMessagesQuerySchema = z.object({
  q: z.string().trim().min(1),
  threadId: z.coerce.number().int().min(1).optional(),
});

export async function searchMessages(req: Request, res: Response) {
  const userId = req.user!.id;
  const { q, threadId } = searchMessagesQuerySchema.parse(req.query ?? {});
  const results = await searchConversationMessages({ userId, q, peerUserId: threadId });

  return res.status(200).json({ results });
}

// ── Message Pin (DMs) ───────────────────────────────────────────────────

export async function pinMessage(req: Request, res: Response) {
  const messageId = z.coerce.number().int().min(1).parse(req.params.messageId);
  const userId = req.user!.id;

  try {
    const pinned = await pinConversationMessage({ userId, messageId });
    if (pinned == null) {
      return res.status(404).json({ error: "Message not found" });
    }
    return res.status(200).json({ pinned });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    if (message === "Forbidden") {
      return res.status(403).json({ error: message });
    }
    throw error;
  }
}

// ── Report DM Message ──────────────────────────────────────────────────

const reportMessageSchema = z.object({
  reason: z.string().trim().min(1).max(200),
  details: z.string().trim().max(500).optional(),
});

export async function reportMessage(req: Request, res: Response) {
  const messageId = z.coerce.number().int().min(1).parse(req.params.messageId);
  const userId = req.user!.id;
  const parsed = reportMessageSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  if (!(await canAccessConversationMessage(userId, messageId))) {
    return res.status(404).json({ error: "Message not found" });
  }

  await db.insert(auditLogsTable).values({
    performedBy: userId,
    action: `dm_message_reported:${parsed.data.reason}`,
    targetTable: "conversation_messages",
    targetId: messageId,
  });

  return res.status(200).json({ ok: true });
}

// ── Message Forward ─────────────────────────────────────────────────────

const forwardMessageSchema = z.object({
  messageId: z.number().int().min(1),
  targetThreadId: z.string().trim().min(1),
});

export async function forwardMessage(req: Request, res: Response) {
  const userId = req.user!.id;
  const { messageId, targetThreadId } = forwardMessageSchema.parse(req.body);

  // Fetch original message — user must be a participant
  const original = await getConversationMessageForForward(userId, messageId);

  if (!original) {
    return res.status(404).json({ error: "Message not found" });
  }

  const forwardedContent = `[Forwarded] ${original.content}`;

  // Forward to a group chat
  if (targetThreadId.startsWith("group:")) {
    const groupId = Number(targetThreadId.replace("group:", ""));
    if (!Number.isFinite(groupId) || groupId < 1) {
      return res.status(400).json({ error: "Invalid group ID" });
    }
    const { isGroupMember, createGroupMessage } = await import("../services/chat.service");
    const allowed = await isGroupMember(groupId, userId);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const message = await createGroupMessage({
      groupId,
      senderId: userId,
      content: forwardedContent,
      contentType: original.contentType,
      mediaUrl: original.mediaUrl,
    });
    return res.status(201).json({ message });
  }

  // Forward to a DM thread (targetThreadId is a userId)
  const receiverId = Number(targetThreadId);
  if (!Number.isFinite(receiverId) || receiverId < 1) {
    return res.status(400).json({ error: "Invalid target thread ID" });
  }

  let newMessage: Awaited<ReturnType<typeof sendDirectMessage>>;
  try {
    newMessage = await sendDirectMessage({
      senderId: userId,
      receiverId,
      content: forwardedContent,
      contentType: original.contentType,
      mediaUrl: original.mediaUrl,
      senderRole: req.user?.role ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "USER_BLOCKED") {
      return res.status(403).json({ error: "Messaging is blocked for this conversation." });
    }
    throw err;
  }

  return res.status(201).json({ message: newMessage });
}
