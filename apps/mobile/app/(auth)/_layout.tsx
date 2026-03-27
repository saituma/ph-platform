import { Redirect } from "expo-router";
import { Stack, Transition } from "@/components/navigation/TransitionStack";
import { useAppSelector } from "@/store/hooks";
import "../fonts.css";
import useLoadFonts from "../hooks/useLoadFonts";

export default function AuthLayout() {
  const fontsLoaded = useLoadFonts();
  const { isAuthenticated, hydrated } = useAppSelector((state) => state.user);
  const forceLogout =
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "1" ||
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "true";
  const effectiveAuth = forceLogout ? false : isAuthenticated;

  if (!hydrated || !fontsLoaded) return null;

  if (effectiveAuth) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        ...Transition.Presets.ZoomIn(),
      }}
    />
  );
}
