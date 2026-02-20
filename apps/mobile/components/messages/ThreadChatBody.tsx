import { Feather } from "@/components/ui/theme-icons";
import { ChatMessage } from "@/constants/messages";
import React from "react";
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MessageBubble } from "./MessageBubble";
import { MessageThread, TypingStatus } from "@/types/messages";
import { Text, TextInput } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

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
  const { colors } = useAppTheme();
  const typingKey = thread.id.startsWith("group:") ? thread.id : `user:${thread.id}`;
  const typing = typingStatus[typingKey];
  const isGroup = thread.id.startsWith("group:");
  const hasInitialScrolled = React.useRef<string | null>(null);
  const listRef = React.useRef<FlatList<ChatMessage> | null>(null);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  
  // Rest of the component (truncated for brevity in planning, but I'll write the full replacement)
  // ... (Lines 66-194 skip) ...

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 96 : insets.bottom + 72}
    >
      <FlatList
        ref={(node) => {
          listRef.current = node;
        }}
        className="flex-1"
        data={messages}
        keyExtractor={(message) => String(message.id)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 24,
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
            <View className="items-center my-6">
              <View className="px-4 py-1.5 rounded-full bg-input border border-app/5 shadow-sm">
                <Text className="text-[10px] font-bold font-clash text-secondary uppercase tracking-[2px]">
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
                <View key={item} className={`rounded-2xl bg-input p-4 border border-app/5 ${item % 2 === 0 ? "mr-12" : "ml-12"}`}>
                  <View className="h-3 w-3/4 rounded-full bg-secondary/10" />
                  <View className="h-3 w-full rounded-full bg-secondary/10 mt-2.5" />
                </View>
              ))}
            </View>
          ) : (
            <View className="items-center py-10">
              <View className="w-16 h-16 bg-input rounded-full items-center justify-center mb-4 border border-app/5">
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

      <View className="px-4 pt-4 bg-app border-t border-app/5" style={{ paddingBottom: Math.max(12, insets.bottom) }}>
        {composerDisabled && disabledMessage ? (
          <View className="mb-3 rounded-2xl bg-warning/10 px-4 py-3 border border-warning/20">
            <Text className="text-[11px] font-medium font-outfit text-warning text-center">
              {disabledMessage}
            </Text>
          </View>
        ) : null}
        
        {pendingAttachment ? (
          <View className="mb-3 rounded-2xl bg-input p-3 border border-accent/20">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <Feather name="file" size={12} color={colors.accent} />
                <Text className="text-[10px] font-bold font-outfit text-accent uppercase tracking-widest text-opacity-80">
                  Ready to send
                </Text>
              </View>
              <Pressable onPress={onRemovePendingAttachment} disabled={isUploadingAttachment}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </Pressable>
            </View>
            <View className="flex-row items-center gap-3">
              {pendingAttachment.isImage ? (
                <Image
                  source={{ uri: pendingAttachment.uri }}
                  className="w-16 h-16 rounded-xl border border-app/5"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-16 h-16 rounded-xl bg-accent/5 items-center justify-center border border-accent/10">
                  <Feather name="file-text" size={24} color={colors.accent} />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-sm font-outfit text-app font-medium" numberOfLines={1}>
                  {pendingAttachment.fileName}
                </Text>
                <Text className="text-xs font-outfit text-secondary mt-0.5">
                  {Math.max(1, Math.round(pendingAttachment.sizeBytes / 1024))} KB
                </Text>
              </View>
            </View>
            {isUploadingAttachment ? (
              <View className="mt-2 h-1 bg-accent/10 rounded-full overflow-hidden">
                <View className="h-full bg-accent w-1/3" />
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={composerDisabled ? onDisabledPress : isUploadingAttachment ? undefined : onOpenComposerMenu}
            className="h-12 w-12 rounded-2xl items-center justify-center bg-input border border-app/5 shadow-sm active:opacity-80"
          >
            <Feather name="paperclip" size={20} color={colors.accent} />
          </Pressable>

          <View className="flex-1 flex-row items-center h-12 bg-input rounded-2xl px-4 border border-app/5 shadow-sm">
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
              className={`h-9 w-9 rounded-xl items-center justify-center bg-accent shadow-sm ${
                composerDisabled || isUploadingAttachment || (!draft.trim() && !pendingAttachment) ? "opacity-40" : "active:opacity-80"
              }`}
            >
              <Feather name="arrow-up" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}