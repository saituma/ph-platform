import * as Sentry from "@sentry/react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function initSentry() {
  if (!dsn) {
    if (__DEV__) console.warn("[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — skipping init");
    return;
  }
  if (isExpoGo) return;

  Sentry.init({
    dsn,
    debug: __DEV__,
    enableNative: true,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.2,
    attachStacktrace: true,
    environment: __DEV__ ? "development" : "production",
    release: `${Constants.expoConfig?.name ?? "mobile"}@${Constants.expoConfig?.version ?? "0.0.0"}+${Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? "0"}`,
  });

  Sentry.addBreadcrumb({ category: "lifecycle", message: "Sentry initialized", level: "info" });
}

export { Sentry };
