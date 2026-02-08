import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@/components/ui/theme-icons";
import { ChatMessage, MESSAGES, THREADS } from "@/constants/messages";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0]?.[0] ?? "";
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function MessagesScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { thread: threadId } = useLocalSearchParams<{ thread?: string }>();
  const sortedThreads = useMemo(() => {
    return [...THREADS].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.premium && !b.premium) return -1;
      if (!a.premium && b.premium) return 1;
      return 0;
    });
  }, []);

  const activeThread = useMemo(() => {
    return THREADS.find((item) => item.id === threadId);
  }, [threadId]);

  const threadMessages = useMemo(() => {
    if (!activeThread) return [];
    return MESSAGES.filter((msg) => msg.threadId === activeThread.id);
  }, [activeThread]);

  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    setLocalMessages(threadMessages);
  }, [threadMessages]);

  const clearThread = () => {
    router.setParams({ thread: undefined });
  };

  useEffect(() => {
    if (Platform.OS !== "android") return;
    if (!activeThread) return;
    const handler = () => {
      clearThread();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => sub.remove();
  }, [activeThread]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed || !activeThread) return;
    const newMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      threadId: activeThread.id,
      from: "user",
      text: trimmed,
      time: "Now",
      status: "sent",
    };
    setLocalMessages((prev) => [...prev, newMessage]);
    setDraft("");
  };

  if (activeThread) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <View className="px-6 pt-4 pb-4 border-b border-app/10 bg-app">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={clearThread}
              className="h-11 w-11 rounded-2xl items-center justify-center border border-app/10 bg-secondary/10"
            >
              <Feather name="chevron-left" size={20} className="text-secondary" />
            </Pressable>

            <View className="flex-1 mx-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-clash text-lg text-app">
                    {activeThread.name}
                  </Text>
                  <Text className="text-xs font-outfit text-secondary mt-0.5">
                    {activeThread.role} ·{" "}
                    {activeThread.lastSeen ?? "Active recently"}
                  </Text>
                </View>
                {activeThread.premium ? (
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
              <Feather
                name="more-vertical"
                size={18}
                className="text-secondary"
              />
            </Pressable>
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full bg-success" />
              <Text className="text-xs font-outfit text-secondary">
                {activeThread.responseTime ?? "Coach replies fast"}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Feather name="shield" size={12} className="text-secondary" />
              <Text className="text-xs font-outfit text-secondary">
                Secure 1:1 thread
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center mb-6">
            <View className="px-3 py-1 rounded-full bg-secondary/10 border border-app/10">
              <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                Today
              </Text>
            </View>
          </View>

          <View className="gap-4">
            {localMessages.map((message) => {
              const isUser = message.from === "user";
              return (
                <View
                  key={message.id}
                  className={`flex-row ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser ? (
                    <View
                      className="h-9 w-9 rounded-2xl items-center justify-center mr-3 border"
                      style={{
                        backgroundColor: colors.accentLight,
                        borderColor: colors.border,
                      }}
                    >
                      <Text className="font-clash text-app text-sm">
                        {getInitials(activeThread.name)}
                      </Text>
                    </View>
                  ) : null}

                  <View
                    className={`max-w-[75%] rounded-3xl px-4 py-3 border ${
                      isUser ? "bg-accent" : "bg-input"
                    }`}
                    style={{
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      className={`text-sm font-outfit ${
                        isUser ? "text-white" : "text-app"
                      }`}
                    >
                      {message.text}
                    </Text>
                    <View className="flex-row items-center justify-end mt-2">
                      <Text
                        className={`text-[10px] font-outfit ${
                          isUser ? "text-white/70" : "text-secondary"
                        }`}
                      >
                        {message.time}
                      </Text>
                      {isUser ? (
                        <Feather
                          name="check"
                          size={12}
                          className="text-white/70 ml-2"
                        />
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View className="px-6 pt-3 border-t border-app/10 bg-app pb-6">
          <View
            className="flex-row items-center rounded-3xl border px-4 py-3"
            style={{
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            }}
          >
            <Pressable className="h-9 w-9 rounded-2xl items-center justify-center bg-secondary/10 border border-app/10">
              <Feather name="plus" size={16} className="text-secondary" />
            </Pressable>
            <TextInput
              className="flex-1 mx-3 text-sm font-outfit text-app"
              placeholder="Type your message..."
              placeholderTextColor={colors.textSecondary}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <Pressable
              onPress={handleSend}
              className="h-9 w-9 rounded-2xl items-center justify-center bg-accent"
              style={{ opacity: draft.trim() ? 1 : 0.6 }}
            >
              <Feather name="send" size={16} className="text-white" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView
        onRefresh={async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="px-6 pt-6 pb-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-3xl font-clash text-app">Messages</Text>
              <Text className="text-secondary font-outfit text-sm mt-1">
                Direct coach support and updates
              </Text>
            </View>
            <View className="h-11 w-11 rounded-2xl bg-secondary/10 items-center justify-center border border-app/10">
              <Feather name="bell" size={18} className="text-secondary" />
            </View>
          </View>

          <View className="mt-6">
            <View
              className="flex-row items-center rounded-2xl border px-4 h-12"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              }}
            >
              <Feather name="search" size={18} className="text-secondary" />
              <Text className="ml-3 text-secondary font-outfit text-sm">
                Search messages
              </Text>
            </View>
          </View>
        </View>

        <View className="px-6 pb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-clash text-app">Inbox</Text>
            <View className="flex-row items-center gap-2">
              <View className="px-3 py-1 rounded-full bg-secondary/10 border border-app/10">
                <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.5px]">
                  Priority
                </Text>
              </View>
            </View>
          </View>

          <View className="gap-3">
            {sortedThreads.map((thread) => (
              <Pressable
                key={thread.id}
                className="rounded-3xl border p-4"
                style={{
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                }}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/messages",
                    params: { thread: thread.id },
                  })
                }
              >
                <View className="flex-row items-center">
                  <View
                    className="h-12 w-12 rounded-2xl items-center justify-center"
                    style={{
                      backgroundColor: thread.premium
                        ? colors.accentLight
                        : colors.accentLight,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text className="font-clash text-app text-base">
                      {getInitials(thread.name)}
                    </Text>
                  </View>

                  <View className="flex-1 ml-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Text className="font-clash text-app text-base">
                          {thread.name}
                        </Text>
                        {thread.premium ? (
                          <View className="flex-row items-center px-2 py-0.5 rounded-full border border-app/10 bg-secondary/10">
                            <Feather
                              name="star"
                              size={12}
                              className="text-accent"
                            />
                            <Text className="ml-1 text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                              Premium
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-[11px] font-outfit text-secondary">
                        {thread.time}
                      </Text>
                    </View>
                    <Text className="text-[12px] font-outfit text-secondary mt-0.5">
                      {thread.role}
                    </Text>
                    <Text
                      className="text-sm font-outfit text-app mt-2"
                      numberOfLines={2}
                    >
                      {thread.preview}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between mt-4">
                  <View className="flex-row items-center gap-2">
                    {thread.pinned ? (
                      <View className="flex-row items-center px-2 py-1 rounded-full bg-secondary/10 border border-app/10">
                        <Feather
                          name="bookmark"
                          size={12}
                          className="text-secondary"
                        />
                        <Text className="ml-1 text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                          Pinned
                        </Text>
                      </View>
                    ) : null}
                    {thread.premium ? (
                      <View className="flex-row items-center px-2 py-1 rounded-full bg-secondary/10 border border-app/10">
                        <Feather
                          name="zap"
                          size={12}
                          className="text-secondary"
                        />
                        <Text className="ml-1 text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                          Priority
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {thread.unread ? (
                    <View className="px-2.5 py-1 rounded-full bg-accent">
                      <Text className="text-[11px] font-outfit text-white">
                        {thread.unread} new
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center gap-1">
                      <Feather
                        name="check-circle"
                        size={14}
                        className="text-secondary"
                      />
                      <Text className="text-[11px] font-outfit text-secondary">
                        Up to date
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="px-6 pb-10">
          <View className="rounded-3xl border p-5 bg-input">
            <Text className="text-base font-clash text-app">
              Need something urgent?
            </Text>
            <Text className="text-sm font-outfit text-secondary mt-2">
              Premium members get priority response times from your coach.
            </Text>
            <View className="mt-4 flex-row items-center gap-2">
              <View className="h-9 w-9 rounded-2xl bg-secondary/10 items-center justify-center border border-app/10">
                <Feather name="phone" size={16} className="text-secondary" />
              </View>
              <Text className="text-sm font-outfit text-app">
                Book a 1:1 call in Schedule
              </Text>
            </View>
          </View>
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}
