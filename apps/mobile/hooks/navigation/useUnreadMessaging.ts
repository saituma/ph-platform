import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { runWhenIdle } from "@/lib/scheduling/idle";
import { useSocket } from "@/context/SocketContext";

/**
 * Drives the messaging tab badge.
 *
 * Why this hook exists separately from the chat screen:
 *   The badge is mounted inside the role layout (above the tab navigator), while
 *   the chat list lives inside the messages tab. They cannot share React state.
 *   So the badge listens to the same socket events the chat screen listens to,
 *   plus a low-frequency safety-net poll.
 *
 * Why polling alone (the previous implementation) was insufficient:
 *   When the user opened a thread, the chat screen marked it read locally and
 *   via the API — but this hook still showed the stale count for up to 30s
 *   until the next poll. With socket subscriptions the badge updates in real time.
 */
export function useUnreadMessaging(token: string | null, enabled: boolean, userId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const inFlightRef = useRef(false);
  const { socket } = useSocket();

  const syncUnread = useCallback(async () => {
    if (!token || !enabled || !userId) {
      setUnreadCount(0);
      return;
    }
    // Single-flight: drop overlapping calls so a flurry of socket events doesn't
    // hammer the API.
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const data = await apiRequest<{ messages: any[] }>("/messages", { token });
      const unread =
        data.messages?.filter(
          (message) => !message.read && String(message.senderId) !== String(userId),
        ).length ?? 0;
      setUnreadCount(unread);
    } catch {
      setUnreadCount(0);
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled, userId, token]);

  // Initial fetch + low-frequency safety-net poll. Real-time updates come from sockets.
  useEffect(() => {
    if (!token || !enabled) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    const task = runWhenIdle(() => {
      if (active) syncUnread();
    });
    // 60s instead of 30s — sockets do the heavy lifting; this is just a fallback
    // for missed events (transient disconnects).
    const timer = setInterval(() => {
      if (active) syncUnread();
    }, 60000);

    return () => {
      active = false;
      clearInterval(timer);
      task?.cancel?.();
    };
  }, [enabled, syncUnread, token]);

  // Real-time: react to the same socket events the chat screen listens to.
  useEffect(() => {
    if (!socket || !enabled || !userId) return;
    const myId = String(userId);

    const handleMessageNew = (payload: any) => {
      const senderId = String(payload?.senderId ?? "");
      // Only an unread bump if the message was sent BY someone else TO me.
      if (!senderId || senderId === myId) return;
      const receiverId = String(payload?.receiverId ?? "");
      if (receiverId !== myId) return;
      // Optimistic increment — avoids an API round-trip just to add 1.
      setUnreadCount((c) => c + 1);
    };

    const handleGroupMessage = (payload: any) => {
      const senderId = String(payload?.senderId ?? "");
      if (!senderId || senderId === myId) return;
      setUnreadCount((c) => c + 1);
    };

    const handleMessageRead = (payload: any) => {
      const readerUserId = String(payload?.readerUserId ?? "");
      // The server fires this event back to the reader's own sockets when they
      // mark a thread read. That's our cue to refresh the badge instantly.
      if (readerUserId !== myId) return;
      void syncUnread();
    };

    const handleGroupRead = (payload: any) => {
      const readerUserId = String(payload?.readerUserId ?? "");
      if (readerUserId !== myId) return;
      void syncUnread();
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
  }, [socket, enabled, userId, syncUnread]);

  return { unreadCount, setUnreadCount, syncUnread };
}
