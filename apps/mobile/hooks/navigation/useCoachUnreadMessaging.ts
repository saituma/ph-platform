import { useCallback, useEffect, useState } from "react";
import { InteractionManager } from "react-native";
import { apiRequest } from "@/lib/api";

export function useCoachUnreadMessaging(token: string | null, enabled: boolean) {
  const [unreadCount, setUnreadCount] = useState(0);

  const syncAdminUnread = useCallback(async () => {
    if (!token || !enabled) {
      setUnreadCount(0);
      return;
    }
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
    }
  }, [enabled, token]);

  useEffect(() => {
    if (!token || !enabled) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    const task = InteractionManager.runAfterInteractions(() => {
      if (active) syncAdminUnread();
    });
    const timer = setInterval(() => {
      if (active) syncAdminUnread();
    }, 30000);

    return () => {
      active = false;
      clearInterval(timer);
      task?.cancel?.();
    };
  }, [enabled, syncAdminUnread, token]);

  return { unreadCount, setUnreadCount, syncAdminUnread };
}
