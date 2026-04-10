import React from "react";
import { View, Pressable, Image, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeOutDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { LiquidGlass } from "@/components/ui/LiquidGlass";
import { Text, TextInput } from "@/components/ScaledText";
import { Shadows } from "@/constants/theme";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

interface Props {
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  onOpenMenu: () => void;
  pendingAttachment?: {
    uri: string;
    isImage: boolean;
    fileName: string;
    sizeBytes: number;
  } | null;
  onRemoveAttachment?: () => void;
  isUploading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  isKeyboardVisible: boolean;
  insets: any;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ChatComposer({
  draft,
  onDraftChange,
  onSend,
  onOpenMenu,
  pendingAttachment,
  onRemoveAttachment,
  isUploading,
  disabled,
  placeholder,
  isKeyboardVisible,
  insets,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const plusButtonScale = useSharedValue(1);
  const sendButtonScale = useSharedValue(1);

  const plusStyle = useAnimatedStyle(() => ({ transform: [{ scale: plusButtonScale.value }] }));
  const sendStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendButtonScale.value }] }));

  const hasContent = draft.trim().length > 0 || !!pendingAttachment;
  const canSend = !disabled && !isUploading && hasContent;

  return (
    <LiquidGlass
      glassStyle="regular"
      tintColor={isDark ? "rgba(12, 12, 14, 0.45)" : "rgba(255, 255, 255, 0.45)"}
      blurIntensity={70}
      style={{
        paddingBottom: isKeyboardVisible ? 12 : Math.max(12, insets.bottom),
        paddingTop: 10,
        paddingHorizontal: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
      }}
    >
      {pendingAttachment && (
        <Animated.View entering={FadeInDown} exiting={FadeOutDown} className="mb-3 mx-1 rounded-[24px] border p-3 bg-card" style={isDark ? Shadows.none : Shadows.md}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-3">
              {pendingAttachment.isImage ? (
                <Image source={{ uri: pendingAttachment.uri }} className="w-14 h-14 rounded-[18px]" />
              ) : (
                <View className="w-14 h-14 rounded-[18px] items-center justify-center bg-accent/10">
                  <Feather name="file-text" size={22} color={colors.accent} />
                </View>
              )}
              <Text className="text-sm font-outfit font-bold text-app" numberOfLines={1}>{pendingAttachment.fileName}</Text>
            </View>
            <Pressable onPress={onRemoveAttachment} disabled={isUploading}>
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </Pressable>
          </View>
          {isUploading && <View className="h-1.5 bg-accent/10 rounded-full mt-3 overflow-hidden"><View className="h-full bg-accent w-1/3" /></View>}
        </Animated.View>
      )}

      <View className="flex-row items-end gap-2.5">
        <View className="flex-1 rounded-[28px] border flex-row items-end p-1 bg-card" style={isDark ? Shadows.none : Shadows.sm}>
          <AnimatedPressable
            onPress={onOpenMenu}
            className="h-10 w-10 rounded-full items-center justify-center bg-accent/5"
            style={plusStyle}
            onPressIn={() => plusButtonScale.value = withSpring(0.9)}
            onPressOut={() => plusButtonScale.value = withSpring(1)}
          >
            <Feather name="plus" size={22} color={colors.accent} />
          </AnimatedPressable>

          <TextInput
            className="flex-1 text-[16px] font-outfit mx-2 my-2 text-app"
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            value={draft}
            onChangeText={onDraftChange}
            multiline
            style={{ minHeight: 24, maxHeight: 150 }}
            editable={!disabled && !isUploading}
          />
        </View>

        <AnimatedPressable
          onPress={onSend}
          disabled={!canSend}
          className="h-12 w-12 rounded-full items-center justify-center"
          style={[sendStyle, { backgroundColor: canSend ? colors.accent : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)") }]}
          onPressIn={() => sendButtonScale.value = withSpring(0.85)}
          onPressOut={() => sendButtonScale.value = withSpring(1)}
        >
          {isUploading || disabled ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="send" size={20} color="white" />}
        </AnimatedPressable>
      </View>
    </LiquidGlass>
  );
}
