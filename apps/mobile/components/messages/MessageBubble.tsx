import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@/components/ui/theme-icons";
import { ChatMessage } from "@/constants/messages";
import React from "react";
import { Image, Linking, Pressable, View } from "react-native";
import { Text } from "@/components/ScaledText";

type MessageBubbleProps = {
  message: ChatMessage;
  threadName: string;
  isGroup: boolean;
  onLongPress: (message: ChatMessage) => void;
  onReactionPress: (message: ChatMessage, emoji: string) => void;
};

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0]?.[0] ?? "";
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function MessageBubble({
  message,
  threadName,
  isGroup,
  onLongPress,
  onReactionPress,
}: MessageBubbleProps) {
  const { colors } = useAppTheme();
  const isUser = message.from === "user";

  const avatar = !isUser ? message.authorAvatar : null;

  return (
    <View className={`flex-row ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        avatar ? (
          <View className="h-9 w-9 rounded-2xl overflow-hidden mr-3">
            <Image source={{ uri: avatar }} style={{ width: 36, height: 36 }} resizeMode="cover" />
          </View>
        ) : (
          <View
            className="h-9 w-9 rounded-2xl items-center justify-center mr-3"
            style={{ backgroundColor: colors.accentLight }}
          >
            <Text className="font-clash text-app text-sm">
              {getInitials(message.authorName || threadName)}
            </Text>
          </View>
        )
      ) : null}

      <Pressable
        onLongPress={() => onLongPress(message)}
        delayLongPress={260}
        className={`max-w-[75%] rounded-3xl px-4 py-3 ${isUser ? "bg-accent" : "bg-input"}`}
      >
        {!isUser && isGroup && message.authorName ? (
          <Text className="text-[0.625rem] font-outfit text-secondary mb-1">{message.authorName}</Text>
        ) : null}
        {message.mediaUrl && message.contentType === "image" ? (
          <Pressable onPress={() => Linking.openURL(message.mediaUrl!)} className="mb-2">
            <Image
              source={{ uri: message.mediaUrl }}
              style={{ width: 220, height: 160, borderRadius: 12 }}
              resizeMode="cover"
            />
          </Pressable>
        ) : null}
        {message.mediaUrl && message.contentType !== "image" ? (
          <Pressable
            onPress={() => Linking.openURL(message.mediaUrl!)}
            className={`mb-2 rounded-xl px-3 py-2 ${isUser ? "bg-white/10" : "bg-secondary/10"}`}
          >
            <Text className={`text-xs font-outfit ${isUser ? "text-white" : "text-app"}`}>
              Open attachment
            </Text>
          </Pressable>
        ) : null}
        <Text className={`text-sm font-outfit ${isUser ? "text-white" : "text-app"}`}>
          {message.text}
        </Text>

        {message.reactions?.length ? (
          <View className="flex-row flex-wrap gap-2 mt-2">
            {message.reactions.map((reaction) => (
              <Pressable
                key={`${message.id}-${reaction.emoji}`}
                className="rounded-full border border-app/10 px-2 py-1"
                onPress={() => onReactionPress(message, reaction.emoji)}
              >
                <Text className={`text-[0.625rem] font-outfit ${isUser ? "text-white/80" : "text-secondary"}`}>
                  {reaction.emoji} {reaction.count}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View className="flex-row items-center justify-end mt-2">
          <Text className={`text-[0.625rem] font-outfit ${isUser ? "text-white/70" : "text-secondary"}`}>
            {message.time}
          </Text>
          {isUser ? <Feather name="check" size={12} className="text-white/70 ml-2" /> : null}
        </View>
      </Pressable>
    </View>
  );
}