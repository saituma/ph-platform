import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { useAppSelector } from "@/store/hooks";
import { scheduleLocalNotification } from "@/lib/localNotifications";


interface SocketContextType {
  socket: Socket | null;
  /** Derived from the client instance; omitted from deps to avoid re-rendering the tree on connect/disconnect. */
  isConnected: boolean;
  setActiveThreadId: (id: string | null) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  setActiveThreadId: () => {},
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const token = useAppSelector((state) => state.user.token);
  const profileId = useAppSelector((state) => state.user.profile?.id);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const appRole = useAppSelector((state) => state.user.appRole);
  const apiUserRole = useAppSelector((state) => state.user.apiUserRole);

  const [socket, setSocket] = useState<Socket | null>(null);
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
    const effectiveProfileId = String(profileId ?? "");
    effectiveProfileIdRef.current = effectiveProfileId;
  }, [profileId]);

  useEffect(() => {
    const normalizedRole = String(apiUserRole ?? "").trim().toLowerCase();
    const isStaffRole =
      appRole === "team_manager" ||
      appRole === "coach" ||
      normalizedRole === "admin" ||
      normalizedRole === "superadmin" ||
      normalizedRole === "coach" ||
      normalizedRole === "team_coach" ||
      normalizedRole === "program_coach";
    if (isStaffRole) {
      athleteUserIdRef.current = null;
      return;
    }
    const acting = athleteUserId ? Number(athleteUserId) : null;
    athleteUserIdRef.current = Number.isFinite(acting as number) && (acting as number) > 0 ? (acting as number) : null;
  }, [apiUserRole, appRole, athleteUserId]);

  useEffect(() => {
    if (!token) {
      if (__DEV__) console.log("[Socket] Skipping connect: missing token");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
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
      emitActingJoin();
    });

    newSocket.on("disconnect", (reason) => {
      if (__DEV__) console.log("[Socket] Global disconnected", reason);
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
    };
  }, [token]);

  // No role-based socket room switching for guardians; messages are guardian-only.

  // Re-emit when acting user changes; initial connect is handled in the `connect` listener above.
  // Intentionally omit connection state from React — `setIsConnected` used to re-render the whole
  // tree on every connect and trigger update-depth loops in react-native-screen-transitions + navigator.
  useEffect(() => {
    if (!socketRef.current?.connected) return;
    const normalizedRole = String(apiUserRole ?? "").trim().toLowerCase();
    const isStaffRole =
      appRole === "team_manager" ||
      appRole === "coach" ||
      normalizedRole === "admin" ||
      normalizedRole === "superadmin" ||
      normalizedRole === "coach" ||
      normalizedRole === "team_coach" ||
      normalizedRole === "program_coach";
    if (isStaffRole) {
      socketRef.current.emit("acting:join", {});
      return;
    }
    const acting = athleteUserId ? Number(athleteUserId) : null;
    const actingUserId = Number.isFinite(acting as number) && (acting as number) > 0 ? (acting as number) : null;
    socketRef.current.emit("acting:join", actingUserId ? { actingUserId } : {});
  }, [apiUserRole, appRole, athleteUserId, socket]);

  const value = useMemo(
    () => ({
      socket,
      isConnected: socket?.connected ?? false,
      setActiveThreadId,
    }),
    [socket, setActiveThreadId],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
