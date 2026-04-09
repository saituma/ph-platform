import { LiquidGlass } from "@/components/ui/LiquidGlass";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { AnimatedText } from "@/components/ScaledText";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Extrapolate,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Shadows } from "@/constants/theme";
import {
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from "expo-glass-effect";

export interface TabConfig {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline?: keyof typeof Ionicons.glyphMap;
  badgeCount?: number;
  hidden?: boolean;
}

interface TabBarProps {
  tabs: TabConfig[];
  activeIndex: number;
  onTabPress: (index: number) => void;
  scrollOffset?: SharedValue<number>;
}

interface TabItemProps {
  tab: TabConfig;
  index: number;
  activeIndex: number;
  onTabPress: (index: number) => void;
  scrollOffset?: SharedValue<number>;
  colors: any;
  isDark: boolean;
  pillSize: number;
  homePillSize: number;
  iconSize: number;
  homeIconSize: number;
  labelFontSize: number;
  labelMarginTop: number;
}

const TabItem = React.memo(
  ({
    tab,
    index,
    activeIndex,
    onTabPress,
    scrollOffset,
    colors,
    isDark,
    pillSize,
    homePillSize,
    iconSize,
    homeIconSize,
    labelFontSize,
    labelMarginTop,
  }: TabItemProps) => {
    const isHome = tab.key === "index";
    const effectivePillSize = isHome ? homePillSize : pillSize;
    const effectiveIconSize = isHome ? homeIconSize : iconSize;

    // Animated pill background: active = soft fill, inactive = transparent
    const pillStyle = useAnimatedStyle(() => {
      const activeBg = isDark
        ? "rgba(34, 197, 94, 0.15)"
        : "rgba(34, 197, 94, 0.1)";
      const inactiveBg = "transparent";

      if (!scrollOffset) {
        const active = index === activeIndex;
        return {
          backgroundColor: active ? activeBg : inactiveBg,
          transform: [{ scale: active ? 1.05 : 1 }],
        };
      }

      const distance = Math.min(Math.abs(scrollOffset.value - index), 1);
      const bgColor = interpolateColor(
        distance,
        [0, 1],
        [activeBg, inactiveBg],
      );
      const scale = interpolate(distance, [0, 1], [1.05, 1], Extrapolate.CLAMP);

      return { backgroundColor: bgColor, transform: [{ scale }] };
    }, [scrollOffset, index, activeIndex, isDark]);

    // Icon color animation
    const activeColor = colors.tint;
    // UI polish: keep inactive icons legible without using harsh pure-black tones.
    const inactiveColor = isDark
      ? "rgba(248,250,252,0.52)"
      : colors.textSecondary;

    const iconColorStyle = useAnimatedStyle(() => {
      if (!scrollOffset) {
        return { opacity: index === activeIndex ? 1 : 0.5 };
      }

      const distance = Math.abs(scrollOffset.value - index);
      const opacity = interpolate(
        distance,
        [0, 0.5, 1],
        [1, 0.65, 0.5],
        Extrapolate.CLAMP,
      );
      return { opacity };
    }, [scrollOffset, index, activeIndex]);

    const iconScaleStyle = useAnimatedStyle(() => {
      if (!scrollOffset) {
        return { transform: [{ scale: index === activeIndex ? 1.12 : 1 }] };
      }

      const distance = Math.abs(scrollOffset.value - index);
      const scale = interpolate(distance, [0, 1], [1.12, 1], Extrapolate.CLAMP);
      return { transform: [{ scale }] };
    }, [scrollOffset, index, activeIndex]);

    // Label animation (focused tab only)
    const labelStyle = useAnimatedStyle(() => {
      if (!scrollOffset) {
        const active = index === activeIndex;
        return {
          opacity: active ? 1 : 0,
        };
      }

      const distance = Math.min(Math.abs(scrollOffset.value - index), 1);
      const opacity = interpolate(distance, [0, 1], [1, 0], Extrapolate.CLAMP);
      return { opacity };
    }, [scrollOffset, index, activeIndex]);

    // Determine icon color based on active state (for non-animated layer)
    const activeTintStyle = useAnimatedStyle(() => {
      if (!scrollOffset) return { opacity: index === activeIndex ? 1 : 0 };
      const distance = Math.abs(scrollOffset.value - index);
      const opacity = interpolate(
        distance,
        [0, 0.5],
        [1, 0],
        Extrapolate.CLAMP,
      );
      return { opacity };
    });

    const inactiveTintStyle = useAnimatedStyle(() => {
      if (!scrollOffset) return { opacity: index === activeIndex ? 0 : 1 };
      const distance = Math.abs(scrollOffset.value - index);
      const opacity = interpolate(
        distance,
        [0, 0.5],
        [0, 1],
        Extrapolate.CLAMP,
      );
      return { opacity };
    });

    return (
      <Pressable
        onPress={() => onTabPress(index)}
        style={({ pressed }) => ({
          flexGrow: 1,
          flexBasis: 0,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 4,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        })}
      >
        {/* Soft filled pill — no border */}
        <Animated.View
          style={[
            {
              width: effectivePillSize,
              height: effectivePillSize,
              borderRadius: effectivePillSize / 2,
              alignItems: "center",
              justifyContent: "center",
            },
            pillStyle,
          ]}
        >
          <Animated.View
            style={[iconColorStyle, iconScaleStyle, { position: "relative" }]}
          >
            {/* Active icon layer */}
            <Animated.View style={[activeTintStyle, { position: "absolute" }]}>
              <Ionicons
                name={tab.icon}
                size={effectiveIconSize}
                color={activeColor}
              />
            </Animated.View>
            {/* Inactive icon layer */}
            <Animated.View style={inactiveTintStyle}>
              <Ionicons
                name={tab.iconOutline ?? tab.icon}
                size={effectiveIconSize}
                color={inactiveColor}
              />
            </Animated.View>
          </Animated.View>

          {/* Badge */}
          {tab.badgeCount && tab.badgeCount > 0 ? (
            <View
              style={{
                position: "absolute",
                top: -2,
                right: -4,
                minWidth: 16,
                height: 16,
                borderRadius: 999,
                backgroundColor: colors.danger,
                paddingHorizontal: 3,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AnimatedText
                style={{
                  color: "#FFFFFF",
                  fontSize: 10,
                  fontFamily: "Outfit-SemiBold",
                }}
                numberOfLines={1}
              >
                {tab.badgeCount > 99 ? "99+" : String(tab.badgeCount)}
              </AnimatedText>
            </View>
          ) : null}
        </Animated.View>

        {/* Label — shown only for focused tab */}
        <Animated.View
          style={[
            { marginTop: labelMarginTop, overflow: "hidden", height: 12 },
            labelStyle,
          ]}
        >
          <AnimatedText
            style={{
              color: "#22c55e",
              fontSize: labelFontSize,
              fontFamily: "Outfit-Medium",
              textAlign: "center",
            }}
            numberOfLines={1}
          >
            {tab.label}
          </AnimatedText>
        </Animated.View>
      </Pressable>
    );
  },
);
TabItem.displayName = "TabItem";

export function TabBar({
  tabs,
  activeIndex,
  onTabPress,
  scrollOffset,
}: TabBarProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const visibleTabs = tabs
    .map((tab, index) => ({ tab, index }))
    .filter(({ tab }) => !tab.hidden);

  const tabCount = visibleTabs.length;
  const compact = tabCount >= 7;

  const barHeight =
    Platform.OS === "ios" ? (compact ? 60 : 64) : compact ? 64 : 68;
  const safeBottom = Math.max(insets.bottom, Platform.OS === "ios" ? 10 : 8);
  const pillSize = compact ? 36 : 40;
  const homePillSize = compact ? 44 : 48;
  const iconSize = compact ? 18 : 20;
  const homeIconSize = compact ? 20 : 22;
  const labelFontSize = compact ? 9 : 10;
  const labelMarginTop = compact ? 2 : 3;

  const canUseLiquidGlass =
    Platform.OS === "ios" &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable();

  // Use semi-transparent tint for glass, but solid opaque theme color for fallback
  const glassTintColor = canUseLiquidGlass
    ? isDark
      ? "rgba(12, 12, 14, 0.55)"
      : "rgba(255, 255, 255, 0.55)"
    : isDark
      ? colors.cardElevated
      : colors.card;

  const borderTopColor = isDark
    ? "rgba(255, 255, 255, 0.22)"
    : "rgba(0, 0, 0, 0.10)";
  const highlightGradientColors: readonly [string, string, string] = isDark
    ? [
        "rgba(255,255,255,0.10)",
        "rgba(255,255,255,0.04)",
        "rgba(255,255,255,0.00)",
      ]
    : [
        "rgba(255,255,255,0.26)",
        "rgba(255,255,255,0.12)",
        "rgba(255,255,255,0.00)",
      ];

  return (
    <View
      pointerEvents="box-none"
      style={{
        width: "100%",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      <View
        style={{
          width: "100%",
          height: barHeight + safeBottom,
          ...Shadows.lg,
        }}
      >
        <LiquidGlass
          isInteractive
          glassStyle="regular"
          tintColor={glassTintColor}
          colorScheme={isDark ? "dark" : "light"}
          blurTint={isDark ? "dark" : "light"}
          blurIntensity={70}
          style={[
            StyleSheet.absoluteFill,
            {
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              flexDirection: "row",
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor,
              alignItems: "center",
              justifyContent: "space-around",
              paddingHorizontal: compact ? 8 : 12,
              paddingBottom: safeBottom,
              overflow: "hidden",
            },
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={highlightGradientColors}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {visibleTabs.map(({ tab, index }) => (
            <TabItem
              key={tab.key}
              tab={tab}
              index={index}
              activeIndex={activeIndex}
              onTabPress={onTabPress}
              scrollOffset={scrollOffset}
              colors={colors}
              isDark={isDark}
              pillSize={pillSize}
              homePillSize={homePillSize}
              iconSize={iconSize}
              homeIconSize={homeIconSize}
              labelFontSize={labelFontSize}
              labelMarginTop={labelMarginTop}
            />
          ))}
        </LiquidGlass>
      </View>
    </View>
  );
}
