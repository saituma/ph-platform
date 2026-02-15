import { Feather } from "@/components/ui/theme-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { MessageThread } from "@/types/messages";

type ThreadHeaderProps = {
  thread: MessageThread;
  onBack: () => void;
};

export function ThreadHeader({ thread, onBack }: ThreadHeaderProps) {
  return (
    <View className="px-6 pt-4 pb-4 border-b border-app/10 bg-app">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onBack}
          className="h-11 w-11 rounded-2xl items-center justify-center border border-app/10 bg-secondary/10"
        >
          <Feather name="chevron-left" size={20} className="text-secondary" />
        </Pressable>

        <View className="flex-1 mx-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="font-clash text-lg text-app">{thread.name}</Text>
              <Text className="text-xs font-outfit text-secondary mt-0.5">
                {thread.role} · {thread.lastSeen ?? "Active recently"}
              </Text>
            </View>
            {thread.premium ? (
              <View className="flex-row items-center px-2 py-1 rounded-full bg-secondary/10 border border-app/10">
                <Feather name="star" size={12} className="text-accent" />
                <Text className="ml-1 text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                  Premium
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Pressable className="h-11 w-11 rounded-2xl items-center justify-center border border-app/10 bg-secondary/10">
          <Feather name="more-vertical" size={18} className="text-secondary" />
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
          <Feather name="shield" size={12} className="text-secondary" />
          <Text className="text-xs font-outfit text-secondary">Secure 1:1 thread</Text>
        </View>
      </View>
    </View>
  );
}
