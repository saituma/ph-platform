import { ChatMessage } from "@/constants/messages";
import React from "react";
import { Modal, Pressable, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

type ReactionPickerModalProps = {
  reactionTarget: ChatMessage | null;
  options: string[];
  onClose: () => void;
  onSelect: (message: ChatMessage, emoji: string) => void;
  onOpenEmojiPicker?: (message: ChatMessage) => void;
};

export function ReactionPickerModal({
  reactionTarget,
  options,
  onClose,
  onSelect,
  onOpenEmojiPicker,
}: ReactionPickerModalProps) {
  const { colors, isDark } = useAppTheme();
  return (
    <Modal
      visible={Boolean(reactionTarget)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end"
        style={{
          backgroundColor: isDark ? "rgba(0,0,0,0.45)" : "rgba(15,23,42,0.25)",
        }}
        onPress={onClose}
      >
        <View className="px-5 pb-8">
          <View
            className="rounded-3xl border px-4 py-4"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.borderSubtle,
            }}
          >
            <Text
              className="text-xs font-outfit mb-3"
              style={{ color: colors.textSecondary }}
            >
              React to message
            </Text>
            <View className="flex-row items-center justify-between">
              {options.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() =>
                    reactionTarget && onSelect(reactionTarget, emoji)
                  }
                  className="h-11 w-11 items-center justify-center rounded-2xl border"
                  style={{
                    borderColor: colors.borderSubtle,
                    backgroundColor: colors.backgroundSecondary,
                  }}
                >
                  <Text className="text-xl">{emoji}</Text>
                </Pressable>
              ))}
              {reactionTarget && onOpenEmojiPicker ? (
                <Pressable
                  onPress={() => onOpenEmojiPicker(reactionTarget)}
                  className="h-11 w-11 items-center justify-center rounded-2xl border"
                  style={{
                    borderColor: colors.borderSubtle,
                    backgroundColor: colors.backgroundSecondary,
                  }}
                >
                  <Text className="text-xl">➕</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
