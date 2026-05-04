import { useEffect, useRef } from "react";
import { prefetchApi } from "@/lib/api";
import { runWhenIdle } from "@/lib/scheduling/idle";

let globalLastPrefetchAt = 0;
const PREFETCH_THROTTLE_MS = 5 * 60 * 1000;

export function useProfileSync(token: string | null, enabled: boolean, hasMessaging: boolean) {
  const cancelRef = useRef<{ cancel?: () => void } | null>(null);

  useEffect(() => {
    if (!token || !enabled) return;
    const now = Date.now();
    if (now - globalLastPrefetchAt < PREFETCH_THROTTLE_MS) return;
    globalLastPrefetchAt = now;

    const task = runWhenIdle(() => {
      prefetchApi("/bookings", { token });
      prefetchApi("/bookings/services?includeLocked=true&omitWithoutBookableSlots=true", { token });
      prefetchApi("/public/plans");
      if (hasMessaging) {
        prefetchApi("/messages", { token });
      }
    }, { delayMs: 3_000 });
    cancelRef.current = task;

    return () => task?.cancel?.();
  }, [enabled, hasMessaging, token]);
}
