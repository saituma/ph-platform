import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import { env } from "./config/env";
import { verifyAccessToken } from "./lib/jwt";
import { getUserByCognitoSub, getUserById, getGuardianAndAthlete } from "./services/user.service";
import { createGroupMessage, listGroupsForUser, isGroupMember } from "./services/chat.service";
import { sendMessage } from "./services/message.service";
import { setSocketServer } from "./socket-hub";

type AuthPayload = {
  sub?: string;
  user_id?: number;
};

async function resolveUserId(payload: AuthPayload) {
  if (payload.user_id) return payload.user_id;
  if (!payload.sub) return null;
  const user = await getUserByCognitoSub(payload.sub);
  return user?.id ?? null;
}

export function initSocket(server: HttpServer) {
  const allowedOrigins = new Set<string>();
  const addOrigin = (value?: string) => {
    if (!value) return;
    if (value === "*") {
      allowedOrigins.add("*");
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

  const io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.has("*")) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error("Origin not allowed"), false);
      },
      credentials: true,
    },
    // More tolerant heartbeats for flaky networks / proxies.
    pingInterval: 25000,
    pingTimeout: 60000,
  });
  setSocketServer(io);
  const onlineUsers = new Set<number>();

  const broadcastPresence = () => {
    io.emit("presence:update", Array.from(onlineUsers));
  };

  io.use(async (socket, next) => {
    try {
      const headerAuth = socket.handshake.headers?.authorization?.toString().replace("Bearer ", "");
      const cookieHeader = socket.handshake.headers?.cookie?.toString() ?? "";
      const cookieToken = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("accessToken="))
        ?.split("=")[1];
      const token = socket.handshake.auth?.token || headerAuth || cookieToken;
      if (!token) {
        console.warn("[Socket] Unauthorized: missing token", {
          ip: socket.handshake.address,
          origin: socket.handshake.headers?.origin,
        });
        return next(new Error("Unauthorized"));
      }
      const payload = (await verifyAccessToken(token)) as AuthPayload;
      const userId = await resolveUserId(payload);
      if (!userId) {
        console.warn("[Socket] Unauthorized: user not resolved", {
          ip: socket.handshake.address,
          origin: socket.handshake.headers?.origin,
        });
        return next(new Error("Unauthorized"));
      }
      socket.data.userId = userId;
      socket.data.token = token;
      const user = await getUserById(userId);
      socket.data.role = user?.role ?? "guardian";
      socket.data.name = user?.name ?? "User";
      return next();
    } catch (error) {
      console.warn("[Socket] Unauthorized: token verification failed", {
        ip: socket.handshake.address,
        origin: socket.handshake.headers?.origin,
        error: error instanceof Error ? error.message : String(error),
      });
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as number;
    socket.join(`user:${userId}`);
    if (["admin", "coach", "superAdmin"].includes(socket.data.role as string)) {
      console.log(`[Socket] User ${userId} (${socket.data.role}) joined admin:all`);
      socket.join("admin:all");
    }
    onlineUsers.add(userId);
    broadcastPresence();

    try {
      const groups = await listGroupsForUser(userId);
      groups.forEach((group) => socket.join(`group:${group.id}`));
    } catch (error) {
      console.warn("Socket group join failed", error);
    }

    socket.on("acting:join", async (payload: { actingUserId?: number }) => {
      const actingUserId = payload?.actingUserId ? Number(payload.actingUserId) : null;
      if (!actingUserId || actingUserId === userId) {
        socket.data.actingUserId = null;
        socket.data.actingName = null;
        return;
      }
      const { athlete } = await getGuardianAndAthlete(userId);
      if (!athlete || athlete.userId !== actingUserId) return;
      socket.data.actingUserId = actingUserId;
      const actingUser = await getUserById(actingUserId);
      socket.data.actingName = actingUser?.name ?? null;
      socket.join(`user:${actingUserId}`);
    });

    socket.on(
      "message:send",
      async (payload: {
        toUserId: number;
        content?: string;
        contentType?: "text" | "image" | "video";
        mediaUrl?: string;
        clientId?: string;
        actingUserId?: number;
      }) => {
      const content = payload?.content?.trim() ?? "";
      if (!payload?.toUserId || (!content && !payload.mediaUrl)) return;
      const senderId = (payload.actingUserId ? Number(payload.actingUserId) : null) || (socket.data.actingUserId as number | null) || userId;
      
      // Safety check: ensure the actual user is allowed to act as this athlete
      if (senderId !== userId) {
        const { athlete } = await getGuardianAndAthlete(userId);
        if (!athlete || athlete.userId !== senderId) {
          return; // Not authorized to act as this user
        }
      }

      await sendMessage({
        senderId,
        receiverId: payload.toUserId,
        content: content || "Attachment",
        contentType: payload.contentType ?? "text",
        mediaUrl: payload.mediaUrl,
        clientId: payload.clientId,
      });
    });

    socket.on(
      "group:send",
      async (payload: {
        groupId: number;
        content?: string;
        contentType?: "text" | "image" | "video";
        mediaUrl?: string;
        clientId?: string;
        actingUserId?: number;
      }) => {
      const content = payload?.content?.trim() ?? "";
      if (!payload?.groupId || (!content && !payload.mediaUrl)) return;
      const allowed = await isGroupMember(payload.groupId, userId);
      if (!allowed) return;
      const senderId = (payload.actingUserId ? Number(payload.actingUserId) : null) || (socket.data.actingUserId as number | null) || userId;

      // Safety check
      if (senderId !== userId) {
        const { athlete } = await getGuardianAndAthlete(userId);
        if (!athlete || athlete.userId !== senderId) {
          return;
        }
      }

      const message = await createGroupMessage({
        groupId: payload.groupId,
        senderId,
        content: content || "Attachment",
        contentType: payload.contentType ?? "text",
        mediaUrl: payload.mediaUrl,
      });
      const enriched = { ...message, clientId: payload.clientId };
      io.to(`group:${payload.groupId}`).emit("group:message", enriched);
    });

    socket.on("typing:start", async (payload: { toUserId?: number; groupId?: number }) => {
      const name = (socket.data.actingName as string | null) ?? (socket.data.name as string);
      const fromUserId = (socket.data.actingUserId as number | null) ?? userId;
      if (payload?.toUserId) {
        io.to(`user:${payload.toUserId}`).emit("typing:update", {
          fromUserId,
          name,
          isTyping: true,
          scope: "direct",
        });
      } else if (payload?.groupId) {
        const allowed = await isGroupMember(payload.groupId, userId);
        if (!allowed) return;
        socket.to(`group:${payload.groupId}`).emit("typing:update", {
          fromUserId,
          name,
          isTyping: true,
          scope: "group",
          groupId: payload.groupId,
        });
      }
    });

    socket.on("typing:stop", async (payload: { toUserId?: number; groupId?: number }) => {
      const name = (socket.data.actingName as string | null) ?? (socket.data.name as string);
      const fromUserId = (socket.data.actingUserId as number | null) ?? userId;
      if (payload?.toUserId) {
        io.to(`user:${payload.toUserId}`).emit("typing:update", {
          fromUserId,
          name,
          isTyping: false,
          scope: "direct",
        });
      } else if (payload?.groupId) {
        const allowed = await isGroupMember(payload.groupId, userId);
        if (!allowed) return;
        socket.to(`group:${payload.groupId}`).emit("typing:update", {
          fromUserId,
          name,
          isTyping: false,
          scope: "group",
          groupId: payload.groupId,
        });
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      broadcastPresence();
    });
  });

  if (env.nodeEnv !== "production") {
    console.log("Socket.IO ready");
  }

  return io;
}
