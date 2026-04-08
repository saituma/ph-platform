import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ChatMessage } from "@/constants/messages";
import React from "react";
import { Image, Linking, Modal, Pressable, View, useWindowDimensions } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Text } from "@/components/ScaledText";
import { isYoutubeUrl, YouTubeEmbed } from "@/components/media/VideoPlayer";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { Shadows } from "@/constants/theme";
import Animated, { 
  FadeIn, 
  FadeInRight, 
  FadeInLeft,
  useAnimatedStyle, 
  useSharedValue, 
  withSpring 
} from "react-native-reanimated";

type MessageBubbleProps = {
  message: ChatMessage;
  onLongPress: (message: ChatMessage) => void;
  onReactionPress: (message: ChatMessage, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
  onJumpToMessage?: (messageId: number) => void;
  isHighlighted?: boolean;
};

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function MessageVideoSurface({
  uri,
  height,
  contentFit = "cover",
  nativeControls = false,
  muted = true,
  onDurationMs,
}: {
  uri: string;
  height: number;
  contentFit?: "cover" | "contain";
  nativeControls?: boolean;
  muted?: boolean;
  onDurationMs?: (durationMs: number) => void;
}) {
  const source = React.useMemo(() => ({ uri }), [uri]);
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = false;
    instance.muted = muted;
    instance.staysActiveInBackground = false;
  });

  React.useEffect(() => {
    return () => {
      try {
        (player as any)?.pause?.();
      } catch {
        // noop
      }
    };
  }, [player]);

  React.useEffect(() => {
    if (!onDurationMs) return;
    const interval = setInterval(() => {
      const durationSec = Number((player as any)?.duration ?? 0);
      if (durationSec > 0) {
        onDurationMs(Math.round(durationSec * 1000));
      }
    }, 300);
    return () => clearInterval(interval);
  }, [onDurationMs, player]);

  return (
    <VideoView
      key={uri}
      player={player}
      nativeControls={nativeControls}
      contentFit={contentFit}
      fullscreenOptions={{ enable: true }}
      allowsPictureInPicture
      style={{ width: "100%", height, borderRadius: 18 }}
    />
  );
}

