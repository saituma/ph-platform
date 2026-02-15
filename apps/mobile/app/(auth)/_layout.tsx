import { Redirect, Stack } from "expo-router";
import { useAppSelector } from "@/store/hooks";

export default function AuthLayout() {
  const { isAuthenticated } = useAppSelector((state) => state.user);

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
