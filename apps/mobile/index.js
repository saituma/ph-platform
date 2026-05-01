// Patch: on iOS 26+ the native PushNotificationManagerIOS module is null,
// causing a fatal Invariant Violation when react-native's deprecated
// PushNotificationIOS is lazily loaded via `import *`.  Replace the getter
// with a no-op so the app doesn't crash on launch.
import { Platform, NativeModules } from "react-native";
if (Platform.OS === "ios" && !NativeModules.PushNotificationManager) {
  const RN = require("react-native");
  const desc = Object.getOwnPropertyDescriptor(RN, "PushNotificationIOS");
  if (desc && desc.get) {
    Object.defineProperty(RN, "PushNotificationIOS", {
      get: () => null,
      configurable: true,
    });
  }
}

import { initSentry } from "./lib/sentry";
initSentry();
import "expo-router/entry";
