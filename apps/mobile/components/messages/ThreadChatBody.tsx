import { Feather } from "@/components/ui/theme-icons";
import { ChatMessage } from "@/constants/messages";
import React from "react";
import { ActivityIndicator, Animated, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MessageBubble } from "./MessageBubble";
import { MessageThread, TypingStatus } from "@/types/messages";
import { Text, TextInput } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";

type ThreadChatBodyProps = {
  thread: MessageThread;
  messages: ChatMessage[];
  draft: string;
  isLoading: boolean;
  isThreadLoading: boolean;
  typingStatus: TypingStatus;
  textSecondaryColor: string;
  onDraftChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  onOpenComposerMenu: () => void;
  onLongPressMessage: (message: ChatMessage) => void;
  onReactionPress: (message: ChatMessage, emoji: string) => void;
  composerDisabled?: boolean;
  disabledMessage?: string;
  onDisabledPress?: () => void;
  pendingAttachment?: {
    uri: string;
    fileName: string;
    sizeBytes: number;
    isImage: boolean;
  } | null;
  onRemovePendingAttachment?: () => void;
  isUploadingAttachment?: boolean;
};

function formatFileSize(sizeBytes: number) {
  if (sizeBytes <= 0) return "0 KB";
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getThreadTone(thread: MessageThread) {
  if (thread.id.startsWith("group:")) return "Group thread";
  if (thread.premium) return "Priority chat";
  return "Direct chat";
}

function ThreadChatBodyBase({
  thread,
  messages,
  draft,
  isLoading,
  isThreadLoading,
  typingStatus,
  textSecondaryColor,
  onDraftChange,
  onSend,
  onOpenComposerMenu,
  onLongPressMessage,
  onReactionPress,
  composerDisabled = false,
  disabledMessage,
  onDisabledPress,
  pendingAttachment = null,
  onRemovePendingAttachment,
  isUploadingAttachment = false,
}: ThreadChatBodyProps) {
  const { colors, isDark } = useAppTheme();
  const typingKey = thread.id.startsWith("group:") ? thread.id : `user:${thread.id}`;
  const typing = typingStatus[typingKey];
  const hasInitialScrolled = React.useRef<string | null>(null);
  const listRef = React.useRef<FlatList<ChatMessage> | null>(null);
  const insets = useSafeAreaInsets();
  const isNearBottomRef = React.useRef(true);
  const latestMessageIdRef = React.useRef<string | null>(null);
  const hintScale = React.useRef(new Animated.Value(1)).current;
  const [newIncomingCount, setNewIncomingCount] = React.useState(0);
  
  const reversedMessages = React.useMemo(() => [...messages].reverse(), [messages]);
  const latestMessage = React.useMemo(() => messages[messages.length - 1] ?? null, [messages]);
  const isGroupThread = thread.id.startsWith("group:");
  const hasComposerContent = draft.trim().length > 0 || Boolean(pendingAttachment);
  const canSend = !composerDisabled && !isUploadingAttachment && hasComposerContent;
  const composerBusy = composerDisabled || isUploadingAttachment;
  const composerPlaceholder = isGroupThread
    ? "Message the group"
    : "Type a message";
  const introTitle = isGroupThread ? "Keep everyone in sync" : "Focused coaching chat";
  const introSubtitle = isGroupThread
    ? "Share updates, clips, and questions without losing the thread."
    : "Send quick check-ins, clips, and feedback in one calm conversation.";
  const attachmentMeta = pendingAttachment
    ? `${pendingAttachment.isImage ? "Image" : "Attachment"} • ${formatFileSize(pendingAttachment.sizeBytes)}`
    : null;
  const threadTone = getThreadTone(thread);
  const threadStatus = typing?.isTyping
    ? `${typing.name} is typing...`
    : thread.lastSeen ?? thread.responseTime ?? "Replies stay in this thread";
  const primaryActionIcon = "arrow-up";
  const composerSurfaceColor = isDark ? colors.cardElevated : "#FFFFFF";
  const composerFieldColor = isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC";
  const composerButtonColor = isDark ? "rgba(255,255,255,0.05)" : colors.backgroundSecondary;
  const sendButtonColor = canSend
    ? colors.accent
    : isDark
      ? "rgba(255,255,255,0.1)"
      : "rgba(15,23,42,0.08)";

  const handlePrimaryAction = React.useCallback(() => {
    if (composerDisabled) {
      onDisabledPress?.();
      return;
    }
    if (isUploadingAttachment || !hasComposerContent) return;
    onSend();
  }, [
    composerDisabled,
    hasComposerContent,
    isUploadingAttachment,
    onDisabledPress,
    onSend,
  ]);

  React.useEffect(() => {
    if (hasInitialScrolled.current === thread.id) return;
    hasInitialScrolled.current = thread.id;
    setNewIncomingCount(0);
    latestMessageIdRef.current = latestMessage?.id ?? null;
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [latestMessage?.id, thread.id]);

  React.useEffect(() => {
    if (!latestMessage) return;
    const prevId = latestMessageIdRef.current;
    if (!prevId) {
      latestMessageIdRef.current = latestMessage.id;
      return;
    }
    if (prevId === latestMessage.id) return;
    latestMessageIdRef.current = latestMessage.id;

    const isIncoming = latestMessage.from !== "user";
    if (isNearBottomRef.current) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
      setNewIncomingCount(0);
      return;
    }

    if (isIncoming) {
      setNewIncomingCount((count) => Math.min(count + 1, 99));
      Animated.sequence([
        Animated.timing(hintScale, {
          toValue: 1.08,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(hintScale, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [hintScale, latestMessage]);

  const keyExtractor = React.useCallback((message: ChatMessage) => String(message.id), []);
  const renderItem = React.useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble
        message={item}
        onLongPress={onLongPressMessage}
        onReactionPress={onReactionPress}
      />
    ),
    [onLongPressMessage, onReactionPress]
  );
  const contentContainerStyle = React.useMemo(
    () => ({
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 18,
      rowGap: 10,
    }),
    []
  );
  const handleListScroll = React.useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const { contentOffset } = event.nativeEvent;
      isNearBottomRef.current = contentOffset.y < 60;
      if (isNearBottomRef.current && newIncomingCount > 0) {
        setNewIncomingCount(0);
      }
    },
    [newIncomingCount]
  );
  const listFooterComponent = React.useMemo(
    () => (
      <>
        {isThreadLoading || isLoading ? (
          <View
            className="mb-4 rounded-[24px] border px-4 py-3 flex-row items-center justify-center"
            style={{
              backgroundColor: isDark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.06)",
              borderColor: isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.12)",
            }}
          >
            <ActivityIndicator size="small" color={colors.accent} />
            <Text className="text-[10px] font-bold font-outfit text-accent ml-2 uppercase tracking-widest">Loading coaching history...</Text>
          </View>
        ) : null}

        <View
          className="mb-4 overflow-hidden rounded-[28px] border px-4 py-4"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#F8FFFA",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          }}
        >
          <View
            className="absolute -right-10 -top-8 h-24 w-24 rounded-full"
            style={{ backgroundColor: isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.10)" }}
          />
          <View className="flex-row items-start gap-3">
            <View
              className="h-12 w-12 rounded-2xl items-center justify-center"
              style={{ backgroundColor: isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.12)" }}
            >
              <Feather name={isGroupThread ? "users" : "message-circle"} size={20} color={colors.accent} />
            </View>

            <View className="flex-1">
              <Text className="font-clash text-[18px] font-bold" style={{ color: colors.text }}>
                {introTitle}
              </Text>
              <Text className="mt-1 text-[13px] leading-5 font-outfit" style={{ color: colors.textSecondary }}>
                {introSubtitle}
              </Text>
              <View className="mt-3 self-start rounded-full px-3 py-1.5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.88)" }}>
                <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]" style={{ color: colors.accent }}>
                  {threadStatus}
                </Text>
              </View>
            </View>

            {thread.premium ? (
              <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: colors.accent }}>
                <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px] text-white">
                  Premium
                </Text>
              </View>
            ) : null}
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <View
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.88)" }}
            >
              <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                {threadTone}
              </Text>
            </View>
            <View
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.88)" }}
            >
              <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                {thread.responseTime ?? "Fast replies"}
              </Text>
            </View>
            <View
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.88)" }}
            >
              <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                {messages.length > 0 ? `${messages.length} updates` : "Fresh thread"}
              </Text>
            </View>
          </View>
        </View>

        <View className="items-center my-1">
          <View
            className="px-4 py-1.5 rounded-full border"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.72)",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            }}
          >
            <Text
              className="text-[10px] font-semibold font-outfit uppercase tracking-[1.2px]"
              style={{ color: colors.textSecondary }}
            >
              Latest messages
            </Text>
          </View>
        </View>
      </>
    ),
    [
      colors.accent,
      colors.cardElevated,
      colors.text,
      colors.textSecondary,
      introSubtitle,
      introTitle,
      isDark,
      isGroupThread,
      isLoading,
      isThreadLoading,
      messages.length,
      thread.premium,
      thread.responseTime,
      threadStatus,
      threadTone,
    ]
  );
  const listEmptyComponent = React.useMemo(
    () =>
      isThreadLoading || isLoading ? (
        <View className="gap-4 pt-4">
          {[1, 2, 3].map((item) => (
            <View
              key={item}
              className={`rounded-[24px] border px-4 py-4 ${item % 2 === 0 ? "mr-12" : "ml-12"}`}
              style={{
                backgroundColor: colors.card,
                borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
              }}
            >
              <View className="h-3 w-3/4 rounded-full bg-secondary/10" />
              <View className="h-3 w-full rounded-full bg-secondary/10 mt-2.5" />
            </View>
          ))}
        </View>
      ) : (
        <View className="items-center py-12 px-5">
          <View
            className="h-24 w-24 rounded-[28px] items-center justify-center mb-5"
            style={{ backgroundColor: isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.10)" }}
          >
            <View
              className="h-16 w-16 rounded-[22px] items-center justify-center"
              style={{ backgroundColor: colors.card }}
            >
              <Feather name="message-square" size={28} color={colors.accent} />
            </View>
          </View>
          <Text className="text-[22px] font-clash font-bold text-center" style={{ color: colors.text }}>
            Kick off the thread
          </Text>
          <Text className="text-sm leading-6 font-outfit text-center mt-2 max-w-[280px]" style={{ color: colors.textSecondary }}>
            Share your workout notes, ask for form feedback, or send a quick check-in to keep the coaching loop moving.
          </Text>
          <View className="mt-5 flex-row flex-wrap justify-center gap-2">
            {[
              "Session recap",
              "Technique question",
              "Progress update",
            ].map((item) => (
              <View
                key={item}
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.88)" }}
              >
                <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ),
    [colors.accent, colors.card, colors.text, colors.textSecondary, isDark, isLoading, isThreadLoading]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={0}
    >
      <View className="flex-1 overflow-hidden" style={{ backgroundColor: colors.background }}>
        <View
          className="absolute -left-10 top-10 h-32 w-32 rounded-full"
          style={{ backgroundColor: isDark ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.07)" }}
        />
        <View
          className="absolute -right-12 top-24 h-28 w-28 rounded-full"
          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.035)" }}
        />

        <FlatList
          ref={(node) => {
            listRef.current = node;
          }}
          inverted
          className="flex-1"
          style={{ backgroundColor: "transparent" }}
          data={reversedMessages}
          keyExtractor={keyExtractor}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onScroll={handleListScroll}
          onContentSizeChange={() => {
            if (isNearBottomRef.current) {
              listRef.current?.scrollToOffset({ offset: 0, animated: false });
            }
          }}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews
          ListFooterComponent={listFooterComponent}
          ListEmptyComponent={listEmptyComponent}
          renderItem={renderItem}
        />
      </View>

      {newIncomingCount > 0 ? (
        <View className="px-6 pb-2">
          <Animated.View style={{ transform: [{ scale: hintScale }] }}>
            <Pressable
              onPress={() => {
                listRef.current?.scrollToOffset({ offset: 0, animated: true });
                isNearBottomRef.current = true;
                setNewIncomingCount(0);
              }}
              className="self-center rounded-full px-4 py-2.5 flex-row items-center gap-2 border"
              style={{
                backgroundColor: colors.accent,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(34,197,94,0.2)",
                ...(isDark ? Shadows.none : Shadows.sm),
              }}
            >
              <Feather name="arrow-down" size={14} color="#fff" />
              <Text className="text-xs font-outfit font-semibold text-white">
                {newIncomingCount > 1 ? `${newIncomingCount} new messages` : "New message"}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}

      {typing?.isTyping ? (
        <View className="px-6 pb-2">
          <View
            className="self-start rounded-full border px-3 py-2 flex-row items-center gap-2"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.78)",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            }}
          >
            <View className="flex-row items-center gap-1">
              {[0, 1, 2].map((dot) => (
                <View
                  key={dot}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: dot === 1 ? colors.accent : colors.textSecondary }}
                />
              ))}
            </View>
            <Text className="text-[11px] font-bold font-outfit uppercase tracking-[1.2px]" style={{ color: colors.accent }}>
              {typing.name} is typing
            </Text>
          </View>
        </View>
      ) : null}

      <View
        className="px-4 pt-3"
        style={{
          backgroundColor: colors.background,
          paddingBottom: Math.max(12, insets.bottom),
        }}
      >
        {composerDisabled && disabledMessage ? (
          <View
            className="mb-3 rounded-[24px] border px-4 py-3"
            style={{
              backgroundColor: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.08)",
              borderColor: isDark ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.16)",
            }}
          >
            <Text className="text-[11px] font-medium font-outfit text-warning text-center">
              {disabledMessage}
            </Text>
          </View>
        ) : null}

        <View
          className="rounded-[32px] border px-3 pb-3 pt-3"
          style={{
            backgroundColor: composerSurfaceColor,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.lg),
          }}
        >
          <View className="mb-3 flex-row items-center justify-between px-2">
            <View className="flex-row items-center gap-2 flex-1">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: typing?.isTyping ? colors.accent : colors.textSecondary }} />
              <Text
                className="text-[11px] font-outfit font-semibold flex-1"
                numberOfLines={1}
                style={{ color: colors.textSecondary }}
              >
                {threadStatus}
              </Text>
            </View>
            <View
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)" }}
            >
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.1px]" style={{ color: colors.accent }}>
                {threadTone}
              </Text>
            </View>
          </View>

          {pendingAttachment ? (
            <View
              className="mb-3 rounded-[24px] border p-3"
              style={{
                backgroundColor: composerFieldColor,
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
              }}
            >
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1 flex-row items-center gap-3">
                  {pendingAttachment.isImage ? (
                    <Image
                      source={{ uri: pendingAttachment.uri }}
                      className="w-14 h-14 rounded-[18px]"
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      className="w-14 h-14 rounded-[18px] items-center justify-center"
                      style={{ backgroundColor: isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.10)" }}
                    >
                      <Feather name="file-text" size={22} color={colors.accent} />
                    </View>
                  )}

                  <View className="flex-1">
                    <Text className="text-sm font-outfit font-semibold" numberOfLines={1} style={{ color: colors.text }}>
                      {pendingAttachment.fileName}
                    </Text>
                    {attachmentMeta ? (
                      <Text className="mt-1 text-[11px] font-outfit" style={{ color: colors.textSecondary }}>
                        {attachmentMeta}
                      </Text>
                    ) : null}
                    <View className="mt-2 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.12)" }}>
                      <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]" style={{ color: colors.accent }}>
                        Ready to send
                      </Text>
                    </View>
                  </View>
                </View>

                <Pressable onPress={onRemovePendingAttachment} disabled={isUploadingAttachment}>
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </Pressable>
              </View>

              {isUploadingAttachment ? (
                <>
                  <Text className="mt-3 text-[11px] font-outfit font-medium" style={{ color: colors.accent }}>
                    Uploading attachment...
                  </Text>
                  <View className="mt-2 h-1.5 bg-accent/10 rounded-full overflow-hidden">
                    <View className="h-full bg-accent w-1/3" />
                  </View>
                </>
              ) : null}
            </View>
          ) : null}

          <View className="flex-row items-end gap-3">
            <Pressable
              onPress={composerDisabled ? onDisabledPress : isUploadingAttachment ? undefined : onOpenComposerMenu}
              className="h-12 w-12 rounded-full items-center justify-center active:opacity-80"
              style={{
                backgroundColor: composerButtonColor,
              }}
            >
              <Feather name="plus" size={20} color={colors.accent} />
            </Pressable>

            <View
              className="flex-1 rounded-[28px] border px-4 py-3"
              style={{
                backgroundColor: composerFieldColor,
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
              }}
            >
              {!draft.trim() ? (
                <View className="mb-2 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.88)" }}>
                  <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.1px]" style={{ color: colors.textSecondary }}>
                    {hasComposerContent ? "Caption" : "Message"}
                  </Text>
                </View>
              ) : null}
              <TextInput
                className="text-sm font-outfit text-app"
                placeholder={composerPlaceholder}
                placeholderTextColor={textSecondaryColor}
                value={draft}
                onChangeText={onDraftChange}
                multiline
                style={{ minHeight: 26, maxHeight: 110 }}
                editable={!composerDisabled && !isUploadingAttachment}
              />
            </View>

            <Pressable
              onPress={() => {
                handlePrimaryAction();
              }}
              className={`h-12 w-12 rounded-full items-center justify-center ${
                !composerBusy ? "active:opacity-80" : "opacity-40"
              }`}
              style={{ backgroundColor: sendButtonColor }}
            >
              <Feather name={primaryActionIcon} size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="mt-2 flex-row items-center justify-between px-2">
            <Text className="text-[11px] font-outfit" style={{ color: colors.textSecondary }}>
              {pendingAttachment
                ? "Add an optional caption, then send."
                : hasComposerContent
                ? "Ready to send."
                : "Tap + for media."}
            </Text>
            <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]" style={{ color: colors.accent }}>
              Send
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
export const ThreadChatBody = React.memo(ThreadChatBodyBase);
