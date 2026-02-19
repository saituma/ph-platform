import { Feather } from "@/components/ui/theme-icons";
import React from "react";
import { Image, Pressable, View, Alert } from "react-native";

import { MessageThread } from "@/types/messages";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

type ThreadHeaderProps = {
  thread: MessageThread;
  onBack: () => void;
};

export function ThreadHeader({ thread, onBack }: ThreadHeaderProps) {
  const { colors } = useAppTheme();

  const handleOpenMenu = () => {
    Alert.alert(
      "Thread Options",
      "Manage this conversation",
      [
        { text: "Mute Notifications", onPress: () => console.log("Muted") },
        { text: "Archive Thread", onPress: () => console.log("Archived") },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  return (
    <View className="px-6 pt-4 pb-4 border-b border-accent/20 bg-app">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onBack}
          className="h-11 w-11 rounded-2xl items-center justify-center bg-accent/5"
          style={{ borderWidth: 1, borderColor: `${colors.accent}33` }}
        >
          <Feather name="chevron-left" size={20} color={colors.accent} />
        </Pressable>

        <View className="flex-1 mx-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              {thread.avatarUrl ? (
                <View className="h-10 w-10 rounded-2xl overflow-hidden">
                  <Image source={{ uri: thread.avatarUrl }} style={{ width: 40, height: 40 }} />
                </View>
              ) : null}
              <View>
                <Text className="font-clash text-lg text-app">{thread.name}</Text>
                <Text className="text-xs font-outfit text-secondary mt-0.5">
                  {thread.role} · {thread.lastSeen ?? "Active recently"}
                </Text>
              </View>
            </View>
            {thread.premium ? (
              <View className="flex-row items-center px-2 py-1 rounded-full bg-accent">
                <Feather name="star" size={10} color="#FFFFFF" />
                <Text className="ml-1 text-[0.625rem] font-bold font-outfit text-white uppercase tracking-[1.2px]">
                  Premium
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Pressable 
          onPress={handleOpenMenu}
          className="h-11 w-11 rounded-2xl items-center justify-center bg-accent/5"
          style={{ borderWidth: 1, borderColor: `${colors.accent}33` }}
        >
          <Feather name="more-vertical" size={18} color={colors.accent} />
        </Pressable>
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full bg-success" />
          <Text className="text-xs font-outfit text-secondary">
            {thread.responseTime ?? "Coach replies fast"}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Feather name="shield" size={12} color={colors.accent} />
          <Text className="text-xs font-outfit text-secondary">Secure 1:1 thread</Text>
        </View>
      </View>
    </View>
  );
}
