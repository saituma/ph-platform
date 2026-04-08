import React from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Feather } from "@/components/ui/theme-icons";

const EMOJIS = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "🙂",
  "😉",
  "😍",
  "😘",
  "😎",
  "🤩",
  "🥳",
  "😤",
  "😅",
  "🙏",
  "👏",
  "💪",
  "🔥",
  "❤️",
  "💯",
  "✨",
  "🎉",
  "✅",
  "❌",
  "⚽️",
  "🏋️‍♂️",
  "🥗",
  "📈",
  "🧠",
  "📝",
  "📹",
  "📎",
  "🔗",
  "👀",
  "🤝",
  "🚀",
  "🏆",
  "⭐️",
  "📣",
];

export function EmojiPickerModal({
  open,
  onClose,
  onSelectEmoji,
}: {
  open: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          className="px-5 flex-row items-center justify-between"
          style={{ paddingTop: Math.max(insets.top + 10, 18), paddingBottom: 12 }}
        >
          <Pressable
            onPress={onClose}
            className="h-11 w-11 rounded-2xl items-center justify-center border"
            style={{
              borderColor: isDark
                ? "rgba(255,255,255,0.10)"
                : "rgba(15,23,42,0.06)",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(15,23,42,0.03)",
            }}
          >
            <Feather name="x" size={20} color={colors.text} />
          </Pressable>
          <Text
            className="text-base font-clash font-bold"
            style={{ color: colors.text }}
          >
            Emojis
          </Text>
          <View className="h-11 w-11" />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom + 24, 28),
          }}
        >
          <View className="flex-row flex-wrap justify-between">
            {EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => onSelectEmoji(emoji)}
                className="mb-3 items-center justify-center rounded-[18px] border"
                style={{
                  width: "22%",
                  height: 58,
                  borderColor: colors.borderSubtle,
                  backgroundColor: colors.backgroundSecondary,
                }}
              >
                <Text className="text-[26px]">{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

