import { Alert, Platform } from "react-native";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

export type StartupCheck = { name: string; ok: boolean; detail?: string };

export type StartupSelfTestResult = { allOk: boolean; checks: StartupCheck[] };

function shouldLogSelfTest(): boolean {
  return (
    __DEV__ ||
    (typeof process !== "undefined" &&
      process.env?.EXPO_PUBLIC_STARTUP_SELF_TEST === "true")
  );
}

function shouldAlertOnFailure(): boolean {
  return (
    typeof process !== "undefined" &&
    process.env?.EXPO_PUBLIC_STARTUP_SELF_TEST === "true"
  );
}

/**
 * Lightweight checks after launch: config + API reachability.
 * Does not call RevenueCat native APIs (those stay in _layout).
 *
 * - In __DEV__: logs results to console.
 * - Set EXPO_PUBLIC_STARTUP_SELF_TEST=true in EAS env for QA builds to log + optional alert on failure.
 */
export async function runStartupSelfTest(): Promise<StartupSelfTestResult> {
  const checks: StartupCheck[] = [];

  const base = getApiBaseUrl();
  checks.push({
    name: "API base URL",
    ok: Boolean(base?.length),
    detail: base || "missing — set EXPO_PUBLIC_API_BASE_URL or extra.apiBaseUrl",
  });

  if (base) {
    const url = `${base.replace(/\/$/, "")}/health`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      const res = await fetch(url, { method: "GET", signal: controller.signal });
      clearTimeout(timer);
      checks.push({
        name: "GET /api/health",
        ok: res.ok,
        detail: `HTTP ${res.status}`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      checks.push({
        name: "GET /api/health",
        ok: false,
        detail: msg,
      });
    }
  }

  const iosKey = process.env.EXPO_PUBLIC_RC_IOS_KEY?.trim() ?? "";
  const androidKey = process.env.EXPO_PUBLIC_RC_ANDROID_KEY?.trim() ?? "";
  const rcKey = Platform.OS === "ios" ? iosKey : Platform.OS === "android" ? androidKey : "";
  const rcDetail = !rcKey
    ? "not set (store IAP disabled until goog_/appl_ keys in EAS)"
    : rcKey.startsWith("test_") && !__DEV__
      ? "test_ key — native RC disabled in release (safe)"
      : `${rcKey.slice(0, 6)}… configured`;
  checks.push({ name: "RevenueCat config (info)", ok: true, detail: rcDetail });

  const allOk = checks.every((c) => c.ok);

  if (shouldLogSelfTest()) {
    console.log(
      `[StartupSelfTest] ${allOk ? "OK" : "ISSUES"}`,
      JSON.stringify({ checks }, null, 2),
    );
  }

  if (!allOk && shouldAlertOnFailure()) {
    const lines = checks
      .filter((c) => !c.ok)
      .map((c) => `• ${c.name}: ${c.detail ?? "failed"}`)
      .join("\n");
    Alert.alert("Startup self-test failed", lines || "Unknown failure", [{ text: "OK" }]);
  }

  return { allOk, checks };
}
