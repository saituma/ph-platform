import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AdminContentScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView>
        <View className="pt-6 mb-4">
          <View className="flex-row items-center gap-3 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <View className="flex-1">
              <Text
                className="text-4xl font-telma-bold text-app tracking-tight"
                numberOfLines={1}
              >
                Content
              </Text>
              <Text
                className="text-[12px] font-outfit text-secondary"
                numberOfLines={1}
              >
                Programs, exercises, training content admin
              </Text>
            </View>
          </View>
        </View>

        <View
          className="rounded-[28px] border p-5"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          <Text className="text-sm font-outfit text-secondary">
            This tab will host admin tools for Programs, Exercises, and Training
            Content v2. Next iteration: add list/detail screens backed by
            `/admin/programs`, `/admin/exercises`, and
            `/training-content-v2/admin/*`.
          </Text>
        </View>
      </ThemedScrollView>
    </View>
  );
}
