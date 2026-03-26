import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { useAppSelector } from "@/store/hooks";
import { useRole } from "@/context/RoleContext";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  setActiveThreadId: (id: string | null) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  setActiveThreadId: () => {},
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, profile, athleteUserId } = useAppSelector((state) => state.user);
  const { role } = useRole();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeThreadIdRef = useRef<string | null>(null);
  const effectiveProfileIdRef = useRef<string>("");

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    const effectiveProfileId =
      role === "Athlete" && athleteUserId
        ? String(athleteUserId)
        : String(profile.id ?? "");
    effectiveProfileIdRef.current = effectiveProfileId;
  }, [athleteUserId, profile.id, role]);

  useEffect(() => {
    if (!token) {
      if (__DEV__) console.log("[Socket] Skipping connect: missing token");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const baseUrl = getApiBaseUrl();
    const socketUrl = baseUrl ? baseUrl.replace(/\/api\/?$/, "") : "";
    if (!socketUrl) {
      if (__DEV__) console.log("[Socket] Skipping connect: missing EXPO_PUBLIC_API_BASE_URL");
      return;
    }

    if (socketRef.current) return;
    if (__DEV__) console.log("[Socket] Connecting", { socketUrl });

    const newSocket: Socket = io(socketUrl, {
      auth: { token },
      // WebSocket-only often fails on mobile networks / proxies; polling keeps chat realtime.
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 25,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    newSocket.on("connect", () => {
      if (__DEV__) console.log("[Socket] Global connected");
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      if (__DEV__) console.log("[Socket] Global disconnected", reason);
      setIsConnected(false);
    });
    newSocket.on("connect_error", (error) => {
      if (__DEV__) console.log("[Socket] connect_error", error?.message ?? error);
    });

    const scheduleRealtimeNotification = async (payload: {
      threadId: string;
      title: string;
      body: string;
      data?: Record<string, unknown>;
    }) => {
      try {
        const { getNotifications } = await import("@/lib/notifications");
        const Notifications = await getNotifications();
        if (!Notifications) return;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: payload.title,
            body: payload.body,
            data: payload.data ?? {},
            sound: "default",
          },
          trigger: null, // fire immediately
        });
      } catch (err) {
        if (__DEV__) console.warn("[Socket] Failed to schedule notification:", err);
      }
    };

    newSocket.on("message:new", async (payload: any) => {
      const selfId = effectiveProfileIdRef.current;
      const senderId = String(payload.senderId);
      const receiverId = String(payload.receiverId);
      const threadId = senderId === selfId ? receiverId : senderId;

      // Skip notification if we are the sender OR if we are currently looking at this thread
      if (senderId === selfId || threadId === activeThreadIdRef.current) {
        return;
      }

      const senderName = payload.senderName ?? "Coach";
      const isResponseVideo = payload.contentType === "video" && Number.isFinite(payload.videoUploadId);
      const previewText = typeof payload.content === "string" ? payload.content.trim() : "";
      const body = isResponseVideo
        ? "Sent a response video"
        : previewText.length
        ? previewText.slice(0, 120)
        : "Sent you a message";
      await scheduleRealtimeNotification({
        threadId: String(threadId),
        title: senderName,
        body,
        data: {
          type: "message",
          threadId: String(threadId),
          senderId,
          receiverId,
        },
      });
    });

    newSocket.on("group:message", async (payload: any) => {
      const selfId = effectiveProfileIdRef.current;
      if (!payload?.groupId || String(payload.senderId) === selfId) return;
      const threadId = `group:${payload.groupId}`;
      if (threadId === activeThreadIdRef.current) return;
      const senderName = payload.senderName ?? "Coach";
      const groupName = payload.groupName ?? "Group chat";
      const previewText = typeof payload.content === "string" ? payload.content.trim() : "";
      const body = previewText.length ? `${senderName}: ${previewText.slice(0, 110)}` : `${senderName} sent a message`;
      await scheduleRealtimeNotification({
        threadId,
        title: groupName,
        body,
        data: {
          type: "group-message",
          threadId,
          groupId: payload.groupId,
          senderId: payload.senderId,
        },
      });
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  // No role-based socket room switching for guardians; messages are guardian-only.

  return (
    <SocketContext.Provider value={{ socket, isConnected, setActiveThreadId }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
