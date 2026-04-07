import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { useRouter } from "expo-router";

export function HelpFooter() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  return (
    <View
      className="mb-6 overflow-hidden rounded-[30px] border p-5"
      style={{
        backgroundColor: colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        ...(isDark ? Shadows.none : Shadows.md),
      }}
    >
      <Text className="font-clash text-2xl text-app mb-2">Still need a hand?</Text>
      <Text className="font-outfit text-sm text-secondary leading-6 mb-5">
        For the fastest support, include the athlete name, device type, and a short description of what changed right before the issue started.
      </Text>

      <ActionButton
        label="Contact Support"
        onPress={() => router.push("/feedback")}
        color="bg-accent"
        icon="message-square"
        fullWidth={true}
      />
    </View>
  );
}
