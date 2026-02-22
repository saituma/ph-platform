import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ChatMessage } from "@/constants/messages";
import React from "react";
import { Image, Linking, Modal, Pressable, View, useWindowDimensions } from "react-native";
import { Audio, ResizeMode, Video } from "expo-av";
import { Text } from "@/components/ScaledText";
import { Ionicons } from "@expo/vector-icons";

type MessageBubbleProps = {
  message: ChatMessage;
  threadName: string;
  isGroup: boolean;
  onLongPress: (message: ChatMessage) => void;
  onReactionPress: (message: ChatMessage, emoji: string) => void;
};

export function MessageBubble({
  message,
  onLongPress,
  onReactionPress,
}: MessageBubbleProps) {
  const { colors, isDark } = useAppTheme();
  const isUser = message.from === "user";
  const bubbleUser = isDark ? "#056162" : "#DCF8C6";
  const bubbleOther = isDark ? "#1F2C34" : "#FFFFFF";
  const textColor = isDark ? "#E9EDEF" : "#111B21";
  const timeColor = isDark ? "#8696A0" : "#667781";
  const { width, height } = useWindowDimensions();
  const [imageSize, setImageSize] = React.useState<{ width: number; height: number } | null>(null);
  const [videoMeta, setVideoMeta] = React.useState<{ width: number; height: number; durationMs: number } | null>(null);
  const [mediaOpen, setMediaOpen] = React.useState(false);
  const [audioSound, setAudioSound] = React.useState<Audio.Sound | null>(null);
  const [audioPlaying, setAudioPlaying] = React.useState(false);
  const [audioDuration, setAudioDuration] = React.useState(0);
  const [audioPosition, setAudioPosition] = React.useState(0);

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
      audioSound?.unloadAsync();
    };
  }, [audioSound]);

  const toggleAudio = async () => {
    if (!message.mediaUrl) return;
    try {
      if (!audioSound) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: message.mediaUrl },
          { shouldPlay: true }
        );
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          setAudioPlaying(status.isPlaying);
          setAudioDuration(status.durationMillis ?? 0);
          setAudioPosition(status.positionMillis ?? 0);
          if (status.didJustFinish) {
            setAudioPlaying(false);
          }
        });
        setAudioSound(sound);
        return;
      }
      const status = await audioSound.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await audioSound.pauseAsync();
      } else {
        await audioSound.playAsync();
      }
    } catch (error) {
      console.warn("Failed to play audio", error);
    }
  };

  return (
    <View className={`flex-row ${isUser ? "justify-end" : "justify-start"} mb-1`}>
      <Pressable
        onLongPress={() => onLongPress(message)}
        delayLongPress={260}
        className="shadow-sm"
        style={[
          { 
            maxWidth: "82%",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: isUser ? bubbleUser : bubbleOther,
          },
          !isUser && {
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            borderBottomLeftRadius: 4,
          },
          isUser && {
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
              <Video
                source={{ uri: message.mediaUrl }}
                useNativeControls={false}
                resizeMode={ResizeMode.COVER}
                style={{ width: "100%", height: 200, borderRadius: 10 }}
                onLoad={(status) => {
                  if (!status?.isLoaded) return;
                  const naturalSize = "naturalSize" in status ? (status as any).naturalSize : null;
                  const width = typeof naturalSize?.width === "number" ? naturalSize.width : 0;
                  const height = typeof naturalSize?.height === "number" ? naturalSize.height : 0;
                  const durationMs = typeof status.durationMillis === "number" ? status.durationMillis : 0;
                  setVideoMeta((prev) => {
                    if (prev && prev.width === width && prev.height === height && prev.durationMs === durationMs) {
                      return prev;
                    }
                    return { width, height, durationMs };
                  });
                }}
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
              {videoMeta ? (
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
                    {videoMeta.width && videoMeta.height ? ` · ${videoMeta.width}×${videoMeta.height}` : ""}
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
                  <Video
                    source={{ uri: message.mediaUrl }}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    style={{
                      width: Math.min(width - 24, 420),
                      height: Math.min(height - 140, 600),
                    }}
                  />
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
    </View>
  );
}
