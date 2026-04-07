import React from "react";
import { View } from "react-native";
import { Feather } from "@/components/ui/theme-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

export function SectionHeader({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: any;
}) {
  const { colors } = useAppTheme();
  return (
    <View className="flex-row items-center gap-4 mb-6">
      <View className="w-12 h-12 bg-secondary/10 rounded-2xl items-center justify-center">
        <Feather name={icon} size={20} color={colors.text} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-3 mb-1">
          <View className="h-4 w-1 rounded-full bg-accent" />
          <Text className="text-lg font-bold font-clash text-app leading-tight">
            {title}
          </Text>
        </View>
        <Text className="text-secondary font-outfit text-xs">{subtitle}</Text>
      </View>
    </View>
  );
}
