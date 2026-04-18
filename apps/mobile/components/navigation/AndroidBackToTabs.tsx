import { shouldAndroidFallbackToTabs } from "@/lib/navigation/androidBackToTabs";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
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
  const routerRef = useRef(router);
  routerRef.current = router;
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const r = routerRef.current;
      if (r.canGoBack()) {
        return false;
      }
      if (shouldAndroidFallbackToTabs(pathname)) {
        // Home route; `(tabs)` group is not part of the public path.
        r.replace("/");
        return true;
      }
      return false;
    });

    return () => sub.remove();
  }, [pathname]);

  return null;
}
