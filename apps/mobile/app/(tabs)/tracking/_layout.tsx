import { Stack } from "expo-router";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

export default function TrackingLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
