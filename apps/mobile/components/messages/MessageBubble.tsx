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

export function MessageBubble({
  message,
  onLongPress,
  onReactionPress,
}: MessageBubbleProps) {
  const { colors } = useAppTheme();
  const isUser = message.from === "user";

  return (
    <View className={`flex-row ${isUser ? "justify-end" : "justify-start"}`}>
      <Pressable
        onLongPress={() => onLongPress(message)}
        delayLongPress={260}
        className={`rounded-2xl ${isUser ? "bg-accent" : "bg-input"}`}
        style={[
          { 
            maxWidth: "95%",
            paddingHorizontal: 20, // Replacement for px-24
            paddingVertical: 20,   // Replacement for py-20
          },
          !isUser && {
            borderWidth: 1,
            borderColor: "rgba(34,197,94,0.25)",
            borderBottomLeftRadius: 4,
          },
          isUser && {
            borderBottomRightRadius: 4,
          },
        ]}
      >
        {message.mediaUrl && message.contentType === "image" ? (
          <Pressable onPress={() => Linking.openURL(message.mediaUrl!)} className="mb-2">
            <Image
              source={{ uri: message.mediaUrl }}
              style={{ width: 260, height: 200, borderRadius: 12 }}
              resizeMode="cover"
            />
          </Pressable>
        ) : null}
        {message.mediaUrl && message.contentType !== "image" ? (
          <Pressable
            onPress={() => Linking.openURL(message.mediaUrl!)}
            className={`mb-2 rounded-xl px-5 py-3 ${isUser ? "bg-white/10" : "bg-secondary/10"}`}
          >
            <Text className={`text-base font-outfit ${isUser ? "text-white" : "text-app"}`}>
              Open attachment
            </Text>
          </Pressable>
        ) : null}
        
        <View className="flex-row items-end justify-between gap-4">
          <Text className={`text-[1.0625rem] font-outfit leading-6 ${isUser ? "text-white" : "text-app"}`}>
            {message.text}
          </Text>
          
          <View className="flex-row items-center self-end mb-[-1px]">
            <Text className={`text-[0.75rem] font-outfit ${isUser ? "text-white/70" : "text-secondary"}`}>
              {message.time}
            </Text>
            {isUser ? <Feather name="check" size={12} className="text-white/70 ml-1.5" /> : null}
          </View>
        </View>

        {message.reactions?.length ? (
          <View className="flex-row flex-wrap gap-2 mt-2">
            {message.reactions.map((reaction) => (
              <Pressable
                key={`${message.id}-${reaction.emoji}`}
                className="rounded-full border border-app/10 px-2 py-1"
                onPress={() => onReactionPress(message, reaction.emoji)}
              >
                <Text className={`text-[0.6875rem] font-outfit ${isUser ? "text-white/80" : "text-secondary"}`}>
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