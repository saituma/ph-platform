import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import { env } from "./config/env";
import { verifyAccessToken } from "./lib/jwt";
import { getUserByCognitoSub, getUserById, getGuardianAndAthlete } from "./services/user.service";
import { createDirectMessage, createGroupMessage, listGroupsForUser, isGroupMember } from "./services/chat.service";
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
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      credentials: false,
    },
  });
  setSocketServer(io);
  const onlineUsers = new Set<number>();

  const broadcastPresence = () => {
    io.emit("presence:update", Array.from(onlineUsers));
  };

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.toString().replace("Bearer ", "");
      if (!token) {
        return next(new Error("Unauthorized"));
      }
      const payload = (await verifyAccessToken(token)) as AuthPayload;
      const userId = await resolveUserId(payload);
      if (!userId) {
        return next(new Error("Unauthorized"));
      }
      socket.data.userId = userId;
      socket.data.token = token;
      const user = await getUserById(userId);
      socket.data.role = user?.role ?? "guardian";
      socket.data.name = user?.name ?? "User";
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as number;
    socket.join(`user:${userId}`);
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
      async (payload: { toUserId: number; content: string; actingUserId?: number; clientId?: string }) => {
      if (!payload?.toUserId || !payload?.content?.trim()) return;
      let senderId = (socket.data.actingUserId as number | null) ?? userId;
      if (payload.actingUserId && payload.actingUserId !== senderId) {
        const { athlete } = await getGuardianAndAthlete(userId);
        if (athlete?.userId === payload.actingUserId) {
          senderId = payload.actingUserId;
        }
      }
      const message = await createDirectMessage({
        senderId,
        receiverId: payload.toUserId,
        content: payload.content,
      });
      const enriched = { ...message, clientId: payload.clientId };
      io.to(`user:${senderId}`).emit("message:new", enriched);
      io.to(`user:${payload.toUserId}`).emit("message:new", enriched);
    });

    socket.on(
      "group:send",
      async (payload: { groupId: number; content: string; actingUserId?: number; clientId?: string }) => {
      if (!payload?.groupId || !payload?.content?.trim()) return;
      const allowed = await isGroupMember(payload.groupId, userId);
      if (!allowed) return;
      let senderId = (socket.data.actingUserId as number | null) ?? userId;
      if (payload.actingUserId && payload.actingUserId !== senderId) {
        const { athlete } = await getGuardianAndAthlete(userId);
        if (athlete?.userId === payload.actingUserId) {
          senderId = payload.actingUserId;
        }
      }
      const message = await createGroupMessage({
        groupId: payload.groupId,
        senderId,
        content: payload.content,
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
