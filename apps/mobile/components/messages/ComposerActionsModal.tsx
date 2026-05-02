import React from "react";
import { Pressable, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";
import { DetentSheet } from "@/components/native/DetentSheet";

type ComposerActionsModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  onAttachFile: () => void;
  onAttachImage: () => void;
  onAttachVideo: () => void;
  onTakePhoto: () => void;
  onRecordVideo: () => void;
  onOpenGifs: () => void;
  onOpenEmojis: () => void;
};

type ActionItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
  isDark: boolean;
};

const ActionItem = ({
  icon,
  label,
  onPress,
  color,
  isDark,
}: ActionItemProps) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      width: "30%",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      opacity: pressed ? 0.7 : 1,
      transform: [{ scale: pressed ? 0.95 : 1 }],
    })}
  >
    <View
      style={{
        height: 64,
        width: 64,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(15,23,42,0.03)",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
      }}
    >
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text
      style={{
        textAlign: "center",
        fontFamily: fonts.bodyBold,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: 1,
        color: isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)",
      }}
    >
      {label}
    </Text>
  </Pressable>
);

export function ComposerActionsModal({
  open,
  onClose,
  title,
  subtitle,
  onAttachFile,
  onAttachImage,
  onAttachVideo,
  onTakePhoto,
  onRecordVideo,
  onOpenGifs,
  onOpenEmojis,
}: ComposerActionsModalProps) {
  const { colors, isDark } = useAppTheme();
  const snapPoints = React.useMemo(() => ["68%"], []);

  const cardBg = isDark ? "hsl(220, 8%, 12%)" : colors.card;
  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.06)";
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";
  const textPrimary = isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)";

  return (
    <DetentSheet
      open={open}
      onClose={onClose}
      snapPoints={snapPoints}
      contentStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
    >
        <View
          style={{
            borderRadius: 20,
            borderWidth: 1,
            padding: 24,
            backgroundColor: cardBg,
            borderColor: cardBorder,
          }}
        >
          <View style={{ marginBottom: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text
                style={{
                  fontFamily: "ClashDisplay-Bold",
                  fontSize: 20,
                  color: textPrimary,
                }}
              >
                {title ?? "Add content"}
              </Text>
              <Text
                style={{
                  marginTop: 2,
                  fontFamily: "Outfit",
                  fontSize: 13,
                  color: labelColor,
                }}
              >
                {subtitle ?? "Share media or files with your coach"}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                height: 40,
                width: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(15,23,42,0.05)",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="close" size={20} color={labelColor} />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 24 }}>
            <ActionItem
              icon="images-outline"
              label="Gallery"
              onPress={() => {
                onAttachImage();
                onClose();
              }}
              color={isDark ? "hsl(220, 30%, 65%)" : "hsl(220, 40%, 50%)"}
              isDark={isDark}
            />
            <ActionItem
              icon="gift-outline"
              label="GIFs"
              onPress={() => {
                onOpenGifs();
                onClose();
              }}
              color={isDark ? "hsl(270, 25%, 65%)" : "hsl(270, 35%, 50%)"}
              isDark={isDark}
            />
            <ActionItem
              icon="camera-outline"
              label="Camera"
              onPress={() => {
                onTakePhoto();
                onClose();
              }}
              color={isDark ? "hsl(155, 25%, 55%)" : "hsl(155, 35%, 42%)"}
              isDark={isDark}
            />
            <ActionItem
              icon="happy-outline"
              label="Emoji"
              onPress={() => {
                onOpenEmojis();
                onClose();
              }}
              color={isDark ? "hsl(40, 30%, 60%)" : "hsl(40, 40%, 45%)"}
              isDark={isDark}
            />
            <ActionItem
              icon="videocam-outline"
              label="Video"
              onPress={() => {
                onAttachVideo();
                onClose();
              }}
              color={isDark ? "hsl(260, 25%, 65%)" : "hsl(260, 35%, 50%)"}
              isDark={isDark}
            />
            <ActionItem
              icon="document-text-outline"
              label="Files"
              onPress={() => {
                onAttachFile();
                onClose();
              }}
              color={isDark ? "hsl(40, 30%, 60%)" : "hsl(40, 40%, 45%)"}
              isDark={isDark}
            />
            <ActionItem
              icon="radio-outline"
              label="Record"
              onPress={() => {
                onRecordVideo();
                onClose();
              }}
              color={isDark ? "hsl(0, 30%, 60%)" : "hsl(0, 35%, 48%)"}
              isDark={isDark}
            />
          </View>
        </View>
    </DetentSheet>
  );
}
