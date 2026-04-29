import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { runWhenIdle } from "@/lib/scheduling/idle";
import { useSocket } from "@/context/SocketContext";
import { useAppSelector } from "@/store/hooks";

/**
 * Drives the messaging tab badge for admin/coach roles.
 *
 * Sums unread across DM threads + group chats. Real-time updates via socket
 * events (read receipts, new messages); the 60s poll is a safety-net for
 * transient disconnects.
 */
export function useCoachUnreadMessaging(token: string | null, enabled: boolean) {
  const [unreadCount, setUnreadCount] = useState(0);
  const inFlightRef = useRef(false);
  const { socket } = useSocket();
  const profileId = useAppSelector((s) => s.user.profile.id ?? null);

  const syncAdminUnread = useCallback(async () => {
    if (!token || !enabled) {
      setUnreadCount(0);
      return;
    }
    // Drop overlapping calls so a flurry of socket events doesn't hammer the API.
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const [threadsRes, groupsRes] = await Promise.all([
        apiRequest<{ threads?: any[] }>("/admin/messages/threads?limit=200", {
          token,
          suppressStatusCodes: [403],
          skipCache: true,
        }),
        apiRequest<{ groups?: any[] }>("/chat/groups?limit=100", {
          token,
          suppressStatusCodes: [401, 403],
          skipCache: true,
        }),
      ]);

      const dmUnread =
        (threadsRes?.threads ?? []).reduce(
          (sum, t) => sum + (Number(t?.unread) || 0),
          0,
        ) ?? 0;
      const groupUnread =
        (groupsRes?.groups ?? []).reduce(
          (sum, g) => sum + (Number(g?.unreadCount) || 0),
          0,
        ) ?? 0;
      setUnreadCount(Math.max(0, dmUnread + groupUnread));
    } catch {
      setUnreadCount(0);
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled, token]);

  // Initial fetch + low-frequency safety-net poll.
  useEffect(() => {
    if (!token || !enabled) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    const task = runWhenIdle(() => {
      if (active) syncAdminUnread();
    });
    const timer = setInterval(() => {
      if (active) syncAdminUnread();
    }, 60000);

    return () => {
      active = false;
      clearInterval(timer);
      task?.cancel?.();
    };
  }, [enabled, syncAdminUnread, token]);

  // Real-time updates via socket events.
  useEffect(() => {
    if (!socket || !enabled || profileId == null) return;
    const myId = String(profileId);

    const handleMessageNew = (payload: any) => {
      const senderId = String(payload?.senderId ?? "");
      if (!senderId || senderId === myId) return;
      const receiverId = String(payload?.receiverId ?? "");
      if (receiverId !== myId) return;
      setUnreadCount((c) => c + 1);
    };

    const handleGroupMessage = (payload: any) => {
      const senderId = String(payload?.senderId ?? "");
      if (!senderId || senderId === myId) return;
      setUnreadCount((c) => c + 1);
    };

    const handleMessageRead = (payload: any) => {
      const readerUserId = String(payload?.readerUserId ?? "");
      if (readerUserId !== myId) return;
      void syncAdminUnread();
    };

    const handleGroupRead = (payload: any) => {
      const readerUserId = String(payload?.readerUserId ?? "");
      if (readerUserId !== myId) return;
      void syncAdminUnread();
    };

    socket.on("message:new", handleMessageNew);
    socket.on("group:message", handleGroupMessage);
    socket.on("message:read", handleMessageRead);
    socket.on("group:read", handleGroupRead);

    return () => {
      socket.off("message:new", handleMessageNew);
      socket.off("group:message", handleGroupMessage);
      socket.off("message:read", handleMessageRead);
      socket.off("group:read", handleGroupRead);
    };
  }, [socket, enabled, profileId, syncAdminUnread]);

  return { unreadCount, setUnreadCount, syncAdminUnread };
}
