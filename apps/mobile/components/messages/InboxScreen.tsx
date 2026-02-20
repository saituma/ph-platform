import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@/components/ui/theme-icons";
import React from "react";
import { ActivityIndicator, Image, Pressable, View } from "react-native";
import { MessageThread, TypingStatus } from "@/types/messages";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Ionicons } from "@expo/vector-icons";

type InboxScreenProps = {
  threads: MessageThread[];
  typingStatus: TypingStatus;
  isLoading: boolean;
  openingThreadId: string | null;
  onRefresh: () => Promise<void>;
  onOpenThread: (thread: MessageThread) => void;
  backgroundSecondary?: string;
  borderColor?: string;
  accentLight?: string;
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
  textSecondaryColor,
}: InboxScreenProps) {
  const { colors } = useAppTheme();

  return (
    <ThemedScrollView
      onRefresh={onRefresh}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Threads */}
      <View className="px-6">
        <View className="gap-4">
          {isLoading ? (
            [1, 2, 3].map((item) => (
              <View
                key={`skeleton-${item}`}
                className="bg-input rounded-3xl p-5 border border-gray-100 dark:border-gray-800"
              >
                <View className="flex-row items-center">
                  <View className="h-14 w-14 rounded-2xl bg-gray-200 dark:bg-gray-700" />
                  <View className="flex-1 ml-4 space-y-2.5">
                    <View className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-4/5" />
                    <View className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
                    <View className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-full" />
                  </View>
                </View>
              </View>
            ))
          ) : threads.length > 0 ? (
            threads.map((thread) => {
              const typingKey = thread.id.startsWith("group:")
                ? thread.id
                : `user:${thread.id}`;
              const typing = typingStatus[typingKey];
              const isOpening = openingThreadId === thread.id;

              return (
                <Pressable
                  key={thread.id}
                  onPress={() => onOpenThread(thread)}
                  className="bg-input rounded-3xl p-5 active:opacity-95 border border-black/5 dark:border-app/10"
                >
                  <View className="flex-row items-start gap-4">
                    {/* Avatar */}
                    <View className="relative flex-shrink-0">
                      {thread.avatarUrl ? (
                        <Image
                          source={{ uri: thread.avatarUrl }}
                          className="h-14 w-14 rounded-2xl"
                        />
                      ) : (
                        <View className="h-14 w-14 rounded-2xl bg-[#2F8F57]/10 dark:bg-[#2F8F57]/20 items-center justify-center">
                          <Text className="font-clash text-[#2F8F57] text-2xl">
                            {getInitials(thread.name)}
                          </Text>
                        </View>
                      )}

                      {/* Unread badge */}
                      {thread.unread > 0 && (
                        <View className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 rounded-full items-center justify-center border-4 border-app">
                          <Text className="text-white text-[9px] font-bold font-outfit">
                            {typeof thread.unread === "number" &&
                            thread.unread > 9
                              ? "9+"
                              : thread.unread}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Content */}
                    <View className="flex-1 pt-0.5">
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1 pr-2">
                          <Text
                            className="font-clash text-[17px] text-app"
                            numberOfLines={1}
                          >
                            {thread.name}
                          </Text>
                          <Text
                            className="text-sm font-outfit text-secondary mt-0.5"
                            numberOfLines={1}
                          >
                            {thread.role}
                          </Text>
                        </View>

                        <View className="items-end">
                          {isOpening ? (
                            <ActivityIndicator
                              size="small"
                              color={colors.accent}
                            />
                          ) : (
                            <View className="items-end gap-1.5">
                              <Text className="text-[0.6875rem] font-bold font-outfit text-secondary/60">
                                {thread.time}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Preview / Typing */}
                      <Text
                        className={`mt-2.5 text-sm leading-snug font-outfit ${
                          typing?.isTyping
                            ? "text-[#2F8F57] font-semibold"
                            : "text-secondary"
                        }`}
                        numberOfLines={1}
                      >
                        {typing?.isTyping
                          ? `${typing.name} is typing...`
                          : thread.preview}
                      </Text>

                      {/* Badges & Status */}
                      <View className="flex-row items-end justify-between mt-4">
                        <View className="flex-row items-center gap-2">
                          {thread.pinned && (
                            <View className="px-2.5 py-1 bg-amber-500/10 rounded-full flex-row items-center border border-amber-500/20">
                              <Feather
                                name="bookmark"
                                size={11}
                                color="#D97706"
                              />
                              <Text className="ml-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                                PINNED
                              </Text>
                            </View>
                          )}
                        </View>

                        {thread.premium && (
                          <View className="flex-col items-end gap-1">
                            <View className="bg-[#2F8F57] px-1.5 py-0.5 rounded shadow-sm">
                              <Text className="text-[7px] font-bold text-white uppercase tracking-tighter">
                                PRIORITY
                              </Text>
                            </View>
                            {thread.responseTime && (
                              <View className="bg-[#2F8F57]/90 px-1.5 py-0.5 rounded shadow-sm">
                                <Text className="text-[7px] font-bold text-white uppercase tracking-tighter">
                                  {thread.responseTime}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            /* Empty State */
            <View className="py-20 items-center">
              <View className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center mb-6">
                <Feather
                  name="message-circle"
                  size={42}
                  color={colors.accent}
                />
              </View>
              <Text className="text-2xl font-clash text-app mb-2">
                No messages yet
              </Text>
              <Text className="text-secondary text-center font-outfit max-w-[260px]">
                Your coach conversations will appear here
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Urgent Help Card */}
      {threads.length > 0 && (
        <View className="mx-12 mt-8 mb-10 bg-accent/5 rounded-3xl p-6">
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 bg-accent rounded-2xl items-center justify-center shadow-lg shadow-accent/20">
              <Feather name="help-circle" size={24} color="white" />
            </View>
            <View className="flex-1">
              <Text className="font-clash text-lg font-bold text-app">
                Need priority help?
              </Text>
              <Text className="text-sm text-secondary mt-0.5 leading-relaxed">
                Premium members get faster replies and 1:1 video review support.
              </Text>
            </View>
          </View>
        </View>
      )}
    </ThemedScrollView>
  );
}
