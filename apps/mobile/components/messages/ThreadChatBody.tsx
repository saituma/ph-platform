import {
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from "expo-glass-effect";
import { LiquidGlass } from "@/components/ui/LiquidGlass";
import { Feather } from "@/components/ui/theme-icons";
import { ChatMessage } from "@/constants/messages";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import Animated, {
  FadeInDown,
  FadeOutDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

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
  replyTarget: {
    messageId: number;
    preview: string;
    authorName?: string;
  } | null;
  onClearReplyTarget: () => void;
  onReplyMessage: (message: ChatMessage) => void;
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
  coachingContextLabel?: string;
};

function formatFileSize(sizeBytes: number) {
  if (sizeBytes <= 0) return "0 KB";
  if (sizeBytes < 1024 * 1024)
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getThreadTone(thread: MessageThread) {
  if (thread.id.startsWith("group:")) return "Group thread";
  if (thread.premium) return "Priority chat";
  return "Direct chat";
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MemoizedComposer = React.memo(
  ({
    isDark,
    colors,
    insets,
    isKeyboardVisible,
    pendingAttachment,
    isUploadingAttachment,
    attachmentMeta,
    onRemovePendingAttachment,
    composerDisabled,
    onDisabledPress,
    onOpenComposerMenu,
    draft,
    onDraftChange,
    composerPlaceholder,
    textSecondaryColor,
    onSendPress,
    composerBusy,
    sendButtonColor,
    onFocus,
    onBlur,
  }: any) => {
    const plusButtonScale = useSharedValue(1);
    const sendButtonScale = useSharedValue(1);

    const plusAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: plusButtonScale.value }],
    }));

    const sendAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: sendButtonScale.value }],
    }));

    const handlePlusPressIn = () => {
      plusButtonScale.value = withSpring(0.9);
    };
    const handlePlusPressOut = () => {
      plusButtonScale.value = withSpring(1);
    };
    const handleSendPressIn = () => {
      sendButtonScale.value = withSpring(0.85);
    };
    const handleSendPressOut = () => {
      sendButtonScale.value = withSpring(1);
    };

    const canUseLiquidGlass =
      Platform.OS === "ios" &&
      isLiquidGlassAvailable() &&
      isGlassEffectAPIAvailable();
    const glassTintColor = canUseLiquidGlass
      ? isDark
        ? "rgba(12, 12, 14, 0.45)"
        : "rgba(255, 255, 255, 0.45)"
      : isDark
        ? colors.cardElevated
        : colors.background;

    return (
      <LiquidGlass
        glassStyle="regular"
        tintColor={glassTintColor}
        blurIntensity={70}
        style={{
          paddingBottom: isKeyboardVisible ? 12 : Math.max(12, insets.bottom),
          paddingTop: 10,
          paddingHorizontal: 12,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(15,23,42,0.06)",
        }}
      >
        {pendingAttachment ? (
          <Animated.View
            entering={FadeInDown.springify().damping(20)}
            exiting={FadeOutDown}
            className="mb-3 mx-1 rounded-[24px] border p-3"
            style={{
              backgroundColor: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.8)",
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.06)",
              ...(isDark ? Shadows.none : Shadows.md),
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
                    style={{
                      backgroundColor: isDark
                        ? "rgba(34,197,94,0.12)"
                        : "rgba(34,197,94,0.10)",
                    }}
                  >
                    <Feather name="file-text" size={22} color={colors.accent} />
                  </View>
                )}

                <View className="flex-1">
                  <Text
                    className="text-sm font-outfit font-bold"
                    numberOfLines={1}
                    style={{ color: colors.text }}
                  >
                    {pendingAttachment.isImage ? "Image" : "Attachment"}
                  </Text>
                  {attachmentMeta ? (
                    <Text
                      className="mt-0.5 text-[11px] font-outfit"
                      style={{ color: colors.textSecondary }}
                    >
                      {attachmentMeta.split(" • ")[1]}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Pressable
                onPress={onRemovePendingAttachment}
                disabled={isUploadingAttachment}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </Pressable>
            </View>

            {isUploadingAttachment ? (
              <View className="mt-3">
                <Text
                  className="text-[11px] font-outfit font-medium mb-2"
                  style={{ color: colors.accent }}
                >
                  Uploading...
                </Text>
                <View className="h-1.5 bg-accent/10 rounded-full overflow-hidden">
                  <UploadProgressBar accentColor={colors.accent} />
                </View>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        <View className="flex-row items-end gap-2.5">
          <Animated.View
            style={[
              {
                flex: 1,
                borderRadius: 28,
                borderWidth: 1,
                flexDirection: "row",
                alignItems: "flex-end",
                paddingHorizontal: 4,
                paddingVertical: 4,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(255,255,255,0.7)",
                borderColor: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(15,23,42,0.1)",
                ...(isDark ? Shadows.none : Shadows.sm),
              },
            ]}
          >
            <AnimatedPressable
              onPressIn={handlePlusPressIn}
              onPressOut={handlePlusPressOut}
              onPress={
                composerDisabled
                  ? onDisabledPress
                  : isUploadingAttachment
                    ? undefined
                    : onOpenComposerMenu
              }
              className="h-10 w-10 rounded-full items-center justify-center active:opacity-70"
              style={[
                plusAnimatedStyle,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(34,197,94,0.08)",
                },
              ]}
            >
              <Feather name="plus" size={22} color={colors.accent} />
            </AnimatedPressable>

            <TextInput
              className="flex-1 text-[16px] font-outfit mx-2 my-2"
              placeholder={composerPlaceholder}
              placeholderTextColor={textSecondaryColor}
              value={draft}
              onChangeText={onDraftChange}
              multiline
              style={{
                color: colors.text,
                minHeight: 24,
                maxHeight: 150,
                textAlignVertical: "center",
              }}
              editable={!composerDisabled && !isUploadingAttachment}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </Animated.View>

          <AnimatedPressable
            onPressIn={handleSendPressIn}
            onPressOut={handleSendPressOut}
            onPress={onSendPress}
            className="h-12 w-12 rounded-full items-center justify-center"
            style={[
              sendAnimatedStyle,
              {
                backgroundColor: sendButtonColor,
                ...(isDark ? Shadows.none : Shadows.sm),
                opacity: !composerBusy ? 1 : 0.4,
              },
            ]}
          >
            {composerBusy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color="#FFFFFF"
                style={{ marginLeft: 3 }}
              />
            )}
          </AnimatedPressable>
        </View>
      </LiquidGlass>
    );
  },
);

