import { Feather } from "@/components/ui/theme-icons";
import React from "react";
import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MessageThread } from "@/types/messages";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

type ThreadHeaderProps = {
  thread: MessageThread;
  onBack: () => void;
};

export function ThreadHeader({ thread, onBack }: ThreadHeaderProps) {
  const { colors } = useAppTheme();


  return (
    <View className="px-6 pt-2 pb-4 border-b border-app/5 bg-app shadow-sm">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onBack}
          className="h-10 w-10 rounded-2xl items-center justify-center bg-input border border-app/5 shadow-sm active:opacity-80"
        >
          <Feather name="chevron-left" size={20} color={colors.accent} />
        </Pressable>

        <View className="flex-1 ml-2 mr-4">
          <View className="flex-row items-center gap-3">
            {thread.avatarUrl ? (
              <View className="h-10 w-10 rounded-2xl overflow-hidden border border-app/5">
                <Image 
                  source={{ uri: thread.avatarUrl }} 
                  className="h-full w-full"
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View className="h-10 w-10 rounded-2xl bg-accent/10 items-center justify-center border border-accent/20">
                 <Text className="text-accent font-clash text-lg font-bold">
                   {thread.name.charAt(0)}
                 </Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="font-clash text-[17px] font-bold text-app" numberOfLines={1}>
                {thread.name}
              </Text>
            </View>
          </View>
        </View>

        <View className="h-10 w-10" />
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2 px-3 py-1 bg-success/5 rounded-full border border-success/10">
          <Feather name="clock" size={11} color="#2F8F57" />
          <Text className="text-[10px] font-bold font-outfit text-[#2F8F57] uppercase tracking-wide">
            {thread.responseTime ?? "Fast Replies"}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {thread.premium && (
            <View className="flex-row items-center px-2.5 py-1 rounded-full bg-accent border border-accent">
              <Ionicons name="star" size={10} color="#FFFFFF" />
              <Text className="ml-1 text-[9px] font-bold font-outfit text-white uppercase tracking-[1px]">
                Premium
              </Text>
            </View>
          )}
          <View className="flex-row items-center gap-1.5 px-2 py-1 bg-input rounded-full border border-app/5">
            <Feather name="shield" size={10} color={colors.accent} />
            <Text className="text-[10px] font-medium font-outfit text-secondary">Secure</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
