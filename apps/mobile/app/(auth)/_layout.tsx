import * as WebBrowser from "expo-web-browser";
import { Stack, Transition } from "../../components/navigation/TransitionStack";

// Required by expo-web-browser on Android to complete auth sessions that redirect
// back into the app via a custom scheme or universal link.
WebBrowser.maybeCompleteAuthSession();
import { ReplaceOnce } from "../../components/navigation/ReplaceOnce";
import { useAppSelector } from "../../store/hooks";
import "../fonts.css";
import useLoadFonts from "../hooks/useLoadFonts";
import { useMemo } from "react";

export default function AuthLayout() {
  const fontsLoaded = useLoadFonts();
  const { isAuthenticated, hydrated, token, profile } = useAppSelector(
    (state) => state.user,
  );
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const forceLogout =
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "1" ||
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "true";
  // Must match (tabs)/_layout: isAuthenticated alone can be true before token/profile hydrate,
  // which caused Redirect ↔ Redirect loops with the tabs layout.
  const effectiveAuth = forceLogout
    ? false
    : isAuthenticated && !!token && !!profile.id;

  const authStackScreenOptions = useMemo(
    () => ({
      ...Transition.Presets.ZoomIn(),
    }),
    [],
  );

  if (!hydrated || !fontsLoaded) return null;

  if (effectiveAuth && !bootstrapReady) {
    return null;
  }

  if (effectiveAuth) {
    return <ReplaceOnce href="/(tabs)" />;
  }

  return <Stack screenOptions={{ ...authStackScreenOptions, headerShown: false }} />;
}
