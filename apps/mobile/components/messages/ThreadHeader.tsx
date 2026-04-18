import { Feather } from "@/components/ui/theme-icons";
import React from "react";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";

import { MessageThread } from "@/types/messages";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Transition } from "@/components/navigation/TransitionStack";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { isLiquidGlassAvailable, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { LiquidGlass } from "@/components/ui/LiquidGlass";

type ThreadHeaderProps = {
  thread: MessageThread;
  onBack: () => void;
  sharedBoundTag?: string;
  sharedAvatarTag?: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function ThreadHeader({ thread, onBack, sharedBoundTag, sharedAvatarTag }: ThreadHeaderProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const headerBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const avatarBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(34,197,94,0.12)";
  const mutedPill = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";
  
  const summaryLabel = thread.id.startsWith("group:")
    ? "Group"
    : thread.premium
      ? "Priority"
      : "Direct";
  const statusLine = thread.lastSeen ?? thread.responseTime ?? "Coaching chat";

  const canUseLiquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  const glassTintColor = canUseLiquidGlass
    ? (isDark ? "rgba(12, 12, 14, 0.45)" : "rgba(255, 255, 255, 0.45)")
    : (isDark ? colors.cardElevated : colors.background);

  return (
    <View 
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
      }}
    >
      <LiquidGlass
        glassStyle="regular"
        tintColor={glassTintColor}
        blurIntensity={60}
        style={{
          paddingTop: insets.top,
          paddingBottom: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: headerBorder,
        }}
      >
        <Animated.View 
          entering={SlideInUp.duration(400)}
          className="px-3 py-1" 
        >
          <Transition.View
            sharedBoundTag={sharedBoundTag}
            className="overflow-hidden rounded-[24px] border px-4 py-2.5"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.4)", borderColor: headerBorder }}
          >
            <View
              className="absolute -right-10 -top-10 h-24 w-24 rounded-full"
              style={{ backgroundColor: isDark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.05)" }}
            />
            
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={onBack}
                className="h-9 w-9 rounded-full items-center justify-center active:opacity-70"
                style={{ backgroundColor: mutedPill }}
              >
                <Feather name="chevron-left" size={20} color={colors.text} />
              </Pressable>

              <Transition.View sharedBoundTag={sharedAvatarTag}>
                {thread.avatarUrl ? (
                  <View className="h-10 w-10 rounded-[14px] overflow-hidden border" style={{ borderColor: headerBorder }}>
                    <Image
                      source={{ uri: thread.avatarUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <View
                    className="h-10 w-10 rounded-[14px] items-center justify-center border"
                    style={{ backgroundColor: avatarBg, borderColor: headerBorder }}
                  >
                    <Text className="font-clash text-lg font-bold" style={{ color: colors.accent }}>
                      {getInitials(thread.name)}
                    </Text>
                  </View>
                )}
              </Transition.View>

              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="font-clash text-[16px] font-bold" numberOfLines={1} style={{ color: colors.text }}>
                    {thread.name}
                  </Text>
                  {thread.premium && (
                    <View className="h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                  <Text className="text-[11px] font-outfit font-medium" numberOfLines={1} style={{ color: colors.textSecondary }}>
                    {statusLine}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <View
                  className="rounded-full px-2.5 py-1 border"
                  style={{ 
                    backgroundColor: isDark ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.05)",
                    borderColor: isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)"
                  }}
                >
                  <Text className="text-[9px] font-outfit font-bold uppercase tracking-[1px]" style={{ color: colors.accent }}>
                    {summaryLabel}
                  </Text>
                </View>
                
                <Pressable
                  className="h-9 w-9 rounded-full items-center justify-center active:opacity-70"
                  style={{ backgroundColor: mutedPill }}
                >
                  <Feather name="more-horizontal" size={18} color={colors.text} />
                </Pressable>
              </View>
            </View>
          </Transition.View>
        </Animated.View>
      </LiquidGlass>
    </View>
  );
}
