import { Alert } from "react-native";
import {
  getOsrmRoutingConsentState,
  setOsrmRoutingConsentState,
} from "@/lib/runTrackingPreferences";

/**
 * OSRM is a third-party service. This prompt creates a clear user action + disclosure
 * before we send coordinates to `router.project-osrm.org`.
 */
export async function ensureOsrmConsentOrExplain(): Promise<boolean> {
  const existing = await getOsrmRoutingConsentState();
  if (existing === "accepted") return true;
  if (existing === "declined") return false;

  const ok = await new Promise<boolean>((resolve) => {
    Alert.alert(
      "Suggested route (OSRM)",
      "When enabled, this feature sends your start/destination location to our routing provider (OSRM) to calculate a suggested route. You can keep the live GPS trail without this.",
      [
        {
          text: "Not now",
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: "Enable",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true },
    );
  });

  await setOsrmRoutingConsentState(ok ? "accepted" : "declined");
  return ok;
}