function ThreadChatBodyBase({
  thread,
  messages,
  draft,
  isLoading,
  isThreadLoading,
  typingStatus,
  textSecondaryColor,
  replyTarget,
  onClearReplyTarget,
  onReplyMessage,
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
  coachingContextLabel,
}: ThreadChatBodyProps) {
  const { colors, isDark } = useAppTheme();
  let headerHeight = 0;
  try {
    headerHeight = useHeaderHeight();
  } catch (e) {
    // Ignore if not in a header context
  }
  const typingKey = thread.id.startsWith("group:")
    ? thread.id
    : `user:${thread.id}`;
  const typing = typingStatus[typingKey];
  const hasInitialScrolled = React.useRef<string | null>(null);
  const listRef = React.useRef<FlatList<ChatMessage> | null>(null);
  const insets = useSafeAreaInsets();
  const isNearBottomRef = React.useRef(true);
  const latestMessageIdRef = React.useRef<string | null>(null);
  const [newIncomingCount, setNewIncomingCount] = React.useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = React.useState<
    number | null
  >(null);

  const reversedMessages = React.useMemo(
    () => [...messages].reverse(),
    [messages],
  );
  const latestMessage = React.useMemo(
    () => messages[messages.length - 1] ?? null,
    [messages],
  );
  const isGroupThread = thread.id.startsWith("group:");
  const hasComposerContent =
    draft.trim().length > 0 || Boolean(pendingAttachment);
  const canSend =
    !composerDisabled && !isUploadingAttachment && hasComposerContent;
  const composerBusy = composerDisabled || isUploadingAttachment;
  const composerPlaceholder = isGroupThread
    ? "Message the group"
    : "Type a message";
  const introTitle = isGroupThread
    ? "Keep everyone in sync"
    : "Focused coaching chat";
  const introSubtitle = isGroupThread
    ? "Share updates, clips, and questions without losing the thread."
    : coachingContextLabel
      ? `Send check-ins, clips, and progress notes for ${coachingContextLabel} in one calm conversation.`
      : "Send quick check-ins, clips, and feedback in one calm conversation.";
  const attachmentMeta = React.useMemo(
    () =>
      pendingAttachment
        ? `${pendingAttachment.isImage ? "Image" : "Attachment"} • ${formatFileSize(pendingAttachment.sizeBytes)}`
        : null,
    [pendingAttachment],
  );
  const threadStatus = typing?.isTyping
    ? `${typing.name} is typing...`
    : (thread.lastSeen ?? thread.responseTime ?? "Replies stay in this thread");
  const sendButtonColor = canSend
    ? colors.accent
    : isDark
      ? "rgba(255,255,255,0.1)"
      : "rgba(15,23,42,0.08)";
  const keyboardOffset =
    Platform.OS === "ios"
      ? headerHeight + insets.top
      : Math.max(insets.bottom, 12);

  // Typing indicator dots animation
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  React.useEffect(() => {
    if (typing?.isTyping) {
      const animateDot = (sv: any, delay: number) => {
        sv.value = withRepeat(
          withSequence(
            withTiming(0, { duration: delay }),
            withTiming(1, {
              duration: 400,
              easing: Easing.bezier(0.4, 0, 0.2, 1),
            }),
            withTiming(0, {
              duration: 400,
              easing: Easing.bezier(0.4, 0, 0.2, 1),
            }),
          ),
          -1,
          true,
        );
      };
      animateDot(dot1, 0);
      animateDot(dot2, 200);
      animateDot(dot3, 400);
    } else {
      dot1.value = 0;
      dot2.value = 0;
      dot3.value = 0;
    }
  }, [typing?.isTyping, dot1, dot2, dot3]);

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: -dot1.value * 4 }],
    opacity: 0.3 + dot1.value * 0.7,
  }));
  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: -dot2.value * 4 }],
    opacity: 0.3 + dot2.value * 0.7,
  }));
  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: -dot3.value * 4 }],
    opacity: 0.3 + dot3.value * 0.7,
  }));

  const handlePrimaryAction = React.useCallback(() => {
    if (composerBusy) return;
    onSend();
  }, [composerBusy, onSend]);

  const handleFocus = React.useCallback(() => {
    if (Platform.OS === "android") {
      setIsKeyboardVisible(true);
    }
  }, []);

  const handleBlur = React.useCallback(() => {
    if (Platform.OS === "android") {
      setIsKeyboardVisible(false);
    }
  }, []);

  React.useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
    }
  }, [latestMessage]);

  const keyExtractor = React.useCallback(
    (message: ChatMessage) => String(message.id),
    [],
  );

  const numericMessageIdFor = React.useCallback((message: ChatMessage) => {
    const raw = String(message.id ?? "");
    const numeric = message.threadId.startsWith("group:")
      ? Number(raw.replace(/^group-/, ""))
      : Number(raw);
    return Number.isFinite(numeric) ? numeric : null;
  }, []);

  const messageByNumericId = React.useMemo(() => {
    const map = new Map<number, ChatMessage>();
    for (const msg of messages) {
      const numericId = numericMessageIdFor(msg);
      if (numericId != null) map.set(numericId, msg);
    }
    return map;
  }, [messages, numericMessageIdFor]);

  const jumpToMessage = React.useCallback(
    (messageId: number) => {
      if (!Number.isFinite(messageId)) return;
      const index = reversedMessages.findIndex(
        (msg) => numericMessageIdFor(msg) === messageId,
      );
      if (index < 0) return;

      try {
        listRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      } catch {
        // ignored
      }

      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId((current) =>
          current === messageId ? null : current,
        );
      }, 1400);
    },
    [numericMessageIdFor, reversedMessages],
  );
  const renderItem = React.useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => (
      <Animated.View
        entering={FadeInDown.delay(Math.min(index * 50, 400))
          .springify()
          .damping(20)}
        layout={Layout.springify().damping(20)}
      >
        <MessageBubble
          message={item}
          onLongPress={onLongPressMessage}
          onReactionPress={onReactionPress}
          onReply={onReplyMessage}
          onJumpToMessage={jumpToMessage}
          resolvedReplyPreview={
            item.replyToMessageId
              ? (() => {
                  const replied = messageByNumericId.get(item.replyToMessageId);
                  if (!replied) return null;
                  const text = String(replied.text ?? "").trim();
                  if (text) return text.slice(0, 160);
                  if (replied.mediaUrl) return "Media message";
                  return null;
                })()
              : null
          }
          isHighlighted={
            highlightedMessageId != null &&
            numericMessageIdFor(item) === highlightedMessageId
          }
        />
      </Animated.View>
    ),
    [
      highlightedMessageId,
      jumpToMessage,
      messageByNumericId,
      numericMessageIdFor,
      onLongPressMessage,
      onReactionPress,
      onReplyMessage,
    ],
  );
  const contentContainerStyle = React.useMemo(
    () => ({
      paddingHorizontal: 12,
      paddingTop: 100, // Account for composer
      paddingBottom: insets.top + 90, // Account for header
      rowGap: 12,
    }),
    [insets.top],
  );
  const handleListScroll = React.useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const { contentOffset } = event.nativeEvent;
      isNearBottomRef.current = contentOffset.y < 60;
      if (isNearBottomRef.current && newIncomingCount > 0) {
        setNewIncomingCount(0);
      }
    },
    [newIncomingCount],
  );
  const listFooterComponent = React.useMemo(
    () => (
      <>
        {isThreadLoading || isLoading ? (
          <View
            className="mb-4 rounded-[24px] border px-4 py-3 flex-row items-center justify-center"
            style={{
              backgroundColor: isDark
                ? "rgba(34,197,94,0.08)"
                : "rgba(34,197,94,0.06)",
              borderColor: isDark
                ? "rgba(34,197,94,0.16)"
                : "rgba(34,197,94,0.12)",
            }}
          >
            <ActivityIndicator size="small" color={colors.accent} />
            <Text className="text-[10px] font-bold font-outfit text-accent ml-2 uppercase tracking-widest">
              Loading coaching history...
            </Text>
          </View>
        ) : null}

        <View
          className="mb-6 overflow-hidden rounded-[32px] border px-6 py-6"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#F8FFFA",
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.sm),
          }}
        >
          <View
            className="absolute -right-10 -top-8 h-32 w-32 rounded-full"
            style={{
              backgroundColor: isDark
                ? "rgba(34,197,94,0.1)"
                : "rgba(34,197,94,0.06)",
            }}
          />
          <View className="flex-row items-start gap-4">
            <View
              className="h-14 w-14 rounded-[22px] items-center justify-center"
              style={{
                backgroundColor: isDark
                  ? "rgba(34,197,94,0.16)"
                  : "rgba(34,197,94,0.12)",
              }}
            >
              <Feather
                name={isGroupThread ? "users" : "message-circle"}
                size={24}
                color={colors.accent}
              />
            </View>

            <View className="flex-1">
              <Text
                className="font-clash text-[20px] font-bold"
                style={{ color: colors.text }}
              >
                {introTitle}
              </Text>
              <Text
                className="mt-1.5 text-[14px] leading-6 font-outfit"
                style={{ color: colors.textSecondary }}
              >
                {introSubtitle}
              </Text>
              <View
                className="mt-4 self-start rounded-full px-3 py-1.5"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(255,255,255,0.88)",
                }}
              >
                <Text
                  className="text-[10px] font-outfit font-bold uppercase tracking-[1.4px]"
                  style={{ color: colors.accent }}
                >
                  {threadStatus}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-6 flex-row flex-wrap gap-2.5">
            {[
              getThreadTone(thread),
              thread.responseTime ?? "Fast replies",
              coachingContextLabel ? `Athlete: ${coachingContextLabel}` : null,
              messages.length > 0
                ? `${messages.length} updates`
                : "Fresh thread",
            ]
              .filter(Boolean)
              .map((tag) => (
                <View
                  key={String(tag)}
                  className="rounded-full px-4 py-2"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(255,255,255,0.88)",
                  }}
                >
                  <Text
                    className="text-[11px] font-outfit font-semibold"
                    style={{ color: colors.text }}
                  >
                    {String(tag)}
                  </Text>
                </View>
              ))}
          </View>
        </View>

        <View className="items-center mb-2">
          <View
            className="px-5 py-2 rounded-full border"
            style={{
              backgroundColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(255,255,255,0.72)",
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.06)",
            }}
          >
            <Text
              className="text-[10px] font-bold font-outfit uppercase tracking-[1.5px]"
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
      thread,
      threadStatus,
    ],
  );
  const listEmptyComponent = React.useMemo(
    () =>
      isThreadLoading || isLoading ? (
        <View className="gap-5 pt-4">
          {[1, 2, 3].map((item) => (
            <View
              key={item}
              className={`rounded-[24px] border px-5 py-5 ${item % 2 === 0 ? "mr-16" : "ml-16"}`}
              style={{
                backgroundColor: colors.card,
                borderColor: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(15,23,42,0.05)",
              }}
            >
              <View className="h-3 w-3/4 rounded-full bg-secondary/10" />
              <View className="h-3 w-full rounded-full bg-secondary/10 mt-3" />
            </View>
          ))}
        </View>
      ) : (
        <View className="items-center py-16 px-6">
          <View
            className="h-28 w-28 rounded-[36px] items-center justify-center mb-6"
            style={{
              backgroundColor: isDark
                ? "rgba(34,197,94,0.12)"
                : "rgba(34,197,94,0.10)",
            }}
          >
            <View
              className="h-18 w-18 rounded-[28px] items-center justify-center"
              style={{ backgroundColor: colors.card, width: 72, height: 72 }}
            >
              <Feather name="message-square" size={32} color={colors.accent} />
            </View>
          </View>
          <Text
            className="text-[24px] font-clash font-bold text-center"
            style={{ color: colors.text }}
          >
            Kick off the thread
          </Text>
          <Text
            className="text-base leading-7 font-outfit text-center mt-3 max-w-[300px]"
            style={{ color: colors.textSecondary }}
          >
            Share your workout notes, ask for form feedback, or send a quick
            check-in to keep the coaching loop moving.
          </Text>
          <View className="mt-8 flex-row flex-wrap justify-center gap-2.5">
            {["Session recap", "Technique question", "Progress update"].map(
              (item) => (
                <View
                  key={item}
                  className="rounded-full px-4 py-2.5 border"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(255,255,255,0.88)",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(15,23,42,0.05)",
                  }}
                >
                  <Text
                    className="text-xs font-outfit font-semibold"
                    style={{ color: colors.text }}
                  >
                    {item}
                  </Text>
                </View>
              ),
            )}
          </View>
        </View>
      ),
    [
      colors.accent,
      colors.card,
      colors.text,
      colors.textSecondary,
      isDark,
      isLoading,
      isThreadLoading,
    ],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardOffset}
    >
      <View
        className="flex-1 overflow-hidden"
        style={{ backgroundColor: colors.background }}
      >
        <View
          className="absolute -left-20 top-10 h-64 w-64 rounded-full"
          style={{
            backgroundColor: isDark
              ? "rgba(34,197,94,0.04)"
              : "rgba(34,197,94,0.05)",
          }}
        />
        <View
          className="absolute -right-24 top-40 h-80 w-80 rounded-full"
          style={{
            backgroundColor: isDark
              ? "rgba(255,255,255,0.015)"
              : "rgba(15,23,42,0.025)",
          }}
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
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          onScroll={handleListScroll}
          onContentSizeChange={() => {
            if (isNearBottomRef.current) {
              listRef.current?.scrollToOffset({ offset: 0, animated: false });
            }
          }}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={7}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={40}
          removeClippedSubviews={Platform.OS === "android"}
          ListFooterComponent={listFooterComponent}
          ListEmptyComponent={listEmptyComponent}
          renderItem={renderItem}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
            setTimeout(() => {
              listRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.5,
              });
            }, 60);
          }}
        />

        {newIncomingCount > 0 ? (
          <Animated.View
            entering={FadeInDown.springify()}
            exiting={FadeOutDown}
            className="absolute left-0 right-0 items-center"
            style={{
              zIndex: 10,
              bottom: isKeyboardVisible ? 92 : Math.max(insets.bottom + 78, 92),
            }}
          >
            <Pressable
              onPress={() => {
                listRef.current?.scrollToOffset({ offset: 0, animated: true });
                isNearBottomRef.current = true;
                setNewIncomingCount(0);
              }}
              className="rounded-full px-5 py-3 flex-row items-center gap-2.5 shadow-xl"
              style={{
                backgroundColor: colors.accent,
                ...(isDark ? Shadows.none : Shadows.lg),
              }}
            >
              <Feather name="arrow-down" size={16} color="#fff" />
              <Text className="text-sm font-outfit font-bold text-white uppercase tracking-wider">
                {newIncomingCount > 1
                  ? `${newIncomingCount} new messages`
                  : "New message"}
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>

      {typing?.isTyping ? (
        <Animated.View
          entering={FadeInDown}
          exiting={FadeOutDown}
          className="px-5 pb-3 absolute bottom-[100px]"
          style={{ zIndex: 10 }}
        >
          <View
            className="self-start rounded-[20px] border px-4 py-2.5 flex-row items-center gap-3"
            style={{
              backgroundColor: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.9)",
              borderColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(15,23,42,0.07)",
            }}
          >
            <View className="flex-row items-center gap-1.5 h-4">
              <Animated.View
                className="h-2 w-2 rounded-full bg-accent"
                style={dot1Style}
              />
              <Animated.View
                className="h-2 w-2 rounded-full bg-accent"
                style={dot2Style}
              />
              <Animated.View
                className="h-2 w-2 rounded-full bg-accent"
                style={dot3Style}
              />
            </View>
            <Text
              className="text-[11px] font-bold font-outfit uppercase tracking-[1.4px]"
              style={{ color: colors.accent }}
            >
              {typing.name} is typing
            </Text>
          </View>
        </Animated.View>
      ) : null}

      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
        {replyTarget ? (
          <View className="px-4 pb-2">
            <View
              className="rounded-[20px] border px-4 py-3 flex-row items-center"
              style={{
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(255,255,255,0.9)",
                borderColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(15,23,42,0.07)",
              }}
            >
              <View
                className="mr-3 h-10 w-10 rounded-2xl items-center justify-center"
                style={{
                  backgroundColor: isDark
                    ? "rgba(34,197,94,0.16)"
                    : "rgba(34,197,94,0.10)",
                }}
              >
                <Feather
                  name="corner-up-left"
                  size={18}
                  color={colors.accent}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[11px] font-bold font-outfit uppercase tracking-[1.2px]"
                  style={{ color: colors.accent }}
                >
                  Replying
                  {replyTarget.authorName
                    ? ` to ${replyTarget.authorName}`
                    : ""}
                </Text>
                <Text
                  numberOfLines={1}
                  className="mt-1 text-[13px] font-outfit font-semibold"
                  style={{ color: colors.textSecondary }}
                >
                  {replyTarget.preview}
                </Text>
              </View>
              <Pressable
                onPress={onClearReplyTarget}
                className="h-10 w-10 rounded-2xl items-center justify-center"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(15,23,42,0.05)",
                }}
              >
                <Feather name="x" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        ) : null}

        {composerDisabled && disabledMessage ? (
          <View className="px-4 pb-3">
            <View
              className="rounded-[20px] border px-5 py-3"
              style={{
                backgroundColor: isDark
                  ? "rgba(245,158,11,0.1)"
                  : "rgba(245,158,11,0.06)",
                borderColor: isDark
                  ? "rgba(245,158,11,0.2)"
                  : "rgba(245,158,11,0.14)",
              }}
            >
              <Text className="text-[12px] font-medium font-outfit text-warning text-center leading-5">
                {disabledMessage}
              </Text>
            </View>
          </View>
        ) : null}

        <MemoizedComposer
          isDark={isDark}
          colors={colors}
          insets={insets}
          isKeyboardVisible={isKeyboardVisible}
          pendingAttachment={pendingAttachment}
          isUploadingAttachment={isUploadingAttachment}
          attachmentMeta={attachmentMeta}
          onRemovePendingAttachment={onRemovePendingAttachment}
          composerDisabled={composerDisabled}
          onDisabledPress={onDisabledPress}
          onOpenComposerMenu={onOpenComposerMenu}
          draft={draft}
          onDraftChange={onDraftChange}
          composerPlaceholder={composerPlaceholder}
          textSecondaryColor={textSecondaryColor}
          onSendPress={handlePrimaryAction}
          composerBusy={composerBusy}
          sendButtonColor={sendButtonColor}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
function UploadProgressBar({ accentColor }: { accentColor: string }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${20 + progress.value * 60}%`,
  }));

  return (
    <Animated.View
      style={[
        { height: "100%", borderRadius: 4, backgroundColor: accentColor },
        animatedStyle,
      ]}
    />
  );
}

export const ThreadChatBody = React.memo(ThreadChatBodyBase);