function MessageBubbleBase({
  message,
  onLongPress,
  onReactionPress,
  onReply,
  onJumpToMessage,
  isHighlighted = false,
}: MessageBubbleProps) {
  const { colors, isDark } = useAppTheme();
  const isUser = message.from === "user";
  const bubbleUser = isDark ? "#2F8F57" : "#E8F5EE";
  const bubbleOther = isDark ? colors.cardElevated : "#FFFFFF";
  const bubbleBorder = isUser
    ? isDark
      ? "rgba(255,255,255,0.08)"
      : "rgba(47,143,87,0.15)"
    : isDark
      ? "rgba(255,255,255,0.1)"
      : "rgba(15,23,42,0.06)";
  
  const textColor = isUser 
    ? (isDark ? "#FFFFFF" : "#064E3B") 
    : (isDark ? "#F8FAFC" : "#0F172A");
    
  const timeColor = isUser
    ? (isDark ? "rgba(255,255,255,0.6)" : "rgba(6,78,59,0.5)")
    : (isDark ? "#94A3B8" : "#64748B");

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [imageSize, setImageSize] = React.useState<{ width: number; height: number } | null>(null);
  const [videoMeta, setVideoMeta] = React.useState<{ durationMs: number } | null>(null);
  const [mediaOpen, setMediaOpen] = React.useState(false);
  const swipeRef = React.useRef<Swipeable | null>(null);

  // Dynamic media sizing
  const maxMediaWidth = screenWidth * (isUser ? 0.85 : 0.8);
  const mediaDimensions = React.useMemo(() => {
    if (!imageSize) return { width: maxMediaWidth, height: 220 };

    const aspectRatio = imageSize.width / imageSize.height;
    const calculatedHeight = maxMediaWidth / aspectRatio;

    // Cap height at 400 to prevent extremely long vertical images
    const finalHeight = Math.min(calculatedHeight, 400);
    // Recalculate width if height was capped to maintain aspect ratio
    const finalWidth = finalHeight === calculatedHeight ? maxMediaWidth : finalHeight * aspectRatio;

    return { width: finalWidth, height: finalHeight };
  }, [imageSize, maxMediaWidth]);

  const youtubeBubbleHeight = React.useMemo(
    () => Math.max(180, Math.round((maxMediaWidth * 9) / 16)),
    [maxMediaWidth],
  );
  
  const bubbleScale = useSharedValue(1);
  const animatedBubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }]
  }));

  const handlePressIn = () => { bubbleScale.value = withSpring(0.98); };
  const handlePressOut = () => { bubbleScale.value = withSpring(1); };

  const formatDuration = React.useCallback((ms: number) => {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const isAudioMessage = React.useMemo(() => {
    if (!message.mediaUrl) return false;
    const lower = message.mediaUrl.toLowerCase();
    return [".m4a", ".aac", ".mp3", ".wav", ".ogg", ".webm", ".caf"].some((ext) => lower.includes(ext));
  }, [message.mediaUrl]);

  const numericMessageId = React.useMemo(() => {
    const raw = String(message.id ?? "");
    const numeric = message.threadId.startsWith("group:")
      ? Number(raw.replace(/^group-/, ""))
      : Number(raw);
    return Number.isFinite(numeric) ? numeric : null;
  }, [message.id, message.threadId]);

  const handleReply = React.useCallback(() => {
    if (!numericMessageId) return;
    onReply(message);
    swipeRef.current?.close?.();
  }, [message, numericMessageId, onReply]);

  return (
    <View className={`mb-1 ${isUser ? "items-end" : "items-start"}`}>
      <View
        className={`flex-row items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
        style={{ maxWidth: isUser ? "92%" : "88%" }}
      >
        {!isUser ? (
          <Animated.View entering={FadeIn.delay(200)} className="mb-1">
            {message.authorAvatar ? (
              <Image source={{ uri: message.authorAvatar }} className="h-8 w-8 rounded-[12px]" />
            ) : (
              <View
                className="h-8 w-8 rounded-[12px] items-center justify-center"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(34,197,94,0.12)" }}
              >
                <Text className="text-[10px] font-clash font-bold" style={{ color: colors.accent }}>
                  {getInitials(message.authorName)}
                </Text>
              </View>
            )}
          </Animated.View>
        ) : null}

        <View style={{ flexShrink: 1 }}>
          {!isUser && message.authorName ? (
            <Text className="mb-1 ml-1 text-[11px] font-outfit font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
              {message.authorName}
            </Text>
          ) : null}
          
          <Swipeable
            enabled={Boolean(numericMessageId)}
            ref={(node) => {
              swipeRef.current = node;
            }}
            friction={2}
            leftThreshold={44}
            overshootLeft={false}
            overshootRight={false}
            renderLeftActions={() => (
              <View
                style={{
                  width: 64,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 16,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                  }}
                >
                  <Ionicons name="arrow-undo-outline" size={20} color={colors.accent} />
                </View>
              </View>
            )}
            onSwipeableOpen={(direction) => {
              if (direction === "left") handleReply();
            }}
          >
            <Animated.View style={animatedBubbleStyle}>
              <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onLongPress={() => onLongPress(message)}
                delayLongPress={260}
                className="overflow-hidden"
                style={[
                  {
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 10,
                    borderRadius: 22,
                    backgroundColor: isUser ? bubbleUser : bubbleOther,
                    borderWidth: isHighlighted ? 2 : 1,
                    borderColor: isHighlighted ? colors.accent : bubbleBorder,
                    ...(isDark ? Shadows.none : Shadows.sm),
                  },
                  !isUser && { borderBottomLeftRadius: 4 },
                  isUser && { borderBottomRightRadius: 4 },
                ]}
              >
              {/* Subtle background glow for user messages */}
              {isUser && (
                <View
                  className="absolute -right-8 -top-8 h-24 w-24 rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                />
              )}

              {message.replyToMessageId ? (
                <Pressable
                  onPress={() => {
                    if (!onJumpToMessage) return;
                    onJumpToMessage(message.replyToMessageId!);
                  }}
                  className="mb-3"
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: isUser
                      ? isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(6,78,59,0.45)"
                      : isDark
                        ? "rgba(255,255,255,0.35)"
                        : "rgba(15,23,42,0.2)",
                    paddingLeft: 10,
                    paddingVertical: 4,
                    borderRadius: 10,
                    backgroundColor: isUser
                      ? isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(6,78,59,0.08)"
                      : isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(15,23,42,0.04)",
                  }}
                >
                  <Text
                    numberOfLines={2}
                    className="text-[12px] font-outfit font-semibold"
                    style={{
                      color: isUser
                        ? isDark
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(6,78,59,0.9)"
                        : isDark
                          ? "rgba(248,250,252,0.9)"
                          : "rgba(15,23,42,0.85)",
                    }}
                  >
                    {message.replyPreview || "Replied message"}
                  </Text>
                </Pressable>
              ) : null}

              {message.mediaUrl && message.contentType === "image" ? (
                <Pressable onPress={() => setMediaOpen(true)} className="mb-3 -mx-1">
                  <Image
                    source={{ uri: message.mediaUrl }}
                    style={{ 
                      width: mediaDimensions.width, 
                      height: mediaDimensions.height, 
                      borderRadius: 14 
                    }}
                    resizeMode="cover"
                    onLoad={(event) => {
                      const { width, height } = event.nativeEvent.source;
                      if (width && height) {
                        setImageSize({ width, height });
                      }
                    }}
                  />
                </Pressable>
              ) : null}

              {message.mediaUrl && message.contentType === "video" ? (
                <Pressable onPress={() => setMediaOpen(true)} className="mb-3 -mx-1">
                  <View
                    style={{
                      width: isYoutubeUrl(message.mediaUrl) ? maxMediaWidth : mediaDimensions.width,
                      height: isYoutubeUrl(message.mediaUrl) ? youtubeBubbleHeight : mediaDimensions.height,
                      borderRadius: 18,
                      overflow: "hidden",
                    }}
                  >
                    {isYoutubeUrl(message.mediaUrl) ? (
                      <YouTubeEmbed url={message.mediaUrl} shouldPlay={false} initialMuted />
                    ) : (
                      <>
                        <MessageVideoSurface
                          uri={message.mediaUrl}
                          height={mediaDimensions.height}
                          onDurationMs={(durationMs) =>
                            setVideoMeta((prev) => (prev?.durationMs === durationMs ? prev : { durationMs }))
                          }
                        />
                        <View className="absolute inset-0 items-center justify-center">
                          <View className="h-12 w-12 rounded-full bg-black/40 items-center justify-center border border-white/20">
                            <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 4 }} />
                          </View>
                        </View>
                        {videoMeta?.durationMs ? (
                          <View className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60">
                            <Text className="text-[10px] font-bold font-outfit text-white">
                              {formatDuration(videoMeta.durationMs)}
                            </Text>
                          </View>
                        ) : null}
                      </>
                    )}
                  </View>
                </Pressable>
              ) : null}

              {message.mediaUrl && message.contentType !== "image" && message.contentType !== "video" && !isAudioMessage ? (
                <Pressable
                  onPress={() => Linking.openURL(message.mediaUrl!)}
                  className="mb-3 rounded-xl px-4 py-3 flex-row items-center gap-3"
                  style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)" }}
                >
                  <View className="h-8 w-8 rounded-lg bg-accent/20 items-center justify-center">
                    <Ionicons name="document-text" size={18} color={colors.accent} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-outfit font-bold" style={{ color: textColor }} numberOfLines={1}>
                      View Document
                    </Text>
                    <Text className="text-[11px] font-outfit" style={{ color: timeColor }}>
                      Tap to open
                    </Text>
                  </View>
                </Pressable>
              ) : null}

              <View className="gap-2">
                {message.text && 
                 message.text !== "Attachment" && 
                 !/\.(jpg|jpeg|png|webp|mp4|mov|m4a)$/i.test(message.text) ? (
                  <Text className="text-[16px] font-outfit leading-[24px]" style={{ color: textColor }}>
                    {message.text}
                  </Text>
                ) : null}

                <View className={`flex-row items-center gap-1.5 ${isUser ? "justify-end" : "justify-start"}`}>
                  <Text className="text-[10px] font-outfit font-medium" style={{ color: timeColor }}>
                    {message.time}
                  </Text>
                  {isUser ? (
                    message.status === "read" ? (
                      <Ionicons name="checkmark-done" size={15} color="#34B7F1" />
                    ) : (
                      <Ionicons name="checkmark" size={15} color={timeColor} />
                    )
                  ) : null}
                </View>
              </View>

              {message.reactions?.length ? (
                <View className="flex-row flex-wrap gap-2 mt-3 pt-3 border-t border-black/5">
                  {message.reactions.map((reaction) => (
                    <Pressable
                      key={`${message.id}-${reaction.emoji}`}
                      className="rounded-full border px-3 py-1.5 flex-row items-center gap-1.5"
                      style={{
                        borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.08)",
                        backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.8)",
                      }}
                      onPress={() => onReactionPress(message, reaction.emoji)}
                    >
                      <Text className="text-[12px]">{reaction.emoji}</Text>
                      <Text className="text-[11px] font-bold font-outfit" style={{ color: textColor }}>
                        {reaction.count}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Pressable>
          </Animated.View>
          </Swipeable>
        </View>
      </View>

      <Modal visible={mediaOpen} transparent animationType="fade" onRequestClose={() => setMediaOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.98)" }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View className="px-6 py-4 flex-row justify-end">
              <Pressable
                onPress={() => setMediaOpen(false)}
                className="h-10 w-10 rounded-full bg-white/10 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              {message.contentType === "image" ? (
                <Image
                  source={{ uri: message.mediaUrl }}
                  resizeMode="contain"
                  style={{
                    width: screenWidth,
                    height: screenHeight - 150,
                  }}
                />
              ) : message.mediaUrl && isYoutubeUrl(message.mediaUrl) ? (
                <View style={{ flex: 1, width: screenWidth, minHeight: screenHeight - 160 }}>
                  <YouTubeEmbed url={message.mediaUrl} shouldPlay initialMuted={false} />
                </View>
              ) : (
                <View style={{ width: screenWidth, height: screenHeight - 150 }}>
                  <MessageVideoSurface
                    uri={message.mediaUrl!}
                    height={screenHeight - 150}
                    contentFit="contain"
                    nativeControls
                    muted={false}
                  />
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const areMessageBubblesEqual = (prev: MessageBubbleProps, next: MessageBubbleProps) => {
  if (prev.message.id !== next.message.id) return false;
  if (prev.message.text !== next.message.text) return false;
  if (prev.message.time !== next.message.time) return false;
  if (prev.message.status !== next.message.status) return false;
  if (prev.message.mediaUrl !== next.message.mediaUrl) return false;
  if (prev.message.contentType !== next.message.contentType) return false;
  if (prev.message.replyToMessageId !== next.message.replyToMessageId) return false;
  if (prev.message.replyPreview !== next.message.replyPreview) return false;
  if (prev.isHighlighted !== next.isHighlighted) return false;
  
  const prevReactions = prev.message.reactions || [];
  const nextReactions = next.message.reactions || [];
  if (prevReactions.length !== nextReactions.length) return false;
  
  for (let i = 0; i < prevReactions.length; i++) {
    if (prevReactions[i].emoji !== nextReactions[i].emoji) return false;
    if (prevReactions[i].count !== nextReactions[i].count) return false;
  }

  return true;
};

import { SafeAreaView } from "react-native-safe-area-context";
export const MessageBubble = React.memo(MessageBubbleBase, areMessageBubblesEqual);
