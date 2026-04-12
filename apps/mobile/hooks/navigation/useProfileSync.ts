import { useEffect, useRef } from "react";
import { prefetchApi } from "@/lib/api";
import { runWhenIdle } from "@/lib/scheduling/idle";

export function useProfileSync(token: string | null, enabled: boolean, hasMessaging: boolean) {
  const lastPrefetchAt = useRef(0);

  useEffect(() => {
    if (!token || !enabled) return;
    const now = Date.now();
    if (now - lastPrefetchAt.current < 60_000) return;
    lastPrefetchAt.current = now;

    const task = runWhenIdle(() => {
      prefetchApi("/content/home", { token });
      prefetchApi("/bookings", { token });
      prefetchApi("/bookings/services?includeLocked=true", { token });
      prefetchApi("/public/plans");
      if (hasMessaging) {
        prefetchApi("/messages", { token });
      }
    });

    return () => task?.cancel?.();
  }, [enabled, hasMessaging, token]);
}
