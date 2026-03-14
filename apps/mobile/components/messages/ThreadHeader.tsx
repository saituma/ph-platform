import { Feather } from "@/components/ui/theme-icons";
import React from "react";
import { Image, Pressable, View } from "react-native";

import { MessageThread } from "@/types/messages";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

type ThreadHeaderProps = {
  thread: MessageThread;
  onBack: () => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function ThreadHeader({ thread, onBack }: ThreadHeaderProps) {
  const { colors, isDark } = useAppTheme();
  const headerBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)";
  const avatarBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(34,197,94,0.10)";
  const mutedPill = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.04)";
  const summaryLabel = thread.id.startsWith("group:")
    ? "Group chat"
    : thread.premium
      ? "Priority chat"
      : "Direct chat";
  const statusLine = thread.lastSeen ?? thread.responseTime ?? "Usually replies within a day";

  return (
    <View className="px-3 py-1" style={{ backgroundColor: colors.background }}>
      <View
        className="overflow-hidden rounded-[28px] border px-4 py-3"
        style={{ backgroundColor: colors.card, borderColor: headerBorder }}
      >
        <View
          className="absolute -right-8 -top-8 h-24 w-24 rounded-full"
          style={{ backgroundColor: isDark ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.08)" }}
        />
        <View
          className="absolute -bottom-8 left-10 h-20 w-20 rounded-full"
          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.03)" }}
        />

        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={onBack}
            className="h-10 w-10 rounded-2xl items-center justify-center active:opacity-80"
            style={{ backgroundColor: mutedPill }}
          >
            <Feather name="chevron-left" size={18} color={colors.text} />
          </Pressable>

          <View
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: mutedPill }}
          >
            <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.6px]" style={{ color: colors.accent }}>
              {summaryLabel}
            </Text>
          </View>
        </View>

        <View className="mt-2.5 flex-row items-center gap-3">
          {thread.avatarUrl ? (
            <View className="h-12 w-12 rounded-[18px] overflow-hidden border-2" style={{ borderColor: headerBorder }}>
              <Image
                source={{ uri: thread.avatarUrl }}
                className="h-full w-full"
                resizeMode="cover"
              />
            </View>
          ) : (
            <View
              className="h-12 w-12 rounded-[18px] items-center justify-center border-2"
              style={{ backgroundColor: avatarBg, borderColor: headerBorder }}
            >
              <Text className="font-clash text-xl font-bold" style={{ color: colors.text }}>
                {getInitials(thread.name)}
              </Text>
            </View>
          )}

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-clash text-[18px] font-bold flex-1" numberOfLines={1} style={{ color: colors.text }}>
                {thread.name}
              </Text>
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.accent }} />
            </View>
            <Text className="text-[12px] font-outfit font-medium" numberOfLines={1} style={{ color: colors.text }}>
              {statusLine}
            </Text>
          </View>
        </View>

        <View className="mt-2.5 flex-row flex-wrap gap-2">
          {thread.responseTime ? (
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: mutedPill }}>
              <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                {thread.responseTime}
              </Text>
            </View>
          ) : null}

          {thread.premium ? (
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: colors.accent }}>
              <Text className="text-[11px] font-outfit font-bold text-white">
                Premium
              </Text>
            </View>
          ) : null}

          {thread.pinned ? (
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: mutedPill }}>
              <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                Pinned thread
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
