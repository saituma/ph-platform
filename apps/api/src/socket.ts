import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { env } from "./config/env";
import { getDbOutageRemainingMs, isLikelyDatabaseConnectivityFailure } from "./lib/db-connectivity";
import { createLogger } from "./lib/logger";
import { verifyAccessToken } from "./lib/jwt";
import { getUserByCognitoSub, getUserById, getGuardianAndAthlete } from "./services/user.service";
import { createGroupMessage, listGroupsForUser, isGroupMember } from "./services/chat.service";
import { sendMessage, markMessageDelivered, markThreadRead } from "./services/message.service";
import { setSocketServer } from "./socket-hub";
import { db } from "./db";
import { userTable } from "./db/schema";
import { getRedisConnection } from "./jobs/connection";
import { createRealtimeTrace, logRealtimeLatency } from "./lib/realtime-latency";

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
  content: z.string().max(2000).optional(),
  contentType: z.enum(["text", "image", "video"]).default("text"),
  mediaUrl: z.string().url().max(2048).optional(),
  replyToMessageId: z.coerce.number().int().positive().optional(),
  replyPreview: z.string().max(160).optional(),
  clientId: z.string().max(64).optional(),
  clientTraceId: z.string().max(96).optional(),
  clientSentAt: z.union([z.number(), z.string()]).optional(),
  actingUserId: z.coerce.number().int().positive().optional(),
});

const groupSendSchema = z.object({
  groupId: z.coerce.number().int().positive(),
  content: z.string().max(2000).optional(),
  contentType: z.enum(["text", "image", "video"]).default("text"),
  mediaUrl: z.string().url().max(2048).optional(),
  replyToMessageId: z.coerce.number().int().positive().optional(),
  replyPreview: z.string().max(160).optional(),
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

// ── Per-user socket rate limiting ──────────────────────────────────

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "message:send": { max: 30, windowMs: 60_000 },
  "group:send": { max: 30, windowMs: 60_000 },
  "typing:start": { max: 60, windowMs: 60_000 },
  "typing:stop": { max: 60, windowMs: 60_000 },
  "message:delivered": { max: 120, windowMs: 60_000 },
  "message:read": { max: 60, windowMs: 60_000 },
  "group:join": { max: 30, windowMs: 60_000 },
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(userId: number, event: string): boolean {
  const limit = RATE_LIMITS[event];
  if (!limit) return false;
  const key = `${userId}:${event}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + limit.windowMs });
    return false;
  }
  bucket.count++;
  return bucket.count > limit.max;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now >= bucket.resetAt) rateBuckets.delete(key);
  }
}, 120_000);

async function resolveUserId(payload: AuthPayload) {
  if (payload.user_id) return payload.user_id;
  if (!payload.sub) return null;
  const user = await getUserByCognitoSub(payload.sub);
  return user?.id ?? null;
}

export function initSocket(server: HttpServer) {
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

  const redis = getRedisConnection();
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

  const onlineUsers = new Set<number>();

  const log = createLogger({ component: "socket" });

  io.use(async (socket, next) => {
    try {
      const headerAuth = socket.handshake.headers?.authorization?.toString().replace("Bearer ", "");
      const cookieHeader = socket.handshake.headers?.cookie?.toString() ?? "";
      const cookieToken = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("accessToken=") || part.startsWith("auth_token="))
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
    if (["admin", "coach", "superAdmin"].includes(socket.data.role as string)) {
      socket.join("admin:all");
    }

    // Presence: send snapshot to new socket, then delta to everyone.
    onlineUsers.add(userId);
    socket.emit("presence:snapshot", Array.from(onlineUsers));
    io.emit("presence:online", { userId });

    try {
      const groups = await listGroupsForUser(userId);
      groups.forEach((group) => socket.join(`group:${group.id}`));
    } catch (error) {
      if (isLikelyDatabaseConnectivityFailure(error)) {
        const retryAfterSeconds = Math.max(1, Math.ceil(getDbOutageRemainingMs() / 1000));
        log.warn({ userId, retryAfterSeconds }, "Group bootstrap skipped during DB outage");
      } else {
        log.warn({ err: error }, "Socket group join failed");
      }
    }

    // ── Helper: safe async handler with rate limiting, validation, error ACK ──

    function guarded<T extends z.ZodTypeAny>(event: string, schema: T, handler: (data: z.infer<T>) => Promise<void>) {
      socket.on(event, async (rawPayload: unknown) => {
        if (isRateLimited(userId, event)) {
          socket.emit("error:rate_limited", { event, message: "Too many requests, slow down" });
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
      const trace = createRealtimeTrace({ traceId: data.clientTraceId ?? data.clientId, clientSentAt: data.clientSentAt });
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
        const saved = await sendMessage({
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
        if (msg === "MESSAGING_DISABLED_FOR_TIER" || msg === "AI_COACH_REQUIRES_PREMIUM") {
          socket.emit("error:blocked", {
            event: "message:send",
            clientId: data.clientId,
            code: msg,
            message:
              msg === "AI_COACH_REQUIRES_PREMIUM"
                ? "AI Coach requires a premium plan"
                : "Messaging is not available for your current plan",
          });
          return;
        }
        throw err;
      }
    });

    guarded("group:send", groupSendSchema, async (data) => {
      const trace = createRealtimeTrace({ traceId: data.clientTraceId ?? data.clientId, clientSentAt: data.clientSentAt });
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
      await markMessageDelivered(messageId, userId);
    });

    guarded("message:read", messageReadSchema, async ({ peerUserId }) => {
      await markThreadRead(userId, peerUserId);
    });

    guarded("typing:start", typingSchema, async (data) => {
      const name = (socket.data.actingName as string | null) ?? (socket.data.name as string);
      const fromUserId = (socket.data.actingUserId as number | null) ?? userId;
      if (data.toUserId) {
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
      onlineUsers.delete(userId);
      io.emit("presence:offline", { userId });
      db.update(userTable)
        .set({ lastSeenAt: new Date() })
        .where(eq(userTable.id, userId))
        .catch((err: unknown) => {
          log.warn({ err }, "Failed to update lastSeenAt");
        });
    });
  });

  if (env.nodeEnv !== "production") {
    log.info("Socket.IO ready");
  }

  return io;
}
