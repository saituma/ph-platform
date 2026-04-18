import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_BG_DEFAULT = "ph:run:bg_tracking_default:v1";
const KEY_OSRM_DEFAULT = "ph:run:osrm_routing_default:v1";
const KEY_OSRM_CONSENT = "ph:run:osrm_consent:v1";

function parseBool(raw: string | null): boolean | null {
  if (raw == null) return null;
  if (raw === "1") return true;
  if (raw === "0") return false;
  return null;
}

async function getBool(key: string): Promise<boolean | null> {
  const raw = await AsyncStorage.getItem(key);
  return parseBool(raw);
}

async function setBool(key: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key, value ? "1" : "0");
}

export type OsrmConsentState = "accepted" | "declined";

export async function getRunBackgroundTrackingDefault(): Promise<boolean> {
  const v = await getBool(KEY_BG_DEFAULT);
  return v ?? true;
}

export async function setRunBackgroundTrackingDefault(
  enabled: boolean,
): Promise<void> {
  await setBool(KEY_BG_DEFAULT, enabled);
}

export async function getOsrmRoutingDefault(): Promise<boolean> {
  const v = await getBool(KEY_OSRM_DEFAULT);
  return v ?? false;
}

export async function setOsrmRoutingDefault(enabled: boolean): Promise<void> {
  await setBool(KEY_OSRM_DEFAULT, enabled);
}

export async function getOsrmRoutingConsentState(): Promise<OsrmConsentState | null> {
  const raw = await AsyncStorage.getItem(KEY_OSRM_CONSENT);
  if (raw === "accepted" || raw === "declined") return raw;
  return null;
}

export async function setOsrmRoutingConsentState(state: OsrmConsentState): Promise<void> {
  await AsyncStorage.setItem(KEY_OSRM_CONSENT, state);
}
