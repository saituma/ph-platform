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
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="active-run"
        options={{
          presentation: "fullScreenModal",
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="summary"
        options={{
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="feedback"
        options={{
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
