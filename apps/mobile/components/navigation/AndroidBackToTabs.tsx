import { shouldAndroidFallbackToTabs } from "@/lib/navigation/androidBackToTabs";
import { usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { BackHandler, Platform } from "react-native";

/**
 * Android: when there is no stack entry to pop, fall back from standalone
 * admin routes to the main tab shell instead of closing the app.
 *
 * Registered last so it runs first; returns false when the default navigator
 * should handle a normal pop (canGoBack true).
 */
export function AndroidBackToTabs() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (router.canGoBack()) {
        return false;
      }
      if (shouldAndroidFallbackToTabs(pathname)) {
        router.replace("/(tabs)");
        return true;
      }
      return false;
    });

    return () => sub.remove();
  }, [router, pathname]);

  return null;
}
