import { useEffect, useRef } from "react";
import { InteractionManager } from "react-native";
import { prefetchApi } from "@/lib/api";

export function useProfileSync(token: string | null, enabled: boolean, hasMessaging: boolean) {
  const lastPrefetchAt = useRef(0);

  useEffect(() => {
    if (!token || !enabled) return;
    const now = Date.now();
    if (now - lastPrefetchAt.current < 60_000) return;
    lastPrefetchAt.current = now;

    const task = InteractionManager.runAfterInteractions(() => {
      prefetchApi("/content/home", { token });
      prefetchApi("/bookings", { token });
      prefetchApi("/bookings/services", { token });
      prefetchApi("/public/plans");
      if (hasMessaging) {
        prefetchApi("/messages", { token });
      }
    });

    return () => task?.cancel?.();
  }, [enabled, hasMessaging, token]);
}
