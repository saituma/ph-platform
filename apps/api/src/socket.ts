import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { env } from "./config/env";
import { getDbOutageRemainingMs, isLikelyDatabaseConnectivityFailure } from "./lib/db-connectivity";
import { createLogger } from "./lib/logger";
import { isSharedInboxViewer } from "./lib/messaging-access";
import { verifyAccessToken } from "./lib/jwt";
import { getUserByCognitoSub, getUserById, getGuardianAndAthlete } from "./services/user.service";
import { createGroupMessage, listGroupsForUser, isGroupMember } from "./services/chat.service";
import {
  directConversationExists,
  listDirectPeerIds,
  markConversationMessageDelivered,
  markConversationRead,
  sendDirectMessage,
} from "./services/conversation.service";
import { setSocketServer } from "./socket-hub";
import { db } from "./db";
import { userTable } from "./db/schema";
import { getRedisConnection } from "./jobs/connection";
import { createRealtimeTrace, logRealtimeLatency } from "./lib/realtime-latency";
import { MAX_MESSAGE_LENGTH, MAX_REPLY_PREVIEW_LENGTH } from "./lib/message-limits";
import { SocketRateLimiter } from "./lib/socket-rate-limit";
import { markOnline, markOffline, setActiveThread, getOnlineSubset, startPresenceRefresh } from "./lib/presence";

type AuthPayload = {
  sub?: string;
  user_id?: number;
  role?: string;
  name?: string;
};

// ── Zod schemas for socket event payloads ──────────────────────────

const groupIdSchema = z.object({ groupId: z.coerce.number().int().positive() });
const actingJoinSchema = z.object({ actingUserId: z.coerce.number().int().positive().optional() });

const messageSendSchema = z.object({
  toUserId: z.coerce.number().int().positive(),
  content: z.string().max(MAX_MESSAGE_LENGTH).optional(),
  contentType: z.enum(["text", "image", "video"]).default("text"),
  mediaUrl: z.string().url().max(2048).optional(),
  replyToMessageId: z.coerce.number().int().positive().optional(),
  replyPreview: z.string().max(MAX_REPLY_PREVIEW_LENGTH).optional(),
  clientId: z.string().max(64).optional(),
  clientTraceId: z.string().max(96).optional(),
  clientSentAt: z.union([z.number(), z.string()]).optional(),
  actingUserId: z.coerce.number().int().positive().optional(),
});

const groupSendSchema = z.object({
  groupId: z.coerce.number().int().positive(),
  content: z.string().max(MAX_MESSAGE_LENGTH).optional(),
  contentType: z.enum(["text", "image", "video"]).default("text"),
  mediaUrl: z.string().url().max(2048).optional(),
  replyToMessageId: z.coerce.number().int().positive().optional(),
  replyPreview: z.string().max(MAX_REPLY_PREVIEW_LENGTH).optional(),
  clientId: z.string().max(64).optional(),
  clientTraceId: z.string().max(96).optional(),
  clientSentAt: z.union([z.number(), z.string()]).optional(),
  actingUserId: z.coerce.number().int().positive().optional(),
});

const messageDeliveredSchema = z.object({ messageId: z.coerce.number().int().positive() });
const messageReadSchema = z.object({ peerUserId: z.coerce.number().int().positive() });

const typingSchema = z.object({
  toUserId: z.coerce.number().int().positive().optional(),
  groupId: z.coerce.number().int().positive().optional(),
});

// threadId is an opaque client string: a peer userId ("42") or "group:<id>".
const threadFocusSchema = z.object({ threadId: z.string().max(64).nullish() });

// Shared across every socket on this process; buckets are released on disconnect.
const socketRateLimiter = new SocketRateLimiter();

/**
 * Tell a user's DM partners that their online status changed.
 *
 * The whole point of the presence rewrite: this is O(people you talk to) — typically a handful —
 * where the old io.emit was O(every socket on the server).
 */
function emitPresenceChanged(io: SocketIOServer, userId: number, peerIds: number[], online: boolean): void {
  if (!peerIds.length) return;
  const payload = { userId, online, at: new Date().toISOString() };
  for (const peerId of peerIds) {
    io.to(`user:${peerId}`).emit("presence:changed", payload);
  }
}

// ── lastSeenAt debounce (Fix B) ────────────────────────────────────
// Mobile reconnect storms fire disconnect rapidly; batching DB writes
// prevents thundering-herd writes to the users table.
const LAST_SEEN_DEBOUNCE_MS = 5_000;
const lastSeenTimers = new Map<number, ReturnType<typeof setTimeout>>();

