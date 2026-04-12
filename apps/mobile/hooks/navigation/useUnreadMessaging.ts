import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { runWhenIdle } from "@/lib/scheduling/idle";

export function useUnreadMessaging(token: string | null, enabled: boolean, userId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);

  const syncUnread = useCallback(async () => {
    if (!token || !enabled || !userId) {
      setUnreadCount(0);
      return;
    }

    try {
      const data = await apiRequest<{ messages: any[] }>("/messages", {
        token,
      });
      const unread =
        data.messages?.filter(
          (message) =>
            !message.read && String(message.senderId) !== String(userId),
        ).length ?? 0;
      setUnreadCount(unread);
    } catch {
      setUnreadCount(0);
    }
  }, [enabled, userId, token]);

  useEffect(() => {
    if (!token || !enabled) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    const task = runWhenIdle(() => {
      if (active) syncUnread();
    });
    const timer = setInterval(() => {
      if (active) syncUnread();
    }, 30000);

    return () => {
      active = false;
      clearInterval(timer);
      task?.cancel?.();
    };
  }, [enabled, syncUnread, token]);

  return { unreadCount, setUnreadCount, syncUnread };
}
