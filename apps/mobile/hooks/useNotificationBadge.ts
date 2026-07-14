import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { apiRequest } from "@/lib/api";

export function useNotificationBadge(token: string | null) {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: queryKeys.notifications.all(token),
    queryFn: async () => {
      const result = await apiRequest<{ items: Array<{ read?: boolean }> }>(
        "/notifications?limit=200&offset=0",
        { token: token!, suppressLog: true },
      );
      if (!result?.items) return 0;
      return result.items.filter((n) => !n.read).length;
    },
    enabled: !!token,
    staleTime: 60 * 1000,
  });

  return unreadCount;
}