export function createLastSeenDebouncer(writeFn: (userId: number) => void) {
  return {
    schedule(userId: number): void {
      const existing = lastSeenTimers.get(userId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        lastSeenTimers.delete(userId);
        writeFn(userId);
      }, LAST_SEEN_DEBOUNCE_MS);
      lastSeenTimers.set(userId, timer);
    },
    cancel(userId: number): void {
      const existing = lastSeenTimers.get(userId);
      if (existing) {
        clearTimeout(existing);
        lastSeenTimers.delete(userId);
      }
    },
  };
}

// ── Reconnect storm guard (Fix E) ─────────────────────────────────
// Per-process, best-effort. Intentionally not shared across instances.
const STORM_WINDOW_MS = 30_000;
const STORM_MAX_CONNECTS = 10;
const STORM_DELAY_MS = 2_000;
const connectTimestamps = new Map<number, number[]>();

setInterval(() => {
  const now = Date.now();
  const cutoff = now - STORM_WINDOW_MS;
  for (const [uid, timestamps] of connectTimestamps) {
    const trimmed = timestamps.filter((t) => t > cutoff);
    if (trimmed.length === 0) {
      connectTimestamps.delete(uid);
    } else {
      connectTimestamps.set(uid, trimmed);
    }
  }
}, 60_000);

function recordConnect(userId: number): boolean {
  const now = Date.now();
  const cutoff = now - STORM_WINDOW_MS;
  const timestamps = (connectTimestamps.get(userId) ?? []).filter((t) => t > cutoff);
  timestamps.push(now);
  connectTimestamps.set(userId, timestamps);
  return timestamps.length > STORM_MAX_CONNECTS;
}

async function resolveUserId(payload: AuthPayload) {
  if (payload.user_id) return payload.user_id;
  if (!payload.sub) return null;
  const user = await getUserByCognitoSub(payload.sub);
  return user?.id ?? null;
}

