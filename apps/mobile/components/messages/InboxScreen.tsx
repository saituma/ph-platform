import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@/components/ui/theme-icons";
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { MessageThread, TypingStatus } from "@/types/messages";

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
          <View>
            <Text className="text-3xl font-clash text-app">Messages</Text>
            <Text className="text-secondary font-outfit text-sm mt-1">Direct coach support and updates</Text>
          </View>
          <View className="h-11 w-11 rounded-2xl bg-secondary/10 items-center justify-center border border-app/10">
            <Feather name="bell" size={18} className="text-secondary" />
          </View>
        </View>

        <View className="mt-6">
          <View
            className="flex-row items-center rounded-2xl border px-4 h-12"
            style={{ backgroundColor: backgroundSecondary, borderColor }}
          >
            <Feather name="search" size={18} className="text-secondary" />
            <Text className="ml-3 text-secondary font-outfit text-sm">Search messages</Text>
          </View>
        </View>
      </View>

      <View className="px-6 pb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-clash text-app">Inbox</Text>
          <View className="px-3 py-1 rounded-full bg-secondary/10 border border-app/10">
            <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.5px]">Priority</Text>
          </View>
        </View>

        <View className="gap-3">
          {isLoading
            ? [1, 2, 3, 4].map((item) => (
                <View
                  key={`skeleton-${item}`}
                  className="rounded-3xl border p-4"
                  style={{ backgroundColor: backgroundSecondary, borderColor }}
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
            : threads.map((thread) => {
                const typingKey = thread.id.startsWith("group:") ? thread.id : `user:${thread.id}`;
                const typing = typingStatus[typingKey];
                return (
                  <Pressable
                    key={thread.id}
                    className="rounded-3xl border p-4"
                    style={{ backgroundColor: backgroundSecondary, borderColor }}
                    onPress={() => onOpenThread(thread)}
                  >
                    <View className="flex-row items-center">
                      <View
                        className="h-12 w-12 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: accentLight, borderWidth: 1, borderColor }}
                      >
                        <Text className="font-clash text-app text-base">{getInitials(thread.name)}</Text>
                      </View>

                      <View className="flex-1 ml-4">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <Text className="font-clash text-app text-base">{thread.name}</Text>
                            {thread.premium ? (
                              <View className="flex-row items-center px-2 py-0.5 rounded-full border border-app/10 bg-secondary/10">
                                <Feather name="star" size={12} className="text-accent" />
                                <Text className="ml-1 text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                                  Premium
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <View className="flex-row items-center gap-2">
                            {openingThreadId === thread.id ? (
                              <ActivityIndicator size="small" color={textSecondaryColor} />
                            ) : null}
                            <Text className="text-[11px] font-outfit text-secondary">{thread.time}</Text>
                          </View>
                        </View>
                        <Text className="text-[12px] font-outfit text-secondary mt-0.5">{thread.role}</Text>
                        <Text className="text-sm font-outfit text-app mt-2" numberOfLines={2}>
                          {typing?.isTyping ? `${typing.name} is typing...` : thread.preview}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between mt-4">
                      <View className="flex-row items-center gap-2">
                        {thread.pinned ? (
                          <View className="flex-row items-center px-2 py-1 rounded-full bg-secondary/10 border border-app/10">
                            <Feather name="bookmark" size={12} className="text-secondary" />
                            <Text className="ml-1 text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                              Pinned
                            </Text>
                          </View>
                        ) : null}
                        {thread.premium ? (
                          <View className="flex-row items-center px-2 py-1 rounded-full bg-secondary/10 border border-app/10">
                            <Feather name="zap" size={12} className="text-secondary" />
                            <Text className="ml-1 text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                              Priority
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {thread.unread ? (
                        <View className="px-2.5 py-1 rounded-full bg-accent">
                          <Text className="text-[11px] font-outfit text-white">{thread.unread} new</Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center gap-1">
                          <Feather name="check-circle" size={14} className="text-secondary" />
                          <Text className="text-[11px] font-outfit text-secondary">Up to date</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}

          {!threads.length && !isLoading ? (
            <View className="rounded-3xl border border-dashed border-app/20 p-4">
              <Text className="text-sm font-outfit text-secondary">No conversations yet.</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="px-6 pb-10">
        <View className="rounded-3xl border p-5 bg-input">
          <Text className="text-base font-clash text-app">Need something urgent?</Text>
          <Text className="text-sm font-outfit text-secondary mt-2">
            Premium members get priority response times from your coach.
          </Text>
          <View className="mt-4 flex-row items-center gap-2">
            <View className="h-9 w-9 rounded-2xl bg-secondary/10 items-center justify-center border border-app/10">
              <Feather name="phone" size={16} className="text-secondary" />
            </View>
            <Text className="text-sm font-outfit text-app">Book a 1:1 call in Schedule</Text>
          </View>
        </View>
      </View>
    </ThemedScrollView>
  );
}
