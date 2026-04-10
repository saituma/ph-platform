import React, { useMemo, useState, useRef } from "react";
import { View, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ChatMessage } from "@/constants/messages";
import { Text } from "@/components/ScaledText";
import { Shadows, fonts } from "@/constants/theme";
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

// Premium spring configuration for bubble press
const BUBBLE_SPRING = {
  damping: 16,
  stiffness: 200,
  mass: 0.6,
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
  const lastTapRef = useRef<number>(0);

  const { mediaDimensions } = useMessageDimensions(
    message.mediaUrl ?? null,
    message.contentType ?? null,
    isUser,
  );

  const bubbleScale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
  }));

  const urls = useMemo(() => {
    const matches =
      String(message.text || "").match(/https?:\/\/[^\s]+/gi) ?? [];
    return matches.slice(0, 1);
  }, [message.text]);

  const initials = useMemo(
    () =>
      (message.authorName || "?")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join(""),
    [message.authorName],
  );

  const hasReactions = (message.reactions?.length ?? 0) > 0;

  const handleSwipeOpen = (direction: "left" | "right") => {
    if (direction === "left") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onReply(message);
      swipeRef.current?.close();
    }
  };

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected!
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onReactionPress(message, "❤️");
      lastTapRef.current = 0; // Reset after double tap
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <View className={`mb-1 ${isUser ? "items-end" : "items-start"}`}>
      <View
        className={`flex-row items-end gap-2 w-full ${isUser ? "flex-row-reverse" : "flex-row"}`}
      >
        {!isUser && (
          <Animated.View entering={FadeIn.delay(100)}>
            {message.authorAvatar ? (
              <Image
                source={{ uri: message.authorAvatar }}
                className="h-8 w-8 rounded-[12px]"
              />
            ) : (
              <View
                className="h-8 w-8 rounded-[12px] items-center justify-center"
                style={{ backgroundColor: colors.surfaceHigher }}
              >
                <Text
                  className="text-[10px] font-bold uppercase"
                  style={{
                    color: colors.textSecondary,
                    fontFamily: fonts.labelBold,
                  }}
                >
                  {initials}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* WhatsApp/Telegram sizing style: 
          Container has a strict max width, so the bubble inside can naturally expand to fit content 
          up to 82% of the screen width, then it wraps the text.
        */}
        <View style={{ maxWidth: "82%" }}>
          {!isUser && message.authorName && (
            <Text
              className="mb-1 ml-1 text-[11px] font-bold uppercase tracking-wider"
              style={{
                color: colors.textSecondary,
                fontFamily: fonts.labelBold,
              }}
            >
              {message.authorName}
            </Text>
          )}

          <Swipeable
            ref={swipeRef}
            friction={1.5}
            rightThreshold={40}
            onSwipeableOpen={handleSwipeOpen}
            renderLeftActions={() => (
              <View className="w-16 items-center justify-center pl-2">
                <View
                  className="h-10 w-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.surfaceHigher }}
                >
                  <Ionicons
                    name="arrow-undo"
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>
              </View>
            )}
          >
            <Animated.View style={animatedStyle}>
              {/* Relative wrapper needed so absolute reactions render strictly below the bubble */}
              <View
                style={{
                  position: "relative",
                  marginBottom: hasReactions ? 20 : 6,
                }}
              >
                {/* The Message Bubble itself */}
                <Pressable
                  onPress={handlePress}
                  onPressIn={() =>
                    (bubbleScale.value = withSpring(0.97, BUBBLE_SPRING))
                  }
                  onPressOut={() =>
                    (bubbleScale.value = withSpring(1, BUBBLE_SPRING))
                  }
                  onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    onLongPress(message);
                  }}
                  className="overflow-hidden px-4 py-3 border"
                  style={{
                    backgroundColor: isUser
                      ? colors.surfaceHigher
                      : colors.surface,
                    borderColor: isHighlighted
                      ? colors.lime
                      : isDark
                        ? colors.borderSubtle
                        : "rgba(0,0,0,0.04)",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    borderBottomLeftRadius: !isUser ? 4 : 20,
                    borderBottomRightRadius: isUser ? 4 : 20,
                    ...(isDark ? Shadows.none : Shadows.sm),
                  }}
                >
                  {/* Reply Context Bar */}
                  {message.replyToMessageId && (
                    <Pressable
                      onPress={() =>
                        onJumpToMessage?.(message.replyToMessageId!)
                      }
                      className="mb-2 p-2 rounded-lg border-l-2"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(0,0,0,0.03)",
                        borderColor: colors.lime,
                      }}
                    >
                      <Text
                        className="text-[10px] uppercase tracking-wide"
                        style={{
                          color: colors.lime,
                          fontFamily: fonts.labelBold,
                        }}
                      >
                        Replying
                      </Text>
                      <Text
                        className="text-xs mt-0.5"
                        style={{
                          color: colors.textDim,
                          fontFamily: fonts.bodyMedium,
                        }}
                        numberOfLines={1}
                      >
                        {message.replyPreview || resolvedReplyPreview}
                      </Text>
                    </Pressable>
                  )}

                  {/* Media */}
                  {message.mediaUrl && (
                    <View className="mb-2 overflow-hidden rounded-xl">
                      <MessageMediaView
                        uri={message.mediaUrl}
                        contentType={message.contentType!}
                        width={mediaDimensions.width}
                        height={mediaDimensions.height}
                        onPress={() => setMediaOpen(true)}
                      />
                    </View>
                  )}

                  {/* Body Text */}
                  {message.text && (
                    <Text
                      className="text-[15px] leading-6"
                      style={{
                        color: colors.textPrimary,
                        fontFamily: fonts.bodyMedium,
                      }}
                    >
                      {message.text}
                    </Text>
                  )}

                  {token &&
                    urls.map((u) => (
                      <OpenGraphPreview key={u} url={u} token={token} compact />
                    ))}

                  {/* Meta Footer (Time & Status) */}
                  <View className="flex-row items-center justify-end gap-1 mt-1.5">
                    {onOpenReactionPicker && (
                      <Pressable
                        onPress={() => onOpenReactionPicker(message)}
                        className="mr-auto h-5 w-5 items-center justify-center rounded-full"
                      >
                        <Ionicons
                          name="add-outline"
                          size={14}
                          color={colors.textDim}
                        />
                      </Pressable>
                    )}
                    <Text
                      className="text-[10px]"
                      style={{
                        color: colors.textDim,
                        fontFamily: fonts.labelMedium,
                      }}
                    >
                      {message.time}
                    </Text>
                    {isUser && (
                      <Ionicons
                        name={
                          message.status === "read"
                            ? "checkmark-done"
                            : "checkmark"
                        }
                        size={14}
                        color={
                          message.status === "read"
                            ? colors.cyan
                            : colors.textDim
                        }
                      />
                    )}
                  </View>
                </Pressable>

                {/* Floating Reactions (Rendered OUTSIDE the overflow-hidden bubble) */}
                {hasReactions && (
                  <View
                    className="absolute flex-row flex-wrap gap-1 z-50"
                    style={{
                      bottom: -8,
                      maxWidth: "85%",
                      [isUser ? "right" : "left"]: 8,
                    }}
                  >
                    {message.reactions?.map((r) => (
                      <Pressable
                        key={r.emoji}
                        onPress={() => onReactionPress(message, r.emoji)}
                        className="px-2 py-1 rounded-full border flex-row items-center gap-1"
                        style={{
                          backgroundColor: isDark
                            ? colors.surfaceHigh
                            : "#FFFFFF",
                          borderColor: colors.borderSubtle,
                          ...Shadows.md, // Higher shadow to pop off the background
                        }}
                      >
                        <Text className="text-[11px]">{r.emoji}</Text>
                        <Text
                          className="text-[10px]"
                          style={{
                            color: colors.textPrimary,
                            fontFamily: fonts.labelBold,
                          }}
                        >
                          {r.count}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
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