export function initSocket(server: HttpServer) {
  // Fix A: Fail fast in production when Redis is required but missing.
  if (env.nodeEnv === "production" && env.socketRequireRedis && !process.env.REDIS_URL) {
    throw new Error(
      "SOCKET_REQUIRE_REDIS=true but REDIS_URL is not set. " +
        "Socket.IO cannot run in multi-instance mode without Redis. " +
        "Either set REDIS_URL or remove SOCKET_REQUIRE_REDIS.",
    );
  }

  const allowedOrigins = new Set<string>();
  const allowedWildcards: string[] = [];
  const addOrigin = (value?: string) => {
    if (!value) return;
    if (value === "*") {
      allowedOrigins.add("*");
      return;
    }
    if (value.includes("*")) {
      const escaped = value.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      allowedWildcards.push(escaped);
      return;
    }
    try {
      const url = new URL(value);
      allowedOrigins.add(url.origin);
    } catch {
      allowedOrigins.add(value);
    }
  };
  addOrigin(env.adminWebUrl);
  (env.corsOrigins ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .forEach(addOrigin);
  addOrigin("http://localhost:3000");
  addOrigin("http://localhost:3001");
  addOrigin("http://127.0.0.1:3000");
  addOrigin("http://127.0.0.1:3001");
  addOrigin("http://localhost:5173");
  addOrigin("http://127.0.0.1:5173");
  addOrigin("http://localhost:5174");
  addOrigin("http://127.0.0.1:5174");
  addOrigin("https://parent.phperformance.uk");

  const originAllowed = (origin: string) => {
    if (allowedOrigins.has(origin)) return true;
    return allowedWildcards.some((pattern) => new RegExp(`^${pattern}$`).test(origin));
  };

  const io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.has("*")) return callback(null, true);
        if (originAllowed(origin)) return callback(null, true);
        if (env.nodeEnv !== "production" && (origin.includes("localhost") || origin.includes("127.0.0.1"))) {
          return callback(null, true);
        }
        return callback(new Error("Origin not allowed"), false);
      },
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 20000,
    // Replay missed events on reconnect (up to 2 min disconnect).
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  // The adapter exists to sync broadcasts BETWEEN socket-carrying instances. With one dyno
  // there is no peer to sync with, so enabling it merely because REDIS_URL happens to be set
  // (it is also the BullMQ connection) costs two extra TCP connections and a Redis publish on
  // every emit — against a quota-limited Upstash database, to nobody. Opt in explicitly.
  //
  // NOTE: the adapter alone does NOT make presence correct across dynos — lib/presence.ts is a
  // per-process Set. Turning SOCKET_CLUSTER on today would give you cross-dyno rooms and
  // silently wrong presence. Redis-backed presence lands with the P1 work.
  const redis = env.socketCluster ? getRedisConnection() : null;
  if (redis) {
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();
    const socketLog = createLogger({ component: "socket" });
    let adapterEnabled = true;
    const onRedisError = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      socketLog.error({ err }, "Socket Redis adapter client error");
      if (adapterEnabled && msg.includes("max requests limit exceeded")) {
        adapterEnabled = false;
        try {
          pubClient.disconnect();
          subClient.disconnect();
        } catch {
          // noop
        }
        socketLog.warn("Socket.IO Redis adapter disabled due to Upstash max requests limit");
      }
    };
    pubClient.on("error", onRedisError);
    subClient.on("error", onRedisError);
    io.adapter(createAdapter(pubClient, subClient));
    socketLog.info("Socket.IO Redis adapter enabled for multi-instance broadcast");
  }

  setSocketServer(io);

  const log = createLogger({ component: "socket" });

  // Re-arms the TTL on the presence keys this process owns. Without it a long-idle user's key
  // expires and they silently drop offline while still connected.
  startPresenceRefresh();

  // Fix B: lastSeenAt debouncer — shared across all sockets in this process.
  const lastSeenDebouncer = createLastSeenDebouncer((userId: number) => {
    db.update(userTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(userTable.id, userId))
      .catch((err: unknown) => {
        log.warn({ err }, "Failed to update lastSeenAt");
      });
  });

  io.use(async (socket, next) => {
    try {
      const headerAuth = socket.handshake.headers?.authorization?.toString().replace("Bearer ", "");
      const cookieHeader = socket.handshake.headers?.cookie?.toString() ?? "";
      const cookieToken = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find(
          (part) =>
            part.startsWith("accessToken=") || part.startsWith("auth_token=") || part.startsWith("ph_app_session="),
        )
        ?.split("=")[1];
      const token = socket.handshake.auth?.token || headerAuth || cookieToken;
      if (!token) {
        log.warn(
          {
            ip: socket.handshake.address,
            origin: socket.handshake.headers?.origin,
          },
          "Unauthorized: missing token",
        );
        return next(new Error("Unauthorized"));
      }
      const payload = (await verifyAccessToken(token)) as AuthPayload;
      const userId = await resolveUserId(payload);
      if (!userId) {
        log.warn(
          {
            ip: socket.handshake.address,
            origin: socket.handshake.headers?.origin,
          },
          "Unauthorized: user not resolved",
        );
        return next(new Error("Unauthorized"));
      }
      socket.data.userId = userId;
      socket.data.token = token;
      socket.data.role = typeof payload.role === "string" && payload.role.trim() ? payload.role : "guardian";
      socket.data.name = typeof payload.name === "string" && payload.name.trim() ? payload.name : "User";

      if (socket.data.role === "guardian" || socket.data.name === "User") {
        try {
          const user = await getUserById(userId);
          if (user?.role) socket.data.role = user.role;
          if (user?.name) socket.data.name = user.name;
        } catch (error) {
          if (!isLikelyDatabaseConnectivityFailure(error)) throw error;
          const retryAfterSeconds = Math.max(1, Math.ceil(getDbOutageRemainingMs() / 1000));
          log.warn(
            {
              ip: socket.handshake.address,
              origin: socket.handshake.headers?.origin,
              userId,
              retryAfterSeconds,
            },
            "DB unavailable during optional profile lookup",
          );
        }
      }
      return next();
    } catch (error) {
      if (isLikelyDatabaseConnectivityFailure(error)) {
        const retryAfterSeconds = Math.max(1, Math.ceil(getDbOutageRemainingMs() / 1000));
        log.warn(
          {
            ip: socket.handshake.address,
            origin: socket.handshake.headers?.origin,
            retryAfterSeconds,
            err: error,
          },
          "Service unavailable during auth",
        );
        const serviceUnavailableError = new Error("ServiceUnavailable") as Error & {
          data?: { code: "DB_UNAVAILABLE"; retryAfterSeconds: number };
        };
        serviceUnavailableError.data = { code: "DB_UNAVAILABLE", retryAfterSeconds };
        return next(serviceUnavailableError);
      }
      log.warn(
        {
          ip: socket.handshake.address,
          origin: socket.handshake.headers?.origin,
          err: error,
        },
        "Unauthorized: token verification failed",
      );
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as number;

    // Fix E: Reconnect storm guard — delay if same user connects too rapidly.
    const isStorm = recordConnect(userId);
    if (isStorm) {
      log.warn({ userId, socketId: socket.id }, "Reconnect storm detected — throttling connection by 2 s");
      await new Promise<void>((resolve) => setTimeout(resolve, STORM_DELAY_MS));
    }

    // Fix B: Cancel any pending lastSeenAt write — user is back online.
    lastSeenDebouncer.cancel(userId);

    log.info(
      {
        userId,
        socketId: socket.id,
        transport: socket.conn.transport.name,
        recovered: socket.recovered,
      },
      "Socket connected",
    );
    socket.conn.on("upgrade", (transport) => {
      log.info({ userId, socketId: socket.id, transport: transport.name }, "Socket transport upgraded");
    });
    socket.join(`user:${userId}`);
    // Shared-inbox oversight room. Membership-based (see isSharedInboxViewer) so a team
    // manager is never in the global DM broadcast, regardless of their role string.
    if (await isSharedInboxViewer(userId, socket.data.role as string | null)) {
      socket.join("admin:all");
    }

    // ── Presence ──────────────────────────────────────────────────────────────
    //
    // Was: socket.emit("presence:snapshot", getOnlineUserIds()) — the FULL online roster of the
    // platform pushed to every client on every connect — followed by io.emit("presence:online"),
    // a broadcast to EVERY connected socket. One connect cost O(N) frames on a single-threaded
    // event loop; a morning rush of N users cost O(N²). No client even listened for those event
    // names (mobile listens for `presence:update`), so the whole thing burned CPU for nobody.
    //
    // Now: presence goes only to the people entitled to see it — this user's DM partners.
    // Both connect-time lookups run concurrently with the presence write. They are independent, and
    // reconnect storms make this the hottest path on the server — a mobile network flap replays it
    // for every client.
    const [peersResult, groupsResult] = await Promise.allSettled([
      listDirectPeerIds(userId),
      listGroupsForUser(userId),
      markOnline(userId),
    ]);

    const dmPeerIds = peersResult.status === "fulfilled" ? peersResult.value : [];
    if (peersResult.status === "rejected") {
      log.warn({ err: peersResult.reason, userId }, "Presence peer lookup failed — presence off for this socket");
    }
    socket.data.dmPeerIds = dmPeerIds;

    // Tell this client which of ITS peers are online (bounded by who they talk to, not by N).
    socket.emit("presence:sync", { online: await getOnlineSubset(dmPeerIds) });
    // Tell those peers this user came online. Bounded fan-out.
    emitPresenceChanged(io, userId, dmPeerIds, true);

    if (groupsResult.status === "fulfilled") {
      groupsResult.value.forEach((group) => socket.join(`group:${group.id}`));
    } else if (isLikelyDatabaseConnectivityFailure(groupsResult.reason)) {
      const retryAfterSeconds = Math.max(1, Math.ceil(getDbOutageRemainingMs() / 1000));
      log.warn({ userId, retryAfterSeconds }, "Group bootstrap skipped during DB outage");
    } else {
      log.warn({ err: groupsResult.reason }, "Socket group join failed");
    }

    // ── Helper: safe async handler with rate limiting, validation, error ACK ──

    function guarded<T extends z.ZodTypeAny>(event: string, schema: T, handler: (data: z.infer<T>) => Promise<void>) {
      socket.on(event, async (rawPayload: unknown) => {
        // Rate limit BEFORE parsing — a flood should not get to spend CPU on Zod.
        if (!socketRateLimiter.consume(socket.id, event)) {
          socket.emit("error:rate_limited", { event, message: "Slow down" });
          return;
        }
        const parsed = schema.safeParse(rawPayload ?? {});
        if (!parsed.success) {
          socket.emit("error:validation", { event, issues: parsed.error.issues.map((i) => i.message) });
          return;
        }
        try {
          await handler(parsed.data);
        } catch (error) {
          log.error({ err: error, event, userId }, "Socket handler error");
          socket.emit("error:server", { event, message: "Server error processing your request" });
        }
      });
    }

    guarded("group:join", groupIdSchema, async ({ groupId }) => {
      const actingUserId = (socket.data.actingUserId as number | null) ?? null;
      const ids = [userId, actingUserId].filter((value): value is number => Boolean(value) && Number.isFinite(value));
      let allowed = false;
      for (const candidateId of ids) {
        if (candidateId !== userId) {
          const { athlete } = await getGuardianAndAthlete(userId);
          if (!athlete || athlete.userId !== candidateId) continue;
        }
        if (await isGroupMember(groupId, candidateId)) {
          allowed = true;
          break;
        }
      }
      if (!allowed) return;
      socket.join(`group:${groupId}`);
    });

    socket.on("group:leave", (payload: unknown) => {
      const parsed = groupIdSchema.safeParse(payload ?? {});
      if (!parsed.success) return;
      socket.leave(`group:${parsed.data.groupId}`);
    });

    guarded("acting:join", actingJoinSchema, async ({ actingUserId: rawActingId }) => {
      if (!rawActingId || rawActingId === userId) {
        socket.data.actingUserId = null;
        socket.data.actingName = null;
        return;
      }
      const { athlete } = await getGuardianAndAthlete(userId);
      if (!athlete || athlete.userId !== rawActingId) return;
      socket.data.actingUserId = rawActingId;
      const actingUser = await getUserById(rawActingId);
      socket.data.actingName = actingUser?.name ?? null;
      socket.join(`user:${rawActingId}`);

      const actingGroups = await listGroupsForUser(rawActingId);
      actingGroups.forEach((group) => socket.join(`group:${group.id}`));
    });

    guarded("message:send", messageSendSchema, async (data) => {
      const trace = createRealtimeTrace({
        traceId: data.clientTraceId ?? data.clientId,
        clientSentAt: data.clientSentAt,
      });
      logRealtimeLatency(trace, "socket.message.receive", {
        userId,
        receiverId: data.toUserId,
        socketId: socket.id,
        transport: socket.conn.transport.name,
        hasMedia: Boolean(data.mediaUrl),
      });
      const content = data.content?.trim() ?? "";
      if (!content && !data.mediaUrl) return;
      const senderId =
        (data.actingUserId ? Number(data.actingUserId) : null) || (socket.data.actingUserId as number | null) || userId;

      if (senderId !== userId) {
        const { athlete } = await getGuardianAndAthlete(userId);
        if (!athlete || athlete.userId !== senderId) return;
      }

      try {
        logRealtimeLatency(trace, "socket.message.before_service", { senderId, receiverId: data.toUserId });
        const saved = await sendDirectMessage({
          senderId,
          receiverId: data.toUserId,
          content: content || "Attachment",
          contentType: data.contentType ?? "text",
          mediaUrl: data.mediaUrl,
          replyToMessageId: data.replyToMessageId ?? null,
          replyPreview: data.replyPreview ?? null,
          clientId: data.clientId,
          trace,
        });
        logRealtimeLatency(trace, "socket.message.after_service", { messageId: saved.id });
        if (data.clientId) {
          socket.emit("message:ack", {
            clientId: data.clientId,
            messageId: saved.id,
            status: "sent",
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "MESSAGING_DISABLED_FOR_TIER" || msg === "USER_BLOCKED") {
          socket.emit("error:blocked", {
            event: "message:send",
            clientId: data.clientId,
            code: msg,
            message:
              msg === "USER_BLOCKED"
                ? "Messaging is blocked for this conversation"
                : "Messaging is not available for your current plan",
          });
          return;
        }
        throw err;
      }
    });

    guarded("group:send", groupSendSchema, async (data) => {
      const trace = createRealtimeTrace({
        traceId: data.clientTraceId ?? data.clientId,
        clientSentAt: data.clientSentAt,
      });
      logRealtimeLatency(trace, "socket.group.receive", {
        userId,
        groupId: data.groupId,
        socketId: socket.id,
        transport: socket.conn.transport.name,
        hasMedia: Boolean(data.mediaUrl),
      });
      const content = data.content?.trim() ?? "";
      if (!content && !data.mediaUrl) return;
      const allowed = await isGroupMember(data.groupId, userId);
      if (!allowed) return;
      const senderId =
        (data.actingUserId ? Number(data.actingUserId) : null) || (socket.data.actingUserId as number | null) || userId;

      if (senderId !== userId) {
        const { athlete } = await getGuardianAndAthlete(userId);
        if (!athlete || athlete.userId !== senderId) return;
      }

      logRealtimeLatency(trace, "socket.group.before_service", { senderId, groupId: data.groupId });
      const message = await createGroupMessage({
        groupId: data.groupId,
        senderId,
        content: content || "Attachment",
        contentType: data.contentType ?? "text",
        mediaUrl: data.mediaUrl,
        replyToMessageId: data.replyToMessageId ?? null,
        replyPreview: data.replyPreview ?? null,
        clientId: data.clientId ?? null,
        trace,
      });
      logRealtimeLatency(trace, "socket.group.after_service", { messageId: message.id, groupId: data.groupId });
      if (data.clientId) {
        socket.emit("message:ack", {
          clientId: data.clientId,
          messageId: message.id,
          status: "sent",
        });
      }
    });

    guarded("message:delivered", messageDeliveredSchema, async ({ messageId }) => {
      await markConversationMessageDelivered(messageId, userId);
    });

    guarded("message:read", messageReadSchema, async ({ peerUserId }) => {
      await markConversationRead(userId, peerUserId);
    });

    // typing:* accepted ANY toUserId with no authorization — anyone could make anyone
    // else's client show "X is typing". Gate it on an existing direct conversation.
    // Cached per connection: typing is high-frequency and the DB pool has 5 slots.
    const verifiedTypingPeers = new Set<number>();
    async function canTypeTo(peerUserId: number): Promise<boolean> {
      if (verifiedTypingPeers.has(peerUserId)) return true;
      const allowed = await directConversationExists(userId, peerUserId);
      if (allowed) verifiedTypingPeers.add(peerUserId);
      return allowed;
    }

    guarded("typing:start", typingSchema, async (data) => {
      const name = (socket.data.actingName as string | null) ?? (socket.data.name as string);
      const fromUserId = (socket.data.actingUserId as number | null) ?? userId;
      if (data.toUserId) {
        if (!(await canTypeTo(data.toUserId))) return;
        io.to(`user:${data.toUserId}`).emit("typing:update", {
          fromUserId,
          name,
          isTyping: true,
          scope: "direct",
        });
      } else if (data.groupId) {
        const allowed = await isGroupMember(data.groupId, userId);
        if (!allowed) return;
        socket.to(`group:${data.groupId}`).emit("typing:update", {
          fromUserId,
          name,
          isTyping: true,
          scope: "group",
          groupId: data.groupId,
        });
      }
    });

    guarded("typing:stop", typingSchema, async (data) => {
      const name = (socket.data.actingName as string | null) ?? (socket.data.name as string);
      const fromUserId = (socket.data.actingUserId as number | null) ?? userId;
      if (data.toUserId) {
        if (!(await canTypeTo(data.toUserId))) return;
        io.to(`user:${data.toUserId}`).emit("typing:update", {
          fromUserId,
          name,
          isTyping: false,
          scope: "direct",
        });
      } else if (data.groupId) {
        const allowed = await isGroupMember(data.groupId, userId);
        if (!allowed) return;
        socket.to(`group:${data.groupId}`).emit("typing:update", {
          fromUserId,
          name,
          isTyping: false,
          scope: "group",
          groupId: data.groupId,
        });
      }
    });

    // Let the mobile tell the server which thread is currently open so push
    // notifications can be suppressed for that thread while the user is reading.
    // Was a raw socket.on: no schema, no rate limit. Routed through guarded() so an
    // unbounded string can't be parked in the presence map.
    guarded("thread:focus", threadFocusSchema, async ({ threadId }) => {
      await setActiveThread(userId, threadId?.trim() || null);
    });

    socket.on("disconnect", (reason) => {
      log.info(
        {
          userId,
          socketId: socket.id,
          reason,
          transport: socket.conn.transport.name,
        },
        "Socket disconnected",
      );
      socketRateLimiter.release(socket.id);
      void markOffline(userId);
      // Was io.emit — a broadcast to every connected socket on every disconnect. Mobile networks
      // flap constantly, so this was the other half of the O(N²) storm. Only this user's DM
      // partners are told, and only they ever needed to know.
      emitPresenceChanged(io, userId, (socket.data.dmPeerIds as number[] | undefined) ?? [], false);
      // Fix B: Debounce lastSeenAt writes to prevent DB spam during mobile
      // reconnect storms. Write fires after LAST_SEEN_DEBOUNCE_MS unless the
      // user reconnects first (reconnect handler cancels the timer).
      lastSeenDebouncer.schedule(userId);
    });
  });

  if (env.nodeEnv !== "production") {
    log.info("Socket.IO ready");
  }

  return io;
}
