import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@/components/ui/theme-icons";
import React from "react";
import { ActivityIndicator, Image, View } from "react-native";
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
  onOpenThread: (
    thread: MessageThread,
    sharedBoundTag?: string,
    avatarTag?: string,
  ) => void;
  variant?: "default" | "team";
};

function getInitials(name?: string | null) {
  if (!name || typeof name !== "string") return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0]?.[0] ?? "";
  const firstInit = parts[0][0] ?? "";
  const lastInit = parts[parts.length - 1][0] ?? "";
  return `${firstInit}${lastInit}`.toUpperCase();
}

function getTypingKey(threadId: string) {
  return threadId.startsWith("group:") ? threadId : `user:${threadId}`;
}

function formatUnreadBadge(unread: number) {
  if (!Number.isFinite(unread) || unread <= 0) return null;
  return unread > 9 ? "9+" : String(unread);
}

function groupThreadsByChannel(
  threads: MessageThread[],
  variant: "default" | "team",
) {
  const coachGroups = threads.filter(
    (thread) => thread.channelType === "coach_group",
  );
  const direct = threads.filter(
    (thread) =>
      thread.channelType === "direct" || !thread.id.startsWith("group:"),
  );
  const team = threads.filter((thread) => thread.channelType === "team");

  const sections =
    variant === "team"
      ? [
          { key: "team", title: "Team inbox", items: team },
          { key: "coach_group", title: "Coach groups", items: coachGroups },
          { key: "direct", title: "Direct inbox", items: direct },
        ]
      : [
          { key: "coach_group", title: "Coach groups", items: coachGroups },
          { key: "direct", title: "Direct inbox", items: direct },
          { key: "team", title: "Team inbox", items: team },
        ];

  return sections.filter((section) => section.items.length > 0);
}

function ThreadSkeletonCard({
  backgroundColor,
  borderColor,
  shimmerColor,
}: {
  backgroundColor: string;
  borderColor: string;
  shimmerColor: string;
}) {
  return (
    <View
      className="rounded-[28px] p-5 border"
      style={{ backgroundColor, borderColor }}
    >
      <View className="flex-row items-center">
        <View
          className="h-14 w-14 rounded-2xl"
          style={{ backgroundColor: shimmerColor }}
        />
        <View className="flex-1 ml-4 space-y-2.5">
          <View
            className="h-4 rounded-full w-4/5"
            style={{ backgroundColor: shimmerColor }}
          />
          <View
            className="h-3 rounded-full w-1/2"
            style={{ backgroundColor: shimmerColor }}
          />
          <View
            className="h-3 rounded-full w-full"
            style={{ backgroundColor: shimmerColor }}
          />
        </View>
      </View>
    </View>
  );
}

function InboxEmptyState({
  accentColor,
  backgroundSecondary,
  borderColor,
  textPrimary,
  textSecondary,
}: {
  accentColor: string;
  backgroundSecondary: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <View className="py-20 items-center">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-6 border"
        style={{ backgroundColor: backgroundSecondary, borderColor }}
      >
        <Feather name="message-circle" size={42} color={accentColor} />
      </View>
      <Text className="text-2xl font-clash mb-2" style={{ color: textPrimary }}>
        No messages yet
      </Text>
      <Text
        className="text-center font-outfit max-w-[260px]"
        style={{ color: textSecondary }}
      >
        Your coach conversations will appear here
      </Text>
    </View>
  );
}

function PriorityHelpCard({
  accent,
  accentLight,
  borderLime,
  text,
  textSecondary,
}: {
  accent: string;
  accentLight: string;
  borderLime: string;
  text: string;
  textSecondary: string;
}) {
  return (
    <View
      className="mx-6 mt-8 mb-10 rounded-[28px] p-6 border"
      style={{ backgroundColor: accentLight, borderColor: borderLime }}
    >
      <View className="flex-row items-center gap-4">
        <View
          className="w-12 h-12 rounded-2xl items-center justify-center border"
          style={{ backgroundColor: accentLight, borderColor: borderLime }}
        >
          <Feather name="help-circle" size={24} color={accent} />
        </View>
        <View className="flex-1">
          <Text
            className="font-clash text-lg font-bold"
            style={{ color: text }}
          >
            Need priority help?
          </Text>
          <Text
            className="text-sm mt-0.5 leading-relaxed"
            style={{ color: textSecondary }}
          >
            Premium members get faster replies and 1:1 video review support.
          </Text>
        </View>
      </View>
    </View>
  );
}

