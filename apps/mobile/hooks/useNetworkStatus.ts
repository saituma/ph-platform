import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { apiRequest } from "@/lib/api";

const PING_INTERVAL_MS = 15_000;

/**
 * No device-level connectivity API is used here on purpose — pinging our own
 * /health endpoint answers the question that actually matters ("can the app
 * reach our server right now"), not just "is wifi/cellular associated."
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);
  const inFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await apiRequest("/health", {
          suppressLog: true,
          skipCache: true,
          forceRefresh: true,
          skipAuthRefresh: true,
          timeoutMs: 6000,
        });
        if (!cancelled) setIsOnline(true);
      } catch {
        if (!cancelled) setIsOnline(false);
      } finally {
        inFlightRef.current = false;
      }
    };

    void ping();
    const interval = setInterval(ping, PING_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void ping();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return isOnline;
}
