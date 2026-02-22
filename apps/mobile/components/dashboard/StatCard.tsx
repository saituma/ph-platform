import { Feather } from "@/components/ui/theme-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ScaledText";

interface StatCardProps {
  label: string;
  value: string;
  trend: string;
  good: boolean;
  icon?: any;
  color?: string;
}

export function StatCard({
  label,
  value,
  trend,
  good,
  icon,
  color = "bg-accent",
}: StatCardProps) {
  const { isDark } = useAppTheme();
  const iconColorClass = color.replace("bg-", "text-");

  return (
    <View
      className="bg-card p-4 rounded-[20px] flex-1 min-w-[100px] relative overflow-hidden"
      style={isDark ? Shadows.none : Shadows.sm}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className={`${color}/10 p-2 rounded-xl`}>
          {icon && <Feather name={icon} size={16} className={iconColorClass} />}
        </View>
        <View
          className={`px-2 py-0.5 rounded-lg ${
            good ? "bg-success-soft" : "bg-danger-soft"
          }`}
        >
          <Text
            className={`text-[0.625rem] font-bold ${
              good ? "text-success" : "text-danger"
            }`}
          >
            {trend}
          </Text>
        </View>
      </View>

      <Text className="text-2xl font-bold font-clash text-app mb-0.5">
        {value}
      </Text>
      <Text className="text-muted text-[0.625rem] font-outfit uppercase tracking-wider">
        {label}
      </Text>
      <View
        className={`absolute -right-2 -bottom-2 w-12 h-12 ${color}/5 rounded-full`}
      />
    </View>
  );
}