import { Stack } from "expo-router";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useMemo } from "react";

export default function TrackingLayout() {
  const { colors } = useAppTheme();
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
    }),
    [colors.background],
  );
  return <Stack screenOptions={screenOptions} />;
}
