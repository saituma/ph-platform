import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ChatMessage } from "@/constants/messages";
import React from "react";
import { Image, Linking, Modal, Pressable, View, useWindowDimensions } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Text } from "@/components/ScaledText";
import { Ionicons } from "@expo/vector-icons";
import { Shadows } from "@/constants/theme";

type MessageBubbleProps = {
  message: ChatMessage;
  onLongPress: (message: ChatMessage) => void;
  onReactionPress: (message: ChatMessage, emoji: string) => void;
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
        // noop: player may already be released
      }
    };
  }, [player]);

  React.useEffect(() => {
    if (!nativeControls) {
      try {
        (player as any)?.pause?.();
      } catch {
        // player may already be released
      }
    }
  }, [nativeControls, player]);

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
      style={{ width: "100%", height, borderRadius: 10 }}
    />
  );
}

function MessageBubbleBase({
  message,
  onLongPress,
  onReactionPress,
}: MessageBubbleProps) {
  const { colors, isDark } = useAppTheme();
  const isUser = message.from === "user";
  const bubbleUser = isDark ? "#14532D" : "#DCF8E6";
  const bubbleOther = isDark ? colors.cardElevated : "#FFFFFF";
  const bubbleBorder = isUser
    ? isDark
      ? "rgba(255,255,255,0.06)"
      : "rgba(34,197,94,0.18)"
    : isDark
      ? "rgba(255,255,255,0.08)"
      : "rgba(15,23,42,0.05)";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const timeColor = isDark ? "#94A3B8" : "#64748B";
  const { width, height } = useWindowDimensions();
  const [imageSize, setImageSize] = React.useState<{ width: number; height: number } | null>(null);
  const [videoMeta, setVideoMeta] = React.useState<{ durationMs: number } | null>(null);
  const [mediaOpen, setMediaOpen] = React.useState(false);
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

  return (
    <View className="mb-3">
      <View
        className={`flex-row items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
        style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "100%" }}
      >
        {!isUser ? (
          message.authorAvatar ? (
            <Image source={{ uri: message.authorAvatar }} className="h-8 w-8 rounded-full" />
          ) : (
            <View
              className="h-8 w-8 rounded-full items-center justify-center"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(34,197,94,0.10)" }}
            >
              <Text className="text-[10px] font-outfit font-bold" style={{ color: colors.accent }}>
                {getInitials(message.authorName)}
              </Text>
            </View>
          )
        ) : null}

        <View
          style={{
            maxWidth: isUser ? "82%" : "80%",
            alignSelf: isUser ? "flex-end" : "flex-start",
          }}
        >
          {!isUser && message.authorName ? (
            <Text className="mb-1 ml-3 text-[11px] font-outfit font-semibold" style={{ color: colors.textSecondary }}>
              {message.authorName}
            </Text>
          ) : null}
          <Pressable
            onLongPress={() => onLongPress(message)}
            delayLongPress={260}
            className="overflow-hidden"
            style={[
              {
                paddingHorizontal: 14,
                paddingTop: 10,
                paddingBottom: 8,
                borderRadius: 24,
                backgroundColor: isUser ? bubbleUser : bubbleOther,
                borderWidth: 1,
                borderColor: bubbleBorder,
                ...(isDark ? Shadows.none : Shadows.sm),
              },
              !isUser && {
                borderTopLeftRadius: 8,
                borderBottomLeftRadius: 8,
              },
              isUser && {
                borderTopRightRadius: 8,
                borderBottomRightRadius: 8,
              },
            ]}
          >
            <View
              className="absolute -right-6 -top-6 h-16 w-16 rounded-full"
              style={{ backgroundColor: isUser ? "rgba(255,255,255,0.08)" : isDark ? "rgba(255,255,255,0.03)" : "rgba(34,197,94,0.05)" }}
            />
        {message.mediaUrl && message.contentType === "image" ? (
          <Pressable onPress={() => setMediaOpen(true)} className="mb-2">
            <Image
              source={{ uri: message.mediaUrl }}
              style={{ width: "100%", height: 200, borderRadius: 16 }}
              resizeMode="cover"
              onLoad={(event) => {
                const source = event.nativeEvent?.source;
                if (source?.width && source?.height) {
                  setImageSize({ width: source.width, height: source.height });
                }
              }}
            />
            {imageSize ? (
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  borderRadius: 8,
                  backgroundColor: "rgba(0,0,0,0.45)",
                }}
              >
                <Text className="text-[10px] font-semibold font-outfit text-white">
                  {imageSize.width}×{imageSize.height}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
        {message.mediaUrl && message.contentType === "video" ? (
          <Pressable onPress={() => setMediaOpen(true)} className="mb-2">
            <View>
              <MessageVideoSurface
                uri={message.mediaUrl}
                height={200}
                onDurationMs={(durationMs) =>
                  setVideoMeta((prev) => (prev?.durationMs === durationMs ? prev : { durationMs }))
                }
              />
              <View
                style={{
                  position: "absolute",
                  inset: 0,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    height: 44,
                    width: 44,
                    borderRadius: 22,
                    backgroundColor: "rgba(0,0,0,0.45)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="play" size={22} color="#FFFFFF" />
                </View>
              </View>
              {videoMeta?.durationMs ? (
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    borderRadius: 8,
                    backgroundColor: "rgba(0,0,0,0.45)",
                  }}
                >
                  <Text className="text-[10px] font-semibold font-outfit text-white">
                    {formatDuration(videoMeta.durationMs)}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        ) : null}
        {isAudioMessage ? (
          <View
            className="mb-2 rounded-2xl px-3 py-3"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)" }}
          >
            <Text className="text-[12px] font-outfit" style={{ color: textColor }}>
              Voice messages are disabled.
            </Text>
          </View>
        ) : null}

        {message.mediaUrl && message.contentType !== "image" && message.contentType !== "video" && !isAudioMessage ? (
          <Pressable
            onPress={() => Linking.openURL(message.mediaUrl!)}
            className="mb-2 rounded-2xl px-3 py-3"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)" }}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="attach" size={16} color={colors.accent} />
              <Text className="text-sm font-outfit font-semibold" style={{ color: textColor }}>
                Open attachment
              </Text>
            </View>
          </Pressable>
        ) : null}

        {message.mediaUrl && (message.contentType === "image" || message.contentType === "video") ? (
          <Modal visible={mediaOpen} transparent animationType="fade" onRequestClose={() => setMediaOpen(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}>
              <Pressable
                onPress={() => setMediaOpen(false)}
                style={{
                  position: "absolute",
                  top: 48,
                  right: 20,
                  height: 36,
                  width: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                }}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Pressable>

              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                {message.contentType === "image" ? (
                  <Image
                    source={{ uri: message.mediaUrl }}
                    resizeMode="contain"
                    style={{
                      width: Math.min(width - 24, 420),
                      height: Math.min(height - 120, 600),
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: Math.min(width - 24, 420),
                      height: Math.min(height - 140, 600),
                    }}
                  >
                    <MessageVideoSurface
                      uri={message.mediaUrl}
                      height={Math.min(height - 140, 600)}
                      contentFit="contain"
                      nativeControls
                      muted={false}
                    />
                  </View>
                )}
              </View>
            </View>
          </Modal>
        ) : null}
        
        <View className="flex-row items-end flex-wrap gap-x-3 gap-y-1">
          {message.text ? (
            <Text className="text-[15px] font-outfit leading-relaxed flex-shrink-1" style={{ color: textColor }}>
              {message.text}
            </Text>
          ) : null}

          <View className="flex-row items-center ml-auto rounded-full px-2 py-1" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.55)" }}>
            <Text className="text-[10px] font-outfit mt-1" style={{ color: timeColor }}>
              {message.time}
            </Text>
            {isUser ? (
              message.status === "read" ? (
                <Ionicons name="checkmark-done" size={14} color="#34B7F1" className="ml-1 mt-1" />
              ) : (
                <Ionicons name="checkmark" size={14} color={timeColor} className="ml-1 mt-1" />
              )
            ) : null}
          </View>
        </View>

          {message.reactions?.length ? (
            <View className="flex-row flex-wrap gap-1.5 mt-3">
              {message.reactions.map((reaction) => (
                <Pressable
                  key={`${message.id}-${reaction.emoji}`}
                  className="rounded-full border px-2.5 py-1"
                  style={{
                    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)",
                  }}
                  onPress={() => onReactionPress(message, reaction.emoji)}
                >
                  <Text className="text-[10px] font-bold font-outfit" style={{ color: textColor }}>
                    {reaction.emoji} {reaction.count}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          </Pressable>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: 6,
              ...(isUser ? { right: -4 } : { left: -4 }),
              width: 10,
              height: 10,
              backgroundColor: isUser ? bubbleUser : bubbleOther,
              transform: [{ rotate: "45deg" }],
              borderBottomLeftRadius: isUser ? 2 : 0,
              borderTopRightRadius: isUser ? 0 : 2,
              borderWidth: 1,
              borderColor: bubbleBorder,
            }}
          />
        </View>
      </View>
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
  
  // Compare reactions properly
  const prevReactions = prev.message.reactions || [];
  const nextReactions = next.message.reactions || [];
  if (prevReactions.length !== nextReactions.length) return false;
  
  for (let i = 0; i < prevReactions.length; i++) {
    if (prevReactions[i].emoji !== nextReactions[i].emoji) return false;
    if (prevReactions[i].count !== nextReactions[i].count) return false;
  }

  return true;
};

export const MessageBubble = React.memo(MessageBubbleBase, areMessageBubblesEqual);
