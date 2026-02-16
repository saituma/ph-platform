import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

type ComposerActionsModalProps = {
  open: boolean;
  onClose: () => void;
  onAttachFile: () => void;
  onAttachImage: () => void;
};

export function ComposerActionsModal({
  open,
  onClose,
  onAttachFile,
  onAttachImage,
}: ComposerActionsModalProps) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/20 justify-end" onPress={onClose}>
        <View className="px-5 pb-8">
          <View className="rounded-3xl border border-app/10 bg-app px-4 py-4">
            <Text className="text-xs font-outfit text-secondary mb-3">Quick actions</Text>
            <View className="gap-2">
              <Pressable className="rounded-2xl border border-app/10 bg-input px-4 py-3" onPress={onAttachFile}>
                <Text className="text-sm font-outfit text-app">Attach file</Text>
              </Pressable>
              <Pressable className="rounded-2xl border border-app/10 bg-input px-4 py-3" onPress={onAttachImage}>
                <Text className="text-sm font-outfit text-app">Attach image</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
