import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@/components/ui/theme-icons";
import React from "react";
import { ActivityIndicator, Image, Pressable, View } from "react-native";

import { MessageThread, TypingStatus } from "@/types/messages";
import { Text } from "@/components/ScaledText";


type InboxScreenProps = {
  threads: MessageThread[];
  typingStatus: TypingStatus;
  isLoading: boolean;
  openingThreadId: string | null;
  onRefresh: () => Promise<void>;
  onOpenThread: (thread: MessageThread) => void;
  backgroundSecondary: string;
  borderColor: string;
  accentLight: string;
  textSecondaryColor: string;
};

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0]?.[0] ?? "";
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function InboxScreen({
  threads,
  typingStatus,
  isLoading,
  openingThreadId,
  onRefresh,
  onOpenThread,
  backgroundSecondary,
  borderColor,
  accentLight,
  textSecondaryColor,
}: InboxScreenProps) {
  return (
    <ThemedScrollView onRefresh={onRefresh} contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="px-6 pt-6 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-1.5 rounded-full bg-accent" />
              <View>
                <Text className="text-3xl font-clash text-app">Messages</Text>
                <Text className="text-secondary font-outfit text-sm mt-1">
                  Direct coach support and updates
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-6">
          <View className="flex-row items-center rounded-2xl px-4 h-12 bg-input">
            <Feather name="search" size={18} className="text-secondary" />
            <Text className="ml-3 text-secondary font-outfit text-sm">Search messages</Text>
          </View>
        </View>
      </View>

      <View className="px-6 pb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-clash text-app">Inbox</Text>
          <View className="px-3 py-1 rounded-full bg-accent-light">
            <Text className="text-[0.6875rem] font-outfit text-accent uppercase tracking-[1.5px]">Priority</Text>
          </View>
        </View>

        <View className="gap-3">
          {isLoading
            ? [1, 2, 3, 4].map((item) => (
                <View
                  key={`skeleton-${item}`}
                  className="rounded-3xl p-4 bg-input"
                >
                  <View className="flex-row items-center">
                    <View className="h-12 w-12 rounded-2xl bg-secondary/20" />
                    <View className="flex-1 ml-4">
                      <View className="h-4 w-40 rounded-full bg-secondary/20" />
                      <View className="h-3 w-20 rounded-full bg-secondary/20 mt-2" />
                      <View className="h-3 w-full rounded-full bg-secondary/20 mt-3" />
                    </View>
                  </View>
                </View>
              ))
            : threads.map((thread, threadIndex) => {
                const typingKey = thread.id.startsWith("group:") ? thread.id : `user:${thread.id}`;
                const typing = typingStatus[typingKey];
                return (
                  <Pressable
                    key={thread.id}
                    className="rounded-3xl bg-input"
                    style={{
                      padding: 24, // Balanced premium padding
                      borderTopWidth: 1,
                      borderBottomWidth: 1,
                      borderLeftWidth: 1,
                      borderRightWidth: 1,
                      borderColor: "rgba(34,197,94,0.35)",
                    }}
                    onPress={() => onOpenThread(thread)}
                  >
                    <View className="flex-row items-start gap-4">
                      <View className="relative">
                        {thread.avatarUrl ? (
                          <View className="h-14 w-14 rounded-2xl overflow-hidden">
                            <Image source={{ uri: thread.avatarUrl }} style={{ width: 56, height: 56 }} />
                          </View>
                        ) : (
                          <View className="h-14 w-14 rounded-2xl items-center justify-center bg-accent-light">
                            <Text className="font-clash text-app text-lg">
                              {getInitials(thread.name)}
                            </Text>
                          </View>
                        )}
                        {thread.unread ? (
                          <View className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent" />
                        ) : null}
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 pr-3">
                            <Text className="font-clash text-app text-lg" numberOfLines={1}>
                              {thread.name}
                            </Text>
                            <Text className="text-sm font-outfit text-secondary mt-0.5" numberOfLines={1}>
                              {thread.role}
                            </Text>
                          </View>
                          <View className="items-end">
                            {openingThreadId === thread.id ? (
                              <ActivityIndicator size="small" color={textSecondaryColor} />
                            ) : (
                              <Text className="text-[0.75rem] font-outfit text-secondary">
                                {thread.time}
                              </Text>
                            )}
                            {thread.premium ? (
                              <View className="mt-2 flex-row items-center px-2 py-0.5 rounded-full bg-accent-light">
                                <Feather name="star" size={12} className="text-accent" />
                                <Text className="ml-1 text-[0.625rem] font-outfit text-accent uppercase tracking-[1.2px]">
                                  Premium
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        <Text className="text-sm font-outfit text-app mt-3" numberOfLines={2}>
                          {typing?.isTyping ? `${typing.name} is typing...` : thread.preview}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between mt-4">
                      <View className="flex-row items-center gap-2">
                        {thread.pinned ? (
                          <View className="flex-row items-center px-2 py-1 rounded-full bg-accent-light">
                            <Feather name="bookmark" size={12} className="text-accent" />
                            <Text className="ml-1 text-[0.625rem] font-outfit text-accent uppercase tracking-[1.2px]">
                              Pinned
                            </Text>
                          </View>
                        ) : null}
                        {thread.premium ? (
                          <View className="flex-row items-center px-2 py-1 rounded-full bg-accent-light">
                            <Feather name="zap" size={12} className="text-accent" />
                            <Text className="ml-1 text-[0.625rem] font-outfit text-accent uppercase tracking-[1.2px]">
                              Priority
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {!thread.unread ? (
                        <View className="flex-row items-center gap-1">
                          <Feather name="check-circle" size={14} className="text-secondary" />
                          <Text className="text-[0.6875rem] font-outfit text-secondary">Up to date</Text>
                        </View>
                      ) : (
                        <Text className="text-[0.8125rem] font-outfit text-accent">
                          {thread.unread}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}

          {!threads.length && !isLoading ? (
            <View className="rounded-3xl p-4 bg-input">
              <Text className="text-sm font-outfit text-secondary">No conversations yet.</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="px-6 pb-10">
        <View className="rounded-3xl p-5 bg-input">
          <Text className="text-base font-clash text-app">Need something urgent?</Text>
          <Text className="text-sm font-outfit text-secondary mt-2">
            Premium members get priority response times from your coach.
          </Text>
          <View className="mt-4 flex-row items-center gap-2">
            <View className="h-9 w-9 rounded-2xl bg-accent-light items-center justify-center">
              <Feather name="phone" size={16} className="text-accent" />
            </View>
            <Text className="text-sm font-outfit text-app">Book a 1:1 call in Schedule</Text>
          </View>
        </View>
      </View>
    </ThemedScrollView>
  );
}
