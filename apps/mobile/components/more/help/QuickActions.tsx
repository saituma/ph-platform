import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { useRouter } from "expo-router";
import { QUICK_ACTIONS } from "./constants";

export function QuickActions() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  return (
    <View className="mb-8 gap-3">
      {QUICK_ACTIONS.map((action) => (
        <TouchableOpacity
          key={action.id}
          onPress={() => router.push(action.route as never)}
          className="flex-row items-center rounded-[26px] border p-4"
          style={{
            backgroundColor: colors.card,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.sm),
          }}
          activeOpacity={0.9}
        >
          <View
            className="mr-4 h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.accentLight }}
          >
            <Feather name={action.icon} size={20} color={colors.accent} />
          </View>

          <View className="flex-1">
            <Text className="font-clash text-lg text-app mb-1">{action.label}</Text>
            <Text className="font-outfit text-sm text-secondary leading-5">{action.description}</Text>
          </View>

          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
