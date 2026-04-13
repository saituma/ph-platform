import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";

interface Props {
  stats: {
    directThreads: number;
    directUnread: number;
    groups: number;
    groupUnread: number;
    announcements: number;
    teams: number;
  };
}

export function AdminStatsSection({ stats }: Props) {
  const { colors, isDark } = useAppTheme();

  const cards = [
    { label: "DMs", value: stats.directThreads, unread: stats.directUnread },
    { label: "Groups", value: stats.groups, unread: stats.groupUnread },
    { label: "Announcements", value: stats.announcements, unread: 0 },
    { label: "Teams", value: stats.teams, unread: 0 },
  ];

  return (
    <View className="flex-row flex-wrap gap-3">
      {cards.map((c) => (
        <View
          key={c.label}
          className="flex-1 min-w-[140px] rounded-2xl border p-4"
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
          }}
        >
          <Text className="text-[12px] font-outfit text-secondary mb-1">{c.label}</Text>
          <View className="flex-row items-baseline gap-2">
            <Text className="text-[24px] font-clash font-bold text-app">{c.value}</Text>
            {c.unread > 0 && (
              <Text className="text-[12px] font-outfit-bold text-accent">
                {c.unread} unread
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
