import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Updates from "expo-updates";

/**
 * Checks for an OTA update every time the app comes to the foreground.
 * If an update is available it is fetched and the app reloads immediately.
 * Skipped in dev mode and in Expo Go (where OTA does not apply).
 */
export function useOtaUpdater() {
  const checking = useRef(false);

  useEffect(() => {
    if (__DEV__ || Updates.isEmbeddedLaunch === false) {
      // isEmbeddedLaunch === false means we're already running an OTA — still check for newer ones.
    }
    if (__DEV__) return;

    async function checkAndApply() {
      if (checking.current) return;
      checking.current = true;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Non-fatal — default background check still runs.
      } finally {
        checking.current = false;
      }
    }

    // Check on mount (cold start).
    void checkAndApply();

    // Re-check every time the app comes back to the foreground.
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") void checkAndApply();
    });

    return () => sub.remove();
  }, []);
}