function InboxScreenBase({
  threads,
  typingStatus,
  isLoading,
  openingThreadId,
  onRefresh,
  onOpenThread,
  variant = "default",
}: InboxScreenProps) {
  const { colors, isDark } = useAppTheme();

  const cardBorder = colors.borderSubtle;
  const mutedPill = isDark
    ? "rgba(255,255,255,0.08)"
    : colors.backgroundSecondary;

  const groupedSections = React.useMemo(() => {
    return groupThreadsByChannel(threads, variant);
  }, [threads, variant]);

  return (
    <ThemedScrollView
      onRefresh={onRefresh}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Threads */}
      <View className="px-6">
        <View className="gap-4">
          {isLoading ? (
            [1, 2, 3].map((item) => (
              <ThreadSkeletonCard
                key={`skeleton-${item}`}
                backgroundColor={colors.card}
                borderColor={cardBorder}
                shimmerColor={colors.backgroundSecondary}
              />
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
                  const typingKey = getTypingKey(thread.id);
                  const typing = typingStatus[typingKey];
                  const isOpening = openingThreadId === thread.id;
                  const sharedBoundTag = `thread-card-${thread.id}`;
                  const sharedAvatarTag = `thread-avatar-${thread.id}`;
                  const unreadBadge = formatUnreadBadge(thread.unread);

                  return (
                    <Transition.Pressable
                      key={thread.id}
                      sharedBoundTag={sharedBoundTag}
                      onPress={() =>
                        onOpenThread(thread, sharedBoundTag, sharedAvatarTag)
                      }
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
                                style={{ backgroundColor: colors.successSoft }}
                              >
                                <Text
                                  className="font-clash text-2xl"
                                  style={{ color: colors.success }}
                                >
                                  {getInitials(thread.name)}
                                </Text>
                              </View>
                            )}
                          </Transition.View>

                          {unreadBadge ? (
                            <View className="absolute -top-1 -right-1 min-w-6 h-6 px-1 bg-accent rounded-full items-center justify-center">
                              <Text className="text-white text-[9px] font-bold font-outfit">
                                {unreadBadge}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View className="flex-1 pt-0.5">
                          <View className="flex-row justify-between items-start">
                            <View className="flex-1 pr-2">
                              <Text
                                className="font-clash text-lg"
                                numberOfLines={1}
                                style={{ color: colors.text }}
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
                                  <Text
                                    className="text-[11px] font-bold font-outfit"
                                    style={{ color: colors.textSecondary }}
                                  >
                                    {thread.time}
                                  </Text>
                                  {unreadBadge ? (
                                    <View
                                      className="rounded-full px-2.5 py-1 flex-row items-center gap-1.5"
                                      style={{
                                        backgroundColor: colors.successSoft,
                                      }}
                                    >
                                      <Text
                                        className="text-[9px] font-bold font-outfit uppercase tracking-[1px]"
                                        style={{ color: colors.success }}
                                      >
                                        {unreadBadge}
                                      </Text>
                                      <Text
                                        className="text-[9px] font-bold font-outfit uppercase tracking-[1px]"
                                        style={{ color: colors.success }}
                                      >
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
                            style={{
                              color: typing?.isTyping
                                ? colors.accent
                                : colors.textSecondary,
                            }}
                            numberOfLines={1}
                          >
                            {typing?.isTyping
                              ? `${typing.name} is typing...`
                              : thread.preview}
                          </Text>

                          <View className="flex-row items-end justify-between mt-4">
                            <View className="flex-row items-center gap-2 flex-wrap">
                              {thread.pinned ? (
                                <View
                                  className="px-2.5 py-1 rounded-full flex-row items-center border"
                                  style={{
                                    backgroundColor: colors.warningSoft,
                                    borderColor: colors.warningSoft,
                                  }}
                                >
                                  <Feather
                                    name="bookmark"
                                    size={11}
                                    color={colors.warning}
                                  />
                                  <Text
                                    className="ml-1 text-[9px] font-bold uppercase tracking-widest"
                                    style={{ color: colors.warning }}
                                  >
                                    Pinned
                                  </Text>
                                </View>
                              ) : null}
                              <View
                                className="px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: mutedPill }}
                              >
                                <Text
                                  className="text-[10px] font-outfit font-semibold"
                                  style={{ color: colors.text }}
                                >
                                  {thread.lastSeen ?? "Open thread"}
                                </Text>
                              </View>
                            </View>

                            {thread.premium ? (
                              <View className="flex-col items-end gap-1">
                                <View
                                  className="px-2 py-1 rounded-full shadow-sm"
                                  style={{ backgroundColor: colors.accent }}
                                >
                                  <Text className="text-[8px] font-bold text-white uppercase tracking-[1px]">
                                    Premium
                                  </Text>
                                </View>
                                {thread.responseTime ? (
                                  <View
                                    className="px-2 py-1 rounded-full shadow-sm"
                                    style={{
                                      backgroundColor: colors.successSoft,
                                    }}
                                  >
                                    <Text
                                      className="text-[8px] font-bold uppercase tracking-[1px]"
                                      style={{ color: colors.success }}
                                    >
                                      {thread.responseTime}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </Transition.Pressable>
                  );
                })}
              </View>
            ))
          ) : (
            <InboxEmptyState
              accentColor={colors.accent}
              backgroundSecondary={colors.backgroundSecondary}
              borderColor={cardBorder}
              textPrimary={colors.text}
              textSecondary={colors.textSecondary}
            />
          )}
        </View>
      </View>

      {/* Urgent Help Card */}
      {threads.length > 0 ? (
        <PriorityHelpCard
          accent={colors.accent}
          accentLight={colors.accentLight}
          borderLime={colors.borderLime}
          text={colors.text}
          textSecondary={colors.textSecondary}
        />
      ) : null}
    </ThemedScrollView>
  );
}
export const InboxScreen = React.memo(InboxScreenBase);
