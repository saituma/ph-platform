import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector } from "@/store/hooks";
import { getNotifications } from "@/lib/notifications";

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
  const { token, profile } = useAppSelector((state) => state.user);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
    const socketUrl = baseUrl ? baseUrl.replace(/\/api\/?$/, "") : "";
    if (!socketUrl) return;

    if (socketRef.current) return;

    const newSocket: Socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    newSocket.on("connect", () => {
      console.log("[Socket] Global connected");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("[Socket] Global disconnected");
      setIsConnected(false);
    });

    newSocket.on("message:new", async (payload: any) => {
      const selfId = String(profile.id ?? "");
      const senderId = String(payload.senderId);
      const receiverId = String(payload.receiverId);
      const threadId = senderId === selfId ? receiverId : senderId;

      // Skip notification if we are the sender OR if we are currently looking at this thread
      if (senderId === selfId || threadId === activeThreadIdRef.current) {
        return;
      }

      const Notifications = await getNotifications();
      if (Notifications && typeof Notifications.scheduleNotificationAsync === "function") {
        const isResponseVideo = payload.contentType === "video" && Number.isFinite(payload.videoUploadId);
        const notificationTitle = isResponseVideo ? "Coach response video" : "New message";
        const notificationBody = isResponseVideo
          ? "Your coach sent a response video."
          : payload.content ?? "You received a new message";

        Notifications.scheduleNotificationAsync({
          content: {
            title: notificationTitle,
            body: notificationBody,
            sound: "default",
            categoryIdentifier: "messages",
            data: { threadId: String(threadId) },
          },
          trigger: null,
        });
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [token, profile.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, setActiveThreadId }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
