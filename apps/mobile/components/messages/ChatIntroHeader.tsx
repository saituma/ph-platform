import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { MessageThread } from "@/types/messages";

interface Props {
  thread: MessageThread;
  isThreadLoading: boolean;
  isLoading: boolean;
  messageCount: number;
  coachingContextLabel?: string;
  statusText: string;
}

export function ChatIntroHeader({
  thread,
  isThreadLoading,
  isLoading,
  messageCount,
  coachingContextLabel,
  statusText,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const isGroup = thread.id.startsWith("group:");

  return (
    <View className="mb-6">
      {(isThreadLoading || isLoading) && (
        <View className="mb-4 rounded-[24px] border px-4 py-3 flex-row items-center justify-center bg-accent/5 border-accent/10">
          <ActivityIndicator size="small" color={colors.accent} />
          <Text className="text-[10px] font-bold font-outfit text-accent ml-2 uppercase tracking-widest">
            Loading coaching history...
          </Text>
        </View>
      )}

      <View className="overflow-hidden rounded-[32px] border px-6 py-6 bg-card" style={isDark ? Shadows.none : Shadows.sm}>
        <View className="absolute -right-10 -top-8 h-32 w-32 rounded-full bg-accent/5" />
        <View className="flex-row items-start gap-4">
          <View className="h-14 w-14 rounded-[22px] items-center justify-center bg-accent/10">
            <Feather name={isGroup ? "users" : "message-circle"} size={24} color={colors.accent} />
          </View>
          <View className="flex-1">
            <Text className="font-clash text-[20px] font-bold text-app">
              {isGroup ? "Keep everyone in sync" : "Focused coaching chat"}
            </Text>
            <Text className="mt-1.5 text-[14px] leading-6 font-outfit text-secondary">
              {isGroup ? "Share updates and clips without losing the thread." : "Send quick check-ins and clips in one calm conversation."}
            </Text>
            <View className="mt-4 self-start rounded-full px-3 py-1.5 bg-accent/5">
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.4px] text-accent">
                {statusText}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-6 flex-row flex-wrap gap-2.5">
          {[
            isGroup ? "Group thread" : "Direct chat",
            thread.responseTime ?? "Fast replies",
            coachingContextLabel ? `Athlete: ${coachingContextLabel}` : null,
            messageCount > 0 ? `${messageCount} updates` : "Fresh thread",
          ].filter(Boolean).map(tag => (
            <View key={tag} className="rounded-full px-4 py-2 bg-accent/5">
              <Text className="text-[11px] font-outfit font-semibold text-app">{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
