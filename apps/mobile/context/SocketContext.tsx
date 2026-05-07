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
import { Sentry } from "@/lib/sentry";
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
import { selectBootstrapReady } from "@/store/slices/appSlice";

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
  const bootstrapReady = useAppSelector(selectBootstrapReady);
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
    if (!token || !bootstrapReady) {
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
      return;
    }

    if (socketRef.current) return;

    const newSocket: Socket = io(socketUrl, {
      auth: { token },
      transports: ["polling", "websocket"],
      upgrade: true,
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
      connectErrorCountRef.current = 0;
      dispatch(socketConnected());
      console.info("[RealtimeLatency] mobile.socket.connect", {
        socketId: newSocket.id,
        transport: newSocket.io.engine.transport.name,
      });
      emitActingJoin();
    });

    newSocket.on("disconnect", (reason) => {
      dispatch(socketDisconnected(String(reason)));
      console.info("[RealtimeLatency] mobile.socket.disconnect", {
        reason: String(reason),
        transport: newSocket.io.engine.transport.name,
      });
    });

    newSocket.on("connect_error", (error) => {
      connectErrorCountRef.current += 1;
      dispatch(socketConnectError());
      Sentry.addBreadcrumb({ category: "socket", message: `connect_error #${connectErrorCountRef.current}`, level: "warning", data: { message: error.message } });
      console.warn("[RealtimeLatency] mobile.socket.connect_error", {
        attempts: connectErrorCountRef.current,
        message: error.message,
        transport: newSocket.io.engine.transport.name,
      });
      if (connectErrorCountRef.current >= 5) {
        Sentry.captureException(error, {
          tags: { "socket.attempts": connectErrorCountRef.current },
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

    const onNutritionFeedback = (payload: { userId?: number; logId?: number; dateKey?: string }) => {
      void scheduleLocalNotification({
        title: "Nutrition Feedback",
        body: "Your coach responded to your nutrition log.",
        data: {
          type: "nutrition_feedback",
          url: "/(tabs)/more/nutrition",
          logId: payload?.logId != null ? String(payload.logId) : undefined,
        },
        channelId: "nutrition",
      });
    };

    newSocket.on("physio:referral:updated", onReferralUpdated);
    newSocket.on("physio:referral:deleted", onReferralDeleted);
    newSocket.on("program:changed", onProgramChanged);
    newSocket.on("schedule:changed", onScheduleChanged);
    newSocket.on("nutrition:feedback:updated", onNutritionFeedback);
    newSocket.io.engine.on("upgrade", (transport) => {
      console.info("[RealtimeLatency] mobile.socket.transport_upgrade", {
        socketId: newSocket.id,
        transport: transport.name,
      });
    });

    // Message/group alerts delivered via server-side Expo push (system tray when backgrounded).
    // Foreground handling uses addNotificationReceivedListener in InAppNotificationsContext.

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.off("physio:referral:updated", onReferralUpdated);
      newSocket.off("physio:referral:deleted", onReferralDeleted);
      newSocket.off("program:changed", onProgramChanged);
      newSocket.off("schedule:changed", onScheduleChanged);
      newSocket.off("nutrition:feedback:updated", onNutritionFeedback);
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      dispatch(socketReset());
    };
  }, [token, bootstrapReady, dispatch]);

  // Re-emit acting:join when the acting user changes after initial connect.
  // Intentionally omit connection state from React — triggering setIsConnected
  // re-renders the whole tree on every connect event, causing update-depth loops
  // in the root navigation tree.
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
