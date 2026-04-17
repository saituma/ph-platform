import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { useAppSelector } from "@/store/hooks";
import { scheduleLocalNotification } from "@/lib/localNotifications";


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

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeThreadIdRef = useRef<string | null>(null);
  const effectiveProfileIdRef = useRef<string>("");
  const athleteUserIdRef = useRef<number | null>(null);
  const connectErrorCountRef = useRef(0);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    const effectiveProfileId = String(profile.id ?? "");
    effectiveProfileIdRef.current = effectiveProfileId;
  }, [profile.id]);

  useEffect(() => {
    const acting = athleteUserId ? Number(athleteUserId) : null;
    athleteUserIdRef.current = Number.isFinite(acting as number) && (acting as number) > 0 ? (acting as number) : null;
  }, [athleteUserId]);

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
      // Prefer polling first on native/mobile networks so chat still connects
      // when websocket upgrades are blocked by proxies or hosting layers.
      transports: ["polling", "websocket"],
      tryAllTransports: true,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 12000,
      randomizationFactor: 0.5,
      timeout: 20000,
    });

    const emitActingJoin = () => {
      const actingUserId = athleteUserIdRef.current;
      newSocket.emit("acting:join", actingUserId ? { actingUserId } : {});
    };

    newSocket.on("connect", () => {
      if (__DEV__) console.log("[Socket] Global connected");
      connectErrorCountRef.current = 0;
      setIsConnected(true);
      emitActingJoin();
    });

    newSocket.on("disconnect", (reason) => {
      if (__DEV__) console.log("[Socket] Global disconnected", reason);
      setIsConnected(false);
    });
    newSocket.on("connect_error", (error) => {
      connectErrorCountRef.current += 1;
      if (__DEV__) {
        console.log("[Socket] connect_error", {
          attempt: connectErrorCountRef.current,
          message: error?.message ?? error,
        });
      }
    });

    const onReferralUpdated = (payload: {
      content?: string;
      athleteId?: number | string;
      referralId?: number | string;
    }) => {
      void scheduleLocalNotification({
        title: "Referral update",
        body: payload?.content?.trim() || "A new referral has been shared with you.",
        data: {
          type: "physio-referral",
          screen: "physio-referral",
          url: "/physio-referral",
          athleteId: payload?.athleteId != null ? String(payload.athleteId) : undefined,
          referralId: payload?.referralId != null ? String(payload.referralId) : undefined,
        },
        channelId: "account",
      });
    };

    const onReferralDeleted = () => {
      void scheduleLocalNotification({
        title: "Referral changed",
        body: "Your referral details were updated. Tap to review.",
        data: {
          type: "physio-referral",
          screen: "physio-referral",
          url: "/physio-referral",
        },
        channelId: "account",
      });
    };

    newSocket.on("physio:referral:updated", onReferralUpdated);
    newSocket.on("physio:referral:deleted", onReferralDeleted);

    const onProgramChanged = (payload: any) => {
      void scheduleLocalNotification({
        title: "Program Update",
        body: payload?.message || "Your training program has been updated.",
        data: { type: "program", url: "/(tabs)/programs" },
        channelId: "progress",
      });
    };

    const onScheduleChanged = (payload: any) => {
      void scheduleLocalNotification({
        title: "Schedule Update",
        body: payload?.message || "A change was made to your schedule.",
        data: { type: "booking", url: "/(tabs)/schedule" },
        channelId: "schedule",
      });
    };

    newSocket.on("program:changed", onProgramChanged);
    newSocket.on("schedule:changed", onScheduleChanged);

    // Message and group chat alerts are delivered via server-side Expo push so they appear
    // in the system tray when the app is backgrounded or killed. Foreground handling uses
    // addNotificationReceivedListener in InAppNotificationsContext (no duplicate local socket notifications).

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.off("physio:referral:updated", onReferralUpdated);
      newSocket.off("physio:referral:deleted", onReferralDeleted);
      newSocket.off("program:changed", onProgramChanged);
      newSocket.off("schedule:changed", onScheduleChanged);
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  // No role-based socket room switching for guardians; messages are guardian-only.

  useEffect(() => {
    if (!socketRef.current?.connected) return;
    const acting = athleteUserId ? Number(athleteUserId) : null;
    const actingUserId = Number.isFinite(acting as number) && (acting as number) > 0 ? (acting as number) : null;
    socketRef.current.emit("acting:join", actingUserId ? { actingUserId } : {});
  }, [athleteUserId, isConnected]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, setActiveThreadId }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
