import { Redirect, Stack } from "expo-router";
import { useAppSelector } from "@/store/hooks";

export default function AuthLayout() {
  const { isAuthenticated, hydrated } = useAppSelector((state) => state.user);

  if (!hydrated) return null;

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
      }}
    />
  );
}