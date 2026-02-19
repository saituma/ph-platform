import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";

import { apiRequest } from "./api";

const LOCATION_LAST_SENT_KEY = "locationLastSentDate";
const LOCATION_CONSENT_KEY = "locationConsentStatus";

const getTodayKey = () => new Date().toISOString().slice(0, 10);

export async function sendDailyLocation(token: string, options?: { force?: boolean }) {
  try {
    const today = getTodayKey();
    const lastSent = await SecureStore.getItemAsync(LOCATION_LAST_SENT_KEY);
    if (!options?.force && lastSent === today) return;

    const consent = await SecureStore.getItemAsync(LOCATION_CONSENT_KEY);
    if (consent === "denied") return;

    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      if (!consent) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
    }

    if (permission.status !== "granted") {
      await SecureStore.setItemAsync(LOCATION_CONSENT_KEY, "denied");
      return;
    }

    await SecureStore.setItemAsync(LOCATION_CONSENT_KEY, "granted");

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    await apiRequest("/location", {
      method: "POST",
      token,
      body: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ? Math.round(position.coords.accuracy) : undefined,
      },
      suppressLog: true,
      suppressStatusCodes: [401, 403],
    });

    await SecureStore.setItemAsync(LOCATION_LAST_SENT_KEY, today);
  } catch (error) {
    console.warn("Location update failed", error);
  }
}

export async function resetLocationConsent() {
  await SecureStore.deleteItemAsync(LOCATION_CONSENT_KEY);
  await SecureStore.deleteItemAsync(LOCATION_LAST_SENT_KEY);
}
