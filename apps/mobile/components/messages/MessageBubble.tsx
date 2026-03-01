import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ChatMessage } from "@/constants/messages";
import React from "react";
import { Image, Linking, Modal, Pressable, View, useWindowDimensions } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Text } from "@/components/ScaledText";
import { Ionicons } from "@expo/vector-icons";

type MessageBubbleProps = {
  message: ChatMessage;
  onLongPress: (message: ChatMessage) => void;
  onReactionPress: (message: ChatMessage, emoji: string) => void;
};

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
  const player = useVideoPlayer({ uri }, (instance) => {
    instance.loop = false;
    instance.muted = muted;
  });

  React.useEffect(() => {
    if (!nativeControls) {
      (player as any)?.pause?.();
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
  const bubbleUser = isDark ? "#004E43" : "#DCF8C6";
  const bubbleOther = isDark ? "#1F2C34" : "#F3F4F6";
  const textColor = isDark ? "#E9EDEF" : "#111B21";
  const timeColor = isDark ? "#A2ADB7" : "#667781";
  const { width, height } = useWindowDimensions();
  const [imageSize, setImageSize] = React.useState<{ width: number; height: number } | null>(null);
  const [videoMeta, setVideoMeta] = React.useState<{ durationMs: number } | null>(null);
  const [mediaOpen, setMediaOpen] = React.useState(false);
  const [audioSound, setAudioSound] = React.useState<any | null>(null);
  const [audioPlaying, setAudioPlaying] = React.useState(false);
  const [audioDuration, setAudioDuration] = React.useState(0);
  const [audioPosition, setAudioPosition] = React.useState(0);
  const audioStatusSubscriptionRef = React.useRef<any | null>(null);

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

  React.useEffect(() => {
    return () => {
      audioStatusSubscriptionRef.current?.remove?.();
      audioSound?.remove?.();
    };
  }, [audioSound]);

  const toggleAudio = async () => {
    if (!message.mediaUrl) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });
      if (!audioSound) {
        const player = createAudioPlayer({ uri: message.mediaUrl });
        audioStatusSubscriptionRef.current = player.addListener?.("playbackStatusUpdate", (status: any) => {
          const nextDuration = Number(status?.duration ?? 0);
          const nextPosition = Number(status?.currentTime ?? 0);
          const didJustFinish = Boolean(status?.didJustFinish);
          setAudioPlaying(Boolean(status?.playing));
          setAudioDuration(Math.round(Math.max(0, nextDuration) * 1000));
          setAudioPosition(Math.round(Math.max(0, nextPosition) * 1000));
          if (didJustFinish) {
            setAudioPlaying(false);
          }
        });
        setAudioSound(player);
        player.play();
        return;
      }
      if (audioSound.playing) {
        audioSound.pause();
      } else {
        audioSound.play();
      }
    } catch (error) {
      console.warn("Failed to play audio", error);
    }
  };

  return (
    <View className="mb-2">
      <View
        style={{
          maxWidth: "86%",
          alignSelf: isUser ? "flex-end" : "flex-start",
        }}
      >
        <Pressable
          onLongPress={() => onLongPress(message)}
          delayLongPress={260}
          className="shadow-sm"
          style={[
            {
              paddingHorizontal: 14,
              paddingTop: 10,
              paddingBottom: 8,
              borderRadius: 16,
              backgroundColor: isUser ? bubbleUser : bubbleOther,
            },
            !isUser && {
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
              borderTopLeftRadius: 6,
              borderBottomLeftRadius: 4,
            },
            isUser && {
              borderTopRightRadius: 6,
              borderBottomRightRadius: 4,
            },
          ]}
        >
        {message.mediaUrl && message.contentType === "image" ? (
          <Pressable onPress={() => setMediaOpen(true)} className="mb-2">
            <Image
              source={{ uri: message.mediaUrl }}
              style={{ width: "100%", height: 200, borderRadius: 10 }}
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
          <Pressable
            onPress={toggleAudio}
            className="mb-2 rounded-xl px-3 py-2"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 rounded-full items-center justify-center bg-app/10">
                <Ionicons name={audioPlaying ? "pause" : "play"} size={18} color={colors.accent} />
              </View>
              <View className="flex-1">
                <View className="h-1.5 rounded-full bg-black/10 overflow-hidden">
                  <View
                    className="h-full bg-accent"
                    style={{
                      width: audioDuration ? `${(audioPosition / audioDuration) * 100}%` : "0%",
                    }}
                  />
                </View>
                <Text className="text-[10px] font-outfit text-secondary mt-1">
                  {formatDuration(audioPosition)} / {formatDuration(audioDuration)}
                </Text>
              </View>
            </View>
          </Pressable>
        ) : null}

        {message.mediaUrl && message.contentType !== "image" && message.contentType !== "video" && !isAudioMessage ? (
          <Pressable
            onPress={() => Linking.openURL(message.mediaUrl!)}
            className="mb-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }}
          >
            <Text className="text-sm font-outfit" style={{ color: textColor }}>
              Open attachment
            </Text>
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
          <Text className="text-[15px] font-outfit leading-relaxed flex-shrink-1" style={{ color: textColor }}>
            {message.text}
          </Text>
          
          <View className="flex-row items-center ml-auto">
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
            <View className="flex-row flex-wrap gap-1.5 mt-2">
              {message.reactions.map((reaction) => (
                <Pressable
                  key={`${message.id}-${reaction.emoji}`}
                  className="rounded-full border px-2 py-0.5"
                  style={{
                    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
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
            borderWidth: !isUser && !isDark ? 1 : 0,
            borderColor: !isUser && !isDark ? "rgba(0,0,0,0.06)" : "transparent",
          }}
        />
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
