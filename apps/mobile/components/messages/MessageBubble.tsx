import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@/components/ui/theme-icons";
import { ChatMessage } from "@/constants/messages";
import React from "react";
import { Image, Linking, Pressable, View } from "react-native";
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
  const { colors } = useAppTheme();
  const isUser = message.from === "user";

  return (
    <View className={`flex-row ${isUser ? "justify-end" : "justify-start"} mb-1`}>
      <Pressable
        onLongPress={() => onLongPress(message)}
        delayLongPress={260}
        className={`rounded-2xl ${isUser ? "bg-accent" : "bg-input"}`}
        style={[
          { 
            maxWidth: "85%", // Reduced for better balance
            paddingHorizontal: 16,
            paddingVertical: 12,
          },
          !isUser && {
            borderWidth: 1,
            borderColor: "rgba(34,197,94,0.15)",
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
              style={{ width: 240, height: 180, borderRadius: 12 }}
              resizeMode="cover"
            />
          </Pressable>
        ) : null}
        {message.mediaUrl && message.contentType !== "image" ? (
          <Pressable
            onPress={() => Linking.openURL(message.mediaUrl!)}
            className={`mb-2 rounded-xl px-4 py-2.5 ${isUser ? "bg-white/10" : "bg-secondary/10"}`}
          >
            <Text className={`text-sm font-outfit ${isUser ? "text-white" : "text-app"}`}>
              📄 Open attachment
            </Text>
          </Pressable>
        ) : null}
        
        <View className="flex-row items-end flex-wrap gap-x-3 gap-y-1">
          <Text className={`text-[15px] font-outfit leading-relaxed flex-shrink-1 ${isUser ? "text-white" : "text-app"}`}>
            {message.text}
          </Text>
          
          <View className="flex-row items-center ml-auto">
            <Text className={`text-[10px] font-outfit mt-1 ${isUser ? "text-white/60" : "text-secondary/60"}`}>
              {message.time}
            </Text>
            {isUser ? <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.6)" className="ml-1 mt-1" /> : null}
          </View>
        </View>

        {message.reactions?.length ? (
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            {message.reactions.map((reaction) => (
              <Pressable
                key={`${message.id}-${reaction.emoji}`}
                className={`rounded-full border px-2 py-0.5 ${isUser ? "border-white/20 bg-white/10" : "border-accent/10 bg-accent/5"}`}
                onPress={() => onReactionPress(message, reaction.emoji)}
              >
                <Text className={`text-[10px] font-bold font-outfit ${isUser ? "text-white" : "text-accent"}`}>
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