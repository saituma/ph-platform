import React, { useMemo, useState, useRef } from "react";
import { View, Pressable, Linking, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ChatMessage } from "@/constants/messages";
import { Text } from "@/components/ScaledText";
import { Shadows } from "@/constants/theme";
import { OpenGraphPreview } from "@/components/media/OpenGraphPreview";

import { useMessageDimensions } from "@/hooks/messages/useMessageDimensions";
import { MessageMediaView } from "./MessageMediaView";
import { FullScreenMediaModal } from "./FullScreenMediaModal";

type MessageBubbleProps = {
  message: ChatMessage;
  onLongPress: (message: ChatMessage) => void;
  onReactionPress: (message: ChatMessage, emoji: string) => void;
  onOpenReactionPicker?: (message: ChatMessage) => void;
  onReply: (message: ChatMessage) => void;
  onJumpToMessage?: (messageId: number) => void;
  isHighlighted?: boolean;
  resolvedReplyPreview?: string | null;
  token?: string | null;
};

export const MessageBubble = React.memo(function MessageBubble({
  message,
  onLongPress,
  onReactionPress,
  onOpenReactionPicker,
  onReply,
  onJumpToMessage,
  isHighlighted,
  resolvedReplyPreview,
  token,
}: MessageBubbleProps) {
  const { colors, isDark } = useAppTheme();
  const isUser = message.from === "user";
  const [mediaOpen, setMediaOpen] = useState(false);
  const swipeRef = useRef<Swipeable | null>(null);

  const { maxMediaWidth, mediaDimensions, youtubeHeight } = useMessageDimensions(message.mediaUrl ?? null, message.contentType ?? null, isUser);

  const bubbleScale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: bubbleScale.value }] }));

  const urls = useMemo(() => {
    const matches = String(message.text || "").match(/https?:\/\/[^\s]+/gi) ?? [];
    return matches.slice(0, 1);
  }, [message.text]);

  const initials = useMemo(() => 
    (message.authorName || "?").split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join(""),
  [message.authorName]);

  return (
    <View className={`mb-1 ${isUser ? "items-end" : "items-start"}`}>
      <View className={`flex-row items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`} style={{ maxWidth: isUser ? "92%" : "88%" }}>
        {!isUser && (
          <Animated.View entering={FadeIn.delay(200)}>
            {message.authorAvatar ? (
              <Image source={{ uri: message.authorAvatar }} className="h-8 w-8 rounded-[12px]" />
            ) : (
              <View className="h-8 w-8 rounded-[12px] items-center justify-center bg-accent/10">
                <Text className="text-[10px] font-clash font-bold text-accent">{initials}</Text>
              </View>
            )}
          </Animated.View>
        )}

        <View style={{ flexShrink: 1 }}>
          {!isUser && message.authorName && (
            <Text className="mb-1 ml-1 text-[11px] font-outfit font-bold uppercase tracking-wider text-secondary">{message.authorName}</Text>
          )}

          <Swipeable
            renderLeftActions={() => (
              <View className="w-16 items-center justify-center">
                <View className="h-11 w-11 rounded-2xl items-center justify-center bg-accent/5 border border-accent/10">
                  <Ionicons name="arrow-undo-outline" size={20} color={colors.accent} />
                </View>
              </View>
            )}
            onSwipeableOpen={(d) => { if (d === "left") { onReply(message); swipeRef.current?.close(); } }}
            ref={swipeRef}
          >
            <Animated.View style={animatedStyle}>
              <Pressable
                onPressIn={() => bubbleScale.value = withSpring(0.98)}
                onPressOut={() => bubbleScale.value = withSpring(1)}
                onLongPress={() => onLongPress(message)}
                className="overflow-hidden p-3 rounded-3xl border bg-card"
                style={{
                  backgroundColor: isUser ? (isDark ? "#2F8F57" : "#E8F5EE") : colors.card,
                  borderColor: isHighlighted ? colors.accent : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"),
                  borderBottomLeftRadius: !isUser ? 4 : 24,
                  borderBottomRightRadius: isUser ? 4 : 24,
                  ...(isDark ? Shadows.none : Shadows.sm),
                }}
              >
                {message.replyToMessageId && (
                  <Pressable 
                    onPress={() => onJumpToMessage?.(message.replyToMessageId!)}
                    className="mb-2 p-2 rounded-xl bg-accent/5 border-l-2 border-accent"
                  >
                    <Text className="text-[11px] font-bold text-accent uppercase">Replying</Text>
                    <Text className="text-xs text-secondary" numberOfLines={1}>{message.replyPreview || resolvedReplyPreview}</Text>
                  </Pressable>
                )}

                {message.mediaUrl && (
                  <View className="mb-2">
                    <MessageMediaView
                      uri={message.mediaUrl}
                      contentType={message.contentType!}
                      width={mediaDimensions.width}
                      height={mediaDimensions.height}
                      onPress={() => setMediaOpen(true)}
                    />
                  </View>
                )}

                {message.text && (
                  <Text className="text-[16px] font-outfit text-app leading-6">{message.text}</Text>
                )}

                {token && urls.map(u => <OpenGraphPreview key={u} url={u} token={token} compact />)}

                <View className="flex-row items-center justify-end gap-1.5 mt-1">
                  <Text className="text-[10px] font-medium text-secondary/60">{message.time}</Text>
                  {isUser && <Ionicons name={message.status === "read" ? "checkmark-done" : "checkmark"} size={14} color={message.status === "read" ? "#34B7F1" : colors.textSecondary} />}
                  {onOpenReactionPicker && (
                    <Pressable onPress={() => onOpenReactionPicker(message)} className="ml-1 h-6 w-6 items-center justify-center rounded-full bg-accent/5">
                      <Ionicons name="add-circle-outline" size={14} color={colors.textSecondary} />
                    </Pressable>
                  )}
                </View>

                {message.reactions?.length ? (
                  <View className="flex-row flex-wrap gap-1.5 mt-2 pt-2 border-t border-black/5">
                    {message.reactions.map(r => (
                      <Pressable 
                        key={r.emoji} 
                        onPress={() => onReactionPress(message, r.emoji)}
                        className="px-2 py-1 rounded-full bg-accent/5 border border-accent/10 flex-row items-center gap-1"
                      >
                        <Text className="text-[10px]">{r.emoji}</Text>
                        <Text className="text-[10px] font-bold text-app">{r.count}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </Pressable>
            </Animated.View>
          </Swipeable>
        </View>
      </View>

      <FullScreenMediaModal 
        visible={mediaOpen} 
        onClose={() => setMediaOpen(false)} 
        uri={message.mediaUrl ?? null} 
        contentType={message.contentType} 
      />
    </View>
  );
});
