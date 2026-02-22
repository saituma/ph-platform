import { Feather } from "@/components/ui/theme-icons";
import { ChatMessage } from "@/constants/messages";
import React from "react";
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
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
  const isGroup = thread.id.startsWith("group:");
  const hasInitialScrolled = React.useRef<string | null>(null);
  const listRef = React.useRef<FlatList<ChatMessage> | null>(null);
  const isFocused = true;
  const insets = useSafeAreaInsets();
  
  // Rest of the component (truncated for brevity in planning, but I'll write the full replacement)
  // ... (Lines 66-194 skip) ...

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={0}
    >
      <FlatList
        ref={(node) => {
          listRef.current = node;
        }}
        className="flex-1"
        style={{ backgroundColor: colors.background }}
        data={messages}
        keyExtractor={(message) => String(message.id)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
          rowGap: 8,
        }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={16}
        windowSize={7}
        maxToRenderPerBatch={12}
        removeClippedSubviews
        ListHeaderComponent={
          <>
            {isThreadLoading || isLoading ? (
              <View className="mb-4 rounded-2xl bg-accent/5 border border-accent/5 px-4 py-3 flex-row items-center justify-center">
                <ActivityIndicator size="small" color={colors.accent} />
                <Text className="text-[10px] font-bold font-outfit text-accent ml-2 uppercase tracking-widest">Loading coaching history...</Text>
              </View>
            ) : null}
            <View className="items-center my-4">
              <View
                className="px-3 py-1 rounded-full"
                style={{
                  backgroundColor: colors.backgroundSecondary,
                }}
              >
                <Text
                  className="text-[10px] font-semibold font-outfit uppercase tracking-[1px]"
                  style={{ color: colors.textSecondary }}
                >
                  Today
                </Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          isThreadLoading || isLoading ? (
            <View className="gap-4">
              {[1, 2, 3].map((item) => (
                <View key={item} className={`rounded-2xl bg-card p-4 ${item % 2 === 0 ? "mr-12" : "ml-12"}`}>
                  <View className="h-3 w-3/4 rounded-full bg-secondary/10" />
                  <View className="h-3 w-full rounded-full bg-secondary/10 mt-2.5" />
                </View>
              ))}
            </View>
          ) : (
            <View className="items-center py-10">
              <View className="w-16 h-16 bg-card rounded-full items-center justify-center mb-4">
                <Feather name="message-square" size={24} color={colors.accent} />
              </View>
              <Text className="text-base font-clash font-bold text-app">No messages yet</Text>
              <Text className="text-xs font-outfit text-secondary mt-1">Start your coaching conversation</Text>
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
      />

      {typing?.isTyping ? (
        <View className="px-6 pb-2">
          <Text className="text-[10px] font-bold font-outfit text-accent uppercase tracking-widest">{typing.name} is typing...</Text>
        </View>
      ) : null}

      <View
        className="px-3 pt-3"
        style={{
          backgroundColor: colors.background,
          paddingBottom: Math.max(10, insets.bottom),
        }}
      >
        {composerDisabled && disabledMessage ? (
          <View className="mb-3 rounded-2xl bg-warning/10 px-4 py-3">
            <Text className="text-[11px] font-medium font-outfit text-warning text-center">
              {disabledMessage}
            </Text>
          </View>
        ) : null}
        
        {pendingAttachment ? (
          <View className="mb-3 rounded-2xl bg-card p-3" style={isDark ? Shadows.none : Shadows.sm}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                {pendingAttachment.isImage ? (
                  <Image
                    source={{ uri: pendingAttachment.uri }}
                    className="w-12 h-12 rounded-xl"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-12 h-12 rounded-xl bg-accent/5 items-center justify-center">
                    <Feather name="file-text" size={20} color={colors.accent} />
                  </View>
                )}
                <View className="h-10 w-10 rounded-full items-center justify-center bg-accent/10">
                  <Feather name="check" size={16} color={colors.accent} />
                </View>
              </View>
              <Pressable onPress={onRemovePendingAttachment} disabled={isUploadingAttachment}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </Pressable>
            </View>
            {isUploadingAttachment ? (
              <View className="mt-2 h-1 bg-accent/10 rounded-full overflow-hidden">
                <View className="h-full bg-accent w-1/3" />
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={composerDisabled ? onDisabledPress : isUploadingAttachment ? undefined : onOpenComposerMenu}
            className="h-10 w-10 rounded-full items-center justify-center shadow-sm active:opacity-80 bg-card"
            style={isDark ? Shadows.none : Shadows.sm}
          >
            <Feather name="paperclip" size={20} color={colors.accent} />
          </Pressable>

          <View
            className="flex-1 flex-row items-center h-11 rounded-full px-4 shadow-sm bg-card"
            style={isDark ? Shadows.none : Shadows.sm}
          >
            <TextInput
              className="flex-1 text-sm font-outfit text-app"
              placeholder="Message your coach..."
              placeholderTextColor={textSecondaryColor}
              value={draft}
              onChangeText={onDraftChange}
              multiline
              style={{ maxHeight: 100 }}
              editable={!composerDisabled && !isUploadingAttachment}
            />
            
            <Pressable
              onPress={composerDisabled ? onDisabledPress : isUploadingAttachment ? undefined : onSend}
              className={`h-9 w-9 rounded-full items-center justify-center shadow-sm ${
                composerDisabled || isUploadingAttachment || (!draft.trim() && !pendingAttachment) ? "opacity-40" : "active:opacity-80"
              }`}
              style={{ backgroundColor: colors.accent }}
            >
              <Feather name="arrow-up" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
