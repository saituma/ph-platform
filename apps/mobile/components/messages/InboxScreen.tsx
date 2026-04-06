import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@/components/ui/theme-icons";
import React from "react";
import { ActivityIndicator, Image, Pressable, View } from "react-native";
import { MessageThread, TypingStatus } from "@/types/messages";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { Transition } from "@/components/navigation/TransitionStack";

type InboxScreenProps = {
  threads: MessageThread[];
  typingStatus: TypingStatus;
  isLoading: boolean;
  openingThreadId: string | null;
  onRefresh: () => Promise<void>;
  onOpenThread: (thread: MessageThread, sharedBoundTag?: string, avatarTag?: string) => void;
  backgroundSecondary?: string;
  borderColor?: string;
  accentLight?: string;
  textSecondaryColor: string;
};

function getInitials(name?: string | null) {
  if (!name || typeof name !== "string") return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0]?.[0] ?? "";
  const firstInit = parts[0][0] ?? "";
  const lastInit = parts[parts.length - 1][0] ?? "";
  return `${firstInit}${lastInit}`.toUpperCase();
}

function InboxScreenBase({
  threads,
  typingStatus,
  isLoading,
  openingThreadId,
  onRefresh,
  onOpenThread,
  textSecondaryColor,
}: InboxScreenProps) {
  const { colors, isDark } = useAppTheme();
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const mutedPill = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.04)";
  const groupedSections = React.useMemo(() => {
    const announcements = threads.filter((thread) => thread.channelType === "announcement");
    const coachGroups = threads.filter((thread) => thread.channelType === "coach_group");
    const direct = threads.filter((thread) => thread.channelType === "direct" || !thread.id.startsWith("group:"));
    const team = threads.filter((thread) => thread.channelType === "team");
    return [
      { key: "announcement", title: "Coach announcements", items: announcements },
      { key: "coach_group", title: "Coach groups", items: coachGroups },
      { key: "direct", title: "Direct inbox", items: direct },
      { key: "team", title: "Team inbox", items: team },
    ].filter((section) => section.items.length > 0);
  }, [threads]);

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
                className="rounded-[28px] p-5 border"
                style={{ backgroundColor: colors.card, borderColor: cardBorder }}
              >
                <View className="flex-row items-center">
                  <View className="h-14 w-14 rounded-2xl" style={{ backgroundColor: colors.backgroundSecondary }} />
                  <View className="flex-1 ml-4 space-y-2.5">
                    <View className="h-4 rounded-full w-4/5" style={{ backgroundColor: colors.backgroundSecondary }} />
                    <View className="h-3 rounded-full w-1/2" style={{ backgroundColor: colors.backgroundSecondary }} />
                    <View className="h-3 rounded-full w-full" style={{ backgroundColor: colors.backgroundSecondary }} />
                  </View>
                </View>
              </View>
            ))
          ) : threads.length > 0 ? (
            groupedSections.map((section) => (
              <View key={section.key} className="gap-3">
                <View className="px-1 pt-1">
                  <Text
                    className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]"
                    style={{ color: colors.textSecondary }}
                  >
                    {section.title}
                  </Text>
                </View>
                {section.items.map((thread) => {
              const typingKey = thread.id.startsWith("group:")
                ? thread.id
                : `user:${thread.id}`;
              const typing = typingStatus[typingKey];
              const isOpening = openingThreadId === thread.id;
              const sharedBoundTag = `thread-card-${thread.id}`;
              const sharedAvatarTag = `thread-avatar-${thread.id}`;

              return (
                <Transition.Pressable
                  key={thread.id}
                  sharedBoundTag={sharedBoundTag}
                  onPress={() => onOpenThread(thread, sharedBoundTag, sharedAvatarTag)}
                  className="rounded-[28px] border p-4 active:opacity-95"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: cardBorder,
                    ...(isDark ? Shadows.none : Shadows.md),
                  }}
                >
                  <View className="flex-row items-start gap-4">
                    <View className="relative flex-shrink-0">
                      <Transition.View sharedBoundTag={sharedAvatarTag}>
                        {thread.avatarUrl ? (
                          <Image
                            source={{ uri: thread.avatarUrl }}
                            className="h-14 w-14 rounded-2xl"
                          />
                        ) : (
                          <View
                            className="h-14 w-14 rounded-2xl items-center justify-center"
                            style={{ backgroundColor: isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.12)" }}
                          >
                            <Text className="font-clash text-2xl" style={{ color: colors.accent }}>
                              {getInitials(thread.name)}
                            </Text>
                          </View>
                        )}
                      </Transition.View>

                      {thread.unread > 0 && (
                        <View className="absolute -top-1 -right-1 min-w-6 h-6 px-1 bg-accent rounded-full items-center justify-center">
                          <Text className="text-white text-[9px] font-bold font-outfit">
                            {typeof thread.unread === "number" &&
                            thread.unread > 9
                              ? "9+"
                              : thread.unread}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-1 pt-0.5">
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1 pr-2">
                          <Text
                            className="font-clash text-lg text-app"
                            numberOfLines={1}
                          >
                            {thread.name}
                          </Text>
                          <Text
                            className="text-sm font-outfit mt-0.5"
                            style={{ color: colors.textSecondary }}
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
                              <Text className="text-[11px] font-bold font-outfit" style={{ color: colors.textSecondary }}>
                                {thread.time}
                              </Text>
                              {thread.unread > 0 ? (
                                <View className="rounded-full px-2 py-1" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.10)" }}>
                                  <Text className="text-[9px] font-bold font-outfit uppercase tracking-[1px]" style={{ color: colors.accent }}>
                                    New
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          )}
                        </View>
                      </View>

                      <Text
                        className="mt-2.5 text-sm leading-6 font-outfit"
                        style={{ color: typing?.isTyping ? colors.accent : colors.textSecondary }}
                        numberOfLines={1}
                      >
                        {typing?.isTyping
                          ? `${typing.name} is typing...`
                          : thread.preview}
                      </Text>

                      <View className="flex-row items-end justify-between mt-4">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          {thread.pinned && (
                            <View className="px-2.5 py-1 rounded-full flex-row items-center border" style={{ backgroundColor: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.10)", borderColor: isDark ? "rgba(245,158,11,0.22)" : "rgba(245,158,11,0.18)" }}>
                              <Feather
                                name="bookmark"
                                size={11}
                                color="#D97706"
                              />
                              <Text className="ml-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: "#D97706" }}>
                                Pinned
                              </Text>
                            </View>
                          )}
                          <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: mutedPill }}>
                            <Text className="text-[10px] font-outfit font-semibold" style={{ color: colors.text }}>
                              {thread.lastSeen ?? "Open thread"}
                            </Text>
                          </View>
                        </View>

                        {thread.premium && (
                          <View className="flex-col items-end gap-1">
                            <View className="px-2 py-1 rounded-full shadow-sm" style={{ backgroundColor: colors.accent }}>
                              <Text className="text-[8px] font-bold text-white uppercase tracking-[1px]">
                                Premium
                              </Text>
                            </View>
                            {thread.responseTime && (
                              <View className="px-2 py-1 rounded-full shadow-sm" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)" }}>
                                <Text className="text-[8px] font-bold uppercase tracking-[1px]" style={{ color: colors.accent }}>
                                  {thread.responseTime}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                      </View>
                    </View>
                </Transition.Pressable>
              );
                })}
              </View>
            ))
          ) : (
            /* Empty State */
            <View className="py-20 items-center">
              <View className="w-20 h-20 rounded-full items-center justify-center mb-6 border" style={{ backgroundColor: colors.backgroundSecondary, borderColor: cardBorder }}>
                <Feather
                  name="message-circle"
                  size={42}
                  color={colors.accent}
                />
              </View>
              <Text className="text-2xl font-clash text-app mb-2">
                No messages yet
              </Text>
              <Text className="text-center font-outfit max-w-[260px]" style={{ color: colors.textSecondary }}>
                Your coach conversations will appear here
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Urgent Help Card */}
      {threads.length > 0 && (
        <View className="mx-6 mt-8 mb-10 rounded-[28px] p-6 border" style={{ backgroundColor: isDark ? "#123021" : "#14532D", borderColor: isDark ? "rgba(34,197,94,0.20)" : "rgba(20,83,45,0.18)" }}>
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 bg-white/15 rounded-2xl items-center justify-center border border-white/20">
              <Feather name="help-circle" size={24} color="white" />
            </View>
            <View className="flex-1">
              <Text className="font-clash text-lg font-bold text-white">
                Need priority help?
              </Text>
              <Text className="text-sm text-white mt-0.5 leading-relaxed">
                Premium members get faster replies and 1:1 video review support.
              </Text>
            </View>
          </View>
        </View>
      )}
    </ThemedScrollView>
  );
}
export const InboxScreen = React.memo(InboxScreenBase);
