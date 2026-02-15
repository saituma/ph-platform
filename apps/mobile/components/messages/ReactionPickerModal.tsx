import { ChatMessage } from "@/constants/messages";
import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

type ReactionPickerModalProps = {
  reactionTarget: ChatMessage | null;
  options: string[];
  onClose: () => void;
  onSelect: (message: ChatMessage, emoji: string) => void;
};

export function ReactionPickerModal({
  reactionTarget,
  options,
  onClose,
  onSelect,
}: ReactionPickerModalProps) {
  return (
    <Modal visible={Boolean(reactionTarget)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/20 justify-end" onPress={onClose}>
        <View className="px-5 pb-8">
          <View className="rounded-3xl border border-app/10 bg-app px-4 py-4">
            <Text className="text-xs font-outfit text-secondary mb-3">React to message</Text>
            <View className="flex-row items-center justify-between">
              {options.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => reactionTarget && onSelect(reactionTarget, emoji)}
                  className="h-11 w-11 items-center justify-center rounded-2xl border border-app/10 bg-input"
                >
                  <Text className="text-xl">{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
