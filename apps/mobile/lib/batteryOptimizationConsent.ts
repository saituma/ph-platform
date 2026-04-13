import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Linking, Platform } from "react-native";

const CONSENT_KEY = "ph:battery-optimization-consent:v1";

type ConsentState = "accepted" | "declined";

async function saveConsent(state: ConsentState) {
  await AsyncStorage.setItem(CONSENT_KEY, state);
}

async function openBatteryOptimizationSettings() {
  const sent = await Linking.sendIntent(
    "android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS",
  ).catch(() => false);
  if (!sent) {
    await Linking.openSettings().catch(() => null);
  }
}

export async function promptBatteryOptimizationConsentOnce(): Promise<void> {
  if (Platform.OS !== "android") return;

  const stored = await AsyncStorage.getItem(CONSENT_KEY);
  if (stored === "accepted" || stored === "declined") return;

  Alert.alert(
    "Background message reliability",
    "To receive message alerts reliably in the background, allow this app to ignore battery optimization.",
    [
      {
        text: "Not now",
        style: "cancel",
        onPress: () => {
          void saveConsent("declined");
        },
      },
      {
        text: "Allow",
        onPress: () => {
          void saveConsent("accepted");
          void openBatteryOptimizationSettings();
        },
      },
    ],
    { cancelable: true },
  );
}
