import React from "react";
import { TouchableOpacity, View } from "react-native";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Feather } from "@/components/ui/theme-icons";
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

type ActionItemProps = {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  color: string;
  isDark: boolean;
};

const ActionItem = ({ icon, label, onPress, color, isDark }: ActionItemProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className="w-[30%] items-center justify-center gap-2"
  >
    <View
      className="h-16 w-16 items-center justify-center rounded-[22px] border"
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.03)",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
      }}
    >
      <Feather name={icon} size={24} color={color} />
    </View>
    <Text
      className="text-center font-outfit text-[11px] font-bold uppercase tracking-wider"
      style={{ color: isDark ? "#94A3B8" : "#64748B" }}
    >
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
  const modalRef = React.useRef<BottomSheetModal>(null);
  const snapPoints = React.useMemo(() => ["58%"], []);

  React.useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    if (open) {
      modal.present();
      return;
    }
    modal.dismiss();
  }, [open]);

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      snapPoints={snapPoints}
      onDismiss={onClose}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.4}
          pressBehavior="close"
        />
      )}
      backgroundStyle={{
        backgroundColor: colors.card,
      }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? "rgba(255,255,255,0.28)" : "rgba(15,23,42,0.25)",
      }}
    >
      <BottomSheetView className="px-6 pb-8">
        <View
          className="rounded-[28px] border p-6"
          style={{
            backgroundColor: colors.card,
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
            ...(isDark ? Shadows.none : Shadows.lg),
          }}
        >
          <View className="mb-6 flex-row items-center justify-between">
            <View>
              <Text className="font-clash text-[20px] font-bold" style={{ color: colors.text }}>
                Add content
              </Text>
              <Text className="mt-0.5 font-outfit text-[13px]" style={{ color: colors.textSecondary }}>
                Share media or files with your coach
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)" }}
            >
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap justify-between gap-y-6">
            <ActionItem
              icon="image"
              label="Gallery"
              onPress={() => {
                onAttachImage();
                onClose();
              }}
              color="#3B82F6"
              isDark={isDark}
            />
            <ActionItem
              icon="camera"
              label="Camera"
              onPress={() => {
                onTakePhoto();
                onClose();
              }}
              color="#10B981"
              isDark={isDark}
            />
            <ActionItem
              icon="video"
              label="Video"
              onPress={() => {
                onAttachVideo();
                onClose();
              }}
              color="#8B5CF6"
              isDark={isDark}
            />
            <ActionItem
              icon="file-text"
              label="Files"
              onPress={() => {
                onAttachFile();
                onClose();
              }}
              color="#F59E0B"
              isDark={isDark}
            />
            <ActionItem
              icon="video"
              label="Record"
              onPress={() => {
                onRecordVideo();
                onClose();
              }}
              color="#EF4444"
              isDark={isDark}
            />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
