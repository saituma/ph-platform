import React from "react";
import { Modal, Pressable, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { Feather } from "@/components/ui/theme-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

type ComposerActionsModalProps = {
  open: boolean;
  onClose: () => void;
  onAttachFile: () => void;
  onAttachImage: () => void;
  onAttachVideo: () => void;
  onTakePhoto: () => void;
  onRecordVideo: () => void;
  onRecordVoice: () => void;
};

export function ComposerActionsModal({
  open,
  onClose,
  onAttachFile,
  onAttachImage,
  onAttachVideo,
  onTakePhoto,
  onRecordVideo,
  onRecordVoice,
}: ComposerActionsModalProps) {
  const { colors } = useAppTheme();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/20 justify-end" onPress={onClose}>
        <View className="px-5 pb-8">
          <View className="rounded-3xl border border-app/10 bg-app px-4 py-4">
            <Text className="text-xs font-outfit text-secondary mb-3">Quick actions</Text>
            <View className="flex-row flex-wrap gap-3">
              <Pressable
                onPress={onAttachFile}
                accessibilityLabel="Attach file"
                className="h-14 w-14 rounded-2xl border border-app/10 bg-input items-center justify-center"
              >
                <Feather name="file-text" size={20} color={colors.accent} />
              </Pressable>
              <Pressable
                onPress={onAttachImage}
                accessibilityLabel="Attach image"
                className="h-14 w-14 rounded-2xl border border-app/10 bg-input items-center justify-center"
              >
                <Feather name="image" size={20} color={colors.accent} />
              </Pressable>
              <Pressable
                onPress={onAttachVideo}
                accessibilityLabel="Attach video"
                className="h-14 w-14 rounded-2xl border border-app/10 bg-input items-center justify-center"
              >
                <Feather name="video" size={20} color={colors.accent} />
              </Pressable>
              <Pressable
                onPress={onTakePhoto}
                accessibilityLabel="Take photo"
                className="h-14 w-14 rounded-2xl border border-app/10 bg-input items-center justify-center"
              >
                <Feather name="camera" size={20} color={colors.accent} />
              </Pressable>
              <Pressable
                onPress={onRecordVideo}
                accessibilityLabel="Record video"
                className="h-14 w-14 rounded-2xl border border-app/10 bg-input items-center justify-center"
              >
                <Feather name="video" size={20} color={colors.accent} />
              </Pressable>
              <Pressable
                onPress={onRecordVoice}
                accessibilityLabel="Record voice"
                className="h-14 w-14 rounded-2xl border border-app/10 bg-input items-center justify-center"
              >
                <Feather name="mic" size={20} color={colors.accent} />
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
