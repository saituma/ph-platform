import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Updates from "expo-updates";

/**
 * Keeps the OTA bundle fresh. On cold start an available update is fetched and applied
 * seamlessly (before the user has engaged). While the app is already open we only fetch
 * it and leave it pending, so `UpdateBanner` (via `useUpdates().isUpdatePending`) can offer
 * a tap-to-apply instead of yanking the user out mid-action.
 * Skipped in dev mode and in Expo Go (where OTA does not apply).
 */
export function useOtaUpdater() {
  const checking = useRef(false);

  useEffect(() => {
    if (__DEV__) return;

    async function checkAndApply(reloadIfFound: boolean) {
      if (checking.current) return;
      checking.current = true;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          if (reloadIfFound) await Updates.reloadAsync();
        }
      } catch {
        // Non-fatal — default background check still runs.
      } finally {
        checking.current = false;
      }
    }

    // Cold start: apply immediately and seamlessly.
    void checkAndApply(true);

    // Foreground while already running: fetch but leave pending for the banner.
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") void checkAndApply(false);
    });

    return () => sub.remove();
  }, []);
}
