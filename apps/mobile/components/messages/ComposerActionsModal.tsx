import React from "react";
import { Modal, Pressable, View, TouchableOpacity } from "react-native";
import { Text } from "@/components/ScaledText";
import { Feather } from "@/components/ui/theme-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { Shadows } from "@/constants/theme";

type ComposerActionsModalProps = {
  open: boolean;
  onClose: () => void;
  onAttachFile: () => void;
  onAttachImage: () => void;
  onAttachVideo: () => void;
  onTakePhoto: () => void;
  onRecordVideo: () => void;
};

const ActionItem = ({ icon, label, onPress, color, isDark }: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className="items-center justify-center gap-2 w-[30%]"
  >
    <View 
      className="h-16 w-16 rounded-[22px] items-center justify-center border"
      style={{ 
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.03)",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)"
      }}
    >
      <Feather name={icon} size={24} color={color} />
    </View>
    <Text className="text-[11px] font-outfit font-bold uppercase tracking-wider text-center" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>
      {label}
    </Text>
  </TouchableOpacity>
);

export function ComposerActionsModal({
  open,
  onClose,
  onAttachFile,
  onAttachImage,
  onAttachVideo,
  onTakePhoto,
  onRecordVideo,
}: ComposerActionsModalProps) {
  const { colors, isDark } = useAppTheme();

  if (!open) return null;

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1">
        <Animated.View 
          entering={FadeIn}
          exiting={FadeOut}
          className="absolute inset-0 bg-black/40"
        >
          <Pressable className="flex-1" onPress={onClose} />
        </Animated.View>

        <View className="flex-1 justify-end px-4 pb-10">
          <Animated.View 
            entering={SlideInDown.springify().damping(25)}
            exiting={SlideOutDown}
            className="rounded-[36px] overflow-hidden border p-6"
            style={{ 
              backgroundColor: colors.card,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
              ...(isDark ? Shadows.none : Shadows.lg)
            }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text className="text-[20px] font-clash font-bold" style={{ color: colors.text }}>
                  Add content
                </Text>
                <Text className="text-[13px] font-outfit mt-0.5" style={{ color: colors.textSecondary }}>
                  Share media or files with your coach
                </Text>
              </View>
              <TouchableOpacity 
                onPress={onClose}
                className="h-10 w-10 rounded-full items-center justify-center"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)" }}
              >
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap justify-between gap-y-6">
              <ActionItem 
                icon="image" 
                label="Gallery" 
                onPress={() => { onAttachImage(); onClose(); }} 
                color="#3B82F6" 
                isDark={isDark} 
              />
              <ActionItem 
                icon="camera" 
                label="Camera" 
                onPress={() => { onTakePhoto(); onClose(); }} 
                color="#10B981" 
                isDark={isDark} 
              />
              <ActionItem 
                icon="video" 
                label="Video" 
                onPress={() => { onAttachVideo(); onClose(); }} 
                color="#8B5CF6" 
                isDark={isDark} 
              />
              <ActionItem 
                icon="mic" 
                label="Record" 
                onPress={() => { onRecordVideo(); onClose(); }} 
                color="#EF4444" 
                isDark={isDark} 
              />
              <ActionItem 
                icon="file-text" 
                label="Files" 
                onPress={() => { onAttachFile(); onClose(); }} 
                color="#F59E0B" 
                isDark={isDark} 
              />
              <View className="w-[30%]" /> 
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
