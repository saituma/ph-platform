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

export function ThreadHeader({ thread, onBack }: ThreadHeaderProps) {
  const { colors, isDark } = useAppTheme();
  const headerBg = colors.accent;
  const headerBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";

  return (
    <View className="px-5 pt-3 pb-4 border-b" style={{ backgroundColor: headerBg, borderColor: headerBorder }}>
      <View className="flex-row items-center">
        <Pressable
          onPress={onBack}
          className="h-9 w-9 rounded-full items-center justify-center active:opacity-80"
        >
          <Feather name="chevron-left" size={22} color="#FFFFFF" />
        </Pressable>

        <View className="flex-row items-center gap-3 ml-1 flex-1">
          {thread.avatarUrl ? (
            <View className="h-9 w-9 rounded-full overflow-hidden border border-white/30">
              <Image
                source={{ uri: thread.avatarUrl }}
                className="h-full w-full"
                resizeMode="cover"
              />
            </View>
          ) : (
            <View className="h-9 w-9 rounded-full bg-white/20 items-center justify-center border border-white/30">
              <Text className="text-white font-clash text-base font-bold">
                {thread.name.charAt(0)}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="font-clash text-[16px] font-bold text-white" numberOfLines={1}>
              {thread.name}
            </Text>
            <Text className="text-[11px] font-outfit text-white" numberOfLines={1}>
              {thread.responseTime ?? "Typically replies quickly"}
            </Text>
          </View>
        </View>

        <View className="h-9 w-9" />
      </View>
    </View>
  );
}
