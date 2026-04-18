import React, { useMemo, useCallback, useState, useEffect } from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Keyboard,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeOutDown,
  Layout,
} from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useHeaderHeight } from "@react-navigation/elements";

import { MessageBubble } from "./MessageBubble";
import { ChatMessage } from "@/constants/messages";
import { MessageThread, TypingStatus } from "@/types/messages";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";

import { ChatComposer } from "./ChatComposer";
import { ChatIntroHeader } from "./ChatIntroHeader";
import { TypingIndicator } from "./TypingIndicator";
import { useChatScroll } from "@/hooks/messages/useChatScroll";

type ThreadChatBodyProps = {
  thread: MessageThread;
  messages: ChatMessage[];
  effectiveProfileId: number;
  effectiveProfileName: string;
  groupMembers: Record<
    number,
    Record<number, { name: string; avatar?: string | null }>
  >;
  token?: string | null;
  draft: string;
  isLoading: boolean;
  isThreadLoading: boolean;
  typingStatus: TypingStatus;
  textSecondaryColor: string;
  replyTarget: any;
  onClearReplyTarget: () => void;
  onReplyMessage: (message: ChatMessage) => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onOpenComposerMenu: () => void;
  onLongPressMessage: (message: ChatMessage) => void;
  onReactionPress: (message: ChatMessage, emoji: string) => void;
  onOpenReactionPicker: (message: ChatMessage) => void;
  composerDisabled?: boolean;
  disabledMessage?: string;
  onDisabledPress?: () => void;
  pendingAttachment?: any;
  onRemovePendingAttachment?: () => void;
  isUploadingAttachment?: boolean;
  coachingContextLabel?: string;
};

export const ThreadChatBody = React.memo(function ThreadChatBody({
  thread,
  messages,
  effectiveProfileId,
  effectiveProfileName,
  groupMembers,
  token,
  draft,
  isLoading,
  isThreadLoading,
  typingStatus,
  replyTarget,
  onClearReplyTarget,
  onReplyMessage,
  onDraftChange,
  onSend,
  onOpenComposerMenu,
  onLongPressMessage,
  onReactionPress,
  onOpenReactionPicker,
  composerDisabled,
  disabledMessage,
  onDisabledPress,
  pendingAttachment,
  onRemovePendingAttachment,
  isUploadingAttachment,
  coachingContextLabel,
}: ThreadChatBodyProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  let headerHeight = 0;
  try {
    headerHeight = useHeaderHeight();
  } catch (e) {}

  const typingKey = thread.id.startsWith("group:")
    ? thread.id
    : `user:${thread.id}`;
  const typing = typingStatus[typingKey];

  const reversed = useMemo(() => [...messages].reverse(), [messages]);
  const { listRef, handleScroll, jumpTo, newIncomingCount, highlightedId } =
    useChatScroll(messages, thread.id);

  const resolveReactionUserName = useCallback(
    (userId: number) => {
      if (userId === effectiveProfileId) return effectiveProfileName || "You";

      if (thread.id.startsWith("group:")) {
        const groupId = Number(thread.id.replace("group:", ""));
        const name = groupMembers?.[groupId]?.[userId]?.name;
        return name || `User ${userId}`;
      }

      if (String(userId) === thread.id) return thread.name;
      return `User ${userId}`;
    },
    [
      effectiveProfileId,
      effectiveProfileName,
      groupMembers,
      thread.id,
      thread.name,
    ],
  );

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => (
      <Animated.View
        entering={FadeInDown.delay(Math.min(index * 50, 400))}
        layout={Layout.springify()}
        style={{ width: "100%" }}
      >
        <MessageBubble
          message={item}
          isGroupThread={thread.id.startsWith("group:")}
          token={token}
          resolveReactionUserName={resolveReactionUserName}
          onLongPress={onLongPressMessage}
          onReactionPress={onReactionPress}
          onOpenReactionPicker={onOpenReactionPicker}
          onReply={onReplyMessage}
          onJumpToMessage={jumpTo}
          isHighlighted={highlightedId === Number(item.id)}
        />
      </Animated.View>
    ),
    [
      token,
      resolveReactionUserName,
      highlightedId,
      jumpTo,
      thread.id,
      onLongPressMessage,
      onReactionPress,
      onOpenReactionPicker,
      onReplyMessage,
    ],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={
        Platform.OS === "ios" ? headerHeight + insets.top : 0
      }
    >
      <FlatList
        ref={listRef}
        inverted
        data={reversed}
        keyExtractor={(m) => String(m.id)}
        onScroll={handleScroll}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 100,
          paddingBottom: insets.top + 90,
          rowGap: 12,
        }}
        renderItem={renderItem}
        ListFooterComponent={
          <ChatIntroHeader
            thread={thread}
            isLoading={isLoading}
            isThreadLoading={isThreadLoading}
            messageCount={messages.length}
            coachingContextLabel={coachingContextLabel}
            statusText={
              typing?.isTyping ? "Typing..." : (thread.lastSeen ?? "Active")
            }
          />
        }
      />

      {newIncomingCount > 0 && (
        <Pressable
          onPress={() =>
            listRef.current?.scrollToOffset({ offset: 0, animated: true })
          }
          className="absolute left-0 right-0 items-center"
          style={{ bottom: isKeyboardVisible ? 100 : insets.bottom + 80 }}
        >
          <View className="bg-accent px-4 py-2 rounded-full flex-row items-center gap-2 shadow-lg">
            <Feather name="arrow-down" size={16} color="white" />
            <Text className="text-white font-outfit-bold text-xs">
              {newIncomingCount} New
            </Text>
          </View>
        </Pressable>
      )}

      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
        {replyTarget && (
          <View className="px-4 pb-2">
            <View className="bg-card rounded-2xl p-3 flex-row items-center border border-border">
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-accent uppercase">
                  Replying to {replyTarget.authorName}
                </Text>
                <Text className="text-xs text-secondary" numberOfLines={1}>
                  {replyTarget.preview}
                </Text>
              </View>
              <Pressable onPress={onClearReplyTarget}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        )}

        {typing?.isTyping && (
          <View className="px-5 pb-2">
            <TypingIndicator />
          </View>
        )}

        <ChatComposer
          draft={draft}
          onDraftChange={onDraftChange}
          onSend={onSend}
          onOpenMenu={onOpenComposerMenu}
          pendingAttachment={pendingAttachment}
          onRemoveAttachment={onRemovePendingAttachment}
          isUploading={isUploadingAttachment}
          disabled={composerDisabled}
          placeholder={
            thread.id.startsWith("group:")
              ? "Message the group"
              : "Type a message"
          }
          isKeyboardVisible={isKeyboardVisible}
          insets={insets}
        />
      </View>
    </KeyboardAvoidingView>
  );
});
