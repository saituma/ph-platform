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
import { useActingUser } from "@/hooks/useActingUser";
import { useAppDispatch } from "@/store/hooks";
import {
  socketConnected,
  socketDisconnected,
  socketConnectError,
  socketReset,
} from "@/store/slices/socketSlice";

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
  const { actingUserId, isStaff } = useActingUser();
  const dispatch = useAppDispatch();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [, setActiveThreadId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const actingUserIdRef = useRef<number | null>(null);
  const connectErrorCountRef = useRef(0);

  // Keep ref in sync so the `connect` handler always reads the latest value.
  useEffect(() => {
    actingUserIdRef.current = isStaff ? null : actingUserId;
  }, [actingUserId, isStaff]);

  // ── Socket lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      if (__DEV__) console.log("[Socket] Skipping connect: missing token");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        dispatch(socketReset());
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
      const id = actingUserIdRef.current;
      newSocket.emit("acting:join", id ? { actingUserId: id } : {});
    };

    newSocket.on("connect", () => {
      if (__DEV__) console.log("[Socket] Global connected");
      connectErrorCountRef.current = 0;
      dispatch(socketConnected());
      emitActingJoin();
    });

    newSocket.on("disconnect", (reason) => {
      if (__DEV__) console.log("[Socket] Global disconnected", reason);
      dispatch(socketDisconnected(String(reason)));
    });

    newSocket.on("connect_error", (error) => {
      connectErrorCountRef.current += 1;
      dispatch(socketConnectError());
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
        body:
          payload?.content?.trim() ||
          "A new referral has been shared with you.",
        data: {
          type: "physio-referral",
          screen: "physio-referral",
          url: "/physio-referral",
          athleteId:
            payload?.athleteId != null
              ? String(payload.athleteId)
              : undefined,
          referralId:
            payload?.referralId != null
              ? String(payload.referralId)
              : undefined,
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

    const onProgramChanged = (payload: { message?: string }) => {
      void scheduleLocalNotification({
        title: "Program Update",
        body: payload?.message || "Your training program has been updated.",
        data: { type: "program", url: "/(tabs)/programs" },
        channelId: "progress",
      });
    };

    const onScheduleChanged = (payload: { message?: string }) => {
      void scheduleLocalNotification({
        title: "Schedule Update",
        body: payload?.message || "A change was made to your schedule.",
        data: { type: "booking", url: "/(tabs)/schedule" },
        channelId: "schedule",
      });
    };

    newSocket.on("physio:referral:updated", onReferralUpdated);
    newSocket.on("physio:referral:deleted", onReferralDeleted);
    newSocket.on("program:changed", onProgramChanged);
    newSocket.on("schedule:changed", onScheduleChanged);

    // Message/group alerts delivered via server-side Expo push (system tray when backgrounded).
    // Foreground handling uses addNotificationReceivedListener in InAppNotificationsContext.

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
      dispatch(socketReset());
    };
  }, [token]);

  // Re-emit acting:join when the acting user changes after initial connect.
  // Intentionally omit connection state from React — triggering setIsConnected
  // re-renders the whole tree on every connect event, causing update-depth loops
  // in react-native-screen-transitions.
  useEffect(() => {
    if (!socketRef.current?.connected) return;
    const id = isStaff ? null : actingUserId;
    socketRef.current.emit("acting:join", id ? { actingUserId: id } : {});
  }, [actingUserId, isStaff]);

  const handleSetActiveThreadId = (id: string | null) => {
    setActiveThreadId(id);
  };

  const value = useMemo(
    () => ({
      socket,
      isConnected: socket?.connected ?? false,
      setActiveThreadId: handleSetActiveThreadId,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [socket],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
