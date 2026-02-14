import { Feather } from "@/components/ui/theme-icons";
import { ChatMessage } from "@/constants/messages";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";

import { MessageBubble } from "./MessageBubble";
import { MessageThread, TypingStatus } from "@/types/messages";

type ThreadChatBodyProps = {
  thread: MessageThread;
  messages: ChatMessage[];
  draft: string;
  isLoading: boolean;
  isThreadLoading: boolean;
  typingStatus: TypingStatus;
  textSecondaryColor: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onOpenComposerMenu: () => void;
  onLongPressMessage: (message: ChatMessage) => void;
  onReactionPress: (message: ChatMessage, emoji: string) => void;
};

export function ThreadChatBody({
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
}: ThreadChatBodyProps) {
  const typingKey = thread.id.startsWith("group:") ? thread.id : `user:${thread.id}`;
  const typing = typingStatus[typingKey];
  const isGroup = thread.id.startsWith("group:");
  const listRef = React.useRef<FlatList<ChatMessage> | null>(null);
  const isFocused = useIsFocused();

  React.useEffect(() => {
    if (!messages.length) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  }, [messages.length, thread.id, isFocused]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        ref={(node) => {
          listRef.current = node;
        }}
        className="flex-1"
        data={messages}
        keyExtractor={(message) => String(message.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 16,
          rowGap: 16,
        }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={16}
        windowSize={7}
        maxToRenderPerBatch={12}
        removeClippedSubviews
        ListHeaderComponent={
          <>
            {isThreadLoading || isLoading ? (
              <View className="mb-4 rounded-2xl border border-app/10 bg-secondary/10 px-4 py-3 flex-row items-center">
                <ActivityIndicator size="small" color={textSecondaryColor} />
                <Text className="text-xs font-outfit text-secondary ml-2">Loading messages...</Text>
              </View>
            ) : null}
            <View className="items-center mb-6">
              <View className="px-3 py-1 rounded-full bg-secondary/10 border border-app/10">
                <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                  Today
                </Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          isThreadLoading || isLoading ? (
            <View className="gap-3">
              {[1, 2, 3].map((item) => (
                <View key={item} className="rounded-3xl border border-app/10 bg-input px-4 py-3">
                  <View className="h-3 w-24 rounded-full bg-secondary/20" />
                  <View className="h-3 w-full rounded-full bg-secondary/20 mt-2" />
                  <View className="h-3 w-2/3 rounded-full bg-secondary/20 mt-2" />
                </View>
              ))}
            </View>
          ) : (
            <View className="rounded-3xl border border-dashed border-app/20 p-4">
              <Text className="text-sm font-outfit text-secondary">No messages yet.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            threadName={thread.name}
            isGroup={isGroup}
            onLongPress={onLongPressMessage}
            onReactionPress={onReactionPress}
          />
        )}
        onContentSizeChange={() => {
          listRef.current?.scrollToEnd({ animated: false });
        }}
      />

      {typing?.isTyping ? (
        <View className="px-6 pb-3">
          <Text className="text-xs font-outfit text-secondary">{typing.name} is typing...</Text>
        </View>
      ) : null}

      <View className="px-6 pt-3 border-t border-app/10 bg-app pb-4">
        <View className="flex-row items-center rounded-3xl border px-4 py-3 bg-input border-app/10">
          <Pressable
            onPress={onOpenComposerMenu}
            className="h-9 w-9 rounded-2xl items-center justify-center bg-secondary/10 border border-app/10"
          >
            <Feather name="plus" size={16} className="text-secondary" />
          </Pressable>
          <TextInput
            className="flex-1 mx-3 text-sm font-outfit text-app"
            placeholder="Type your message..."
            placeholderTextColor={textSecondaryColor}
            value={draft}
            onChangeText={onDraftChange}
            multiline
          />
          <Pressable
            onPress={onSend}
            className="h-9 w-9 rounded-2xl items-center justify-center bg-accent"
            style={{ opacity: draft.trim() ? 1 : 0.6 }}
          >
            <Feather name="send" size={16} className="text-white" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
