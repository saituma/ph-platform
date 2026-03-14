import { BlurView } from "expo-blur";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { AnimatedText } from "@/components/ScaledText";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
}

const PILL_SIZE = 40;
const HOME_PILL_SIZE = 48;
const ICON_SIZE = 20;
const HOME_ICON_SIZE = 22;

const TabItem = React.memo(
  ({
    tab,
    index,
    activeIndex,
    onTabPress,
    scrollOffset,
    colors,
    isDark,
  }: TabItemProps) => {
    const isHome = tab.key === "index";
    const pillSize = isHome ? HOME_PILL_SIZE : PILL_SIZE;
    const iconSize = isHome ? HOME_ICON_SIZE : ICON_SIZE;

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
      const scale = interpolate(
        distance,
        [0, 1],
        [1.05, 1],
        Extrapolate.CLAMP,
      );

      return { backgroundColor: bgColor, transform: [{ scale }] };
    }, [scrollOffset, index, activeIndex, isDark]);

    // Icon color animation
    const activeColor = colors.tint;
    // UI polish: keep inactive icons legible without using harsh pure-black tones.
    const inactiveColor = isDark ? "rgba(248,250,252,0.52)" : colors.textSecondary;

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
      const scale = interpolate(
        distance,
        [0, 1],
        [1.12, 1],
        Extrapolate.CLAMP,
      );
      return { transform: [{ scale }] };
    }, [scrollOffset, index, activeIndex]);

    // Label animation (focused tab only)
    const labelStyle = useAnimatedStyle(() => {
      if (!scrollOffset) {
        const active = index === activeIndex;
        return {
          opacity: active ? 1 : 0,
          height: active ? 12 : 0,
        };
      }

      const distance = Math.min(Math.abs(scrollOffset.value - index), 1);
      const opacity = interpolate(
        distance,
        [0, 1],
        [1, 0],
        Extrapolate.CLAMP,
      );
      const height = interpolate(
        distance,
        [0, 1],
        [12, 0],
        Extrapolate.CLAMP,
      );
      return { opacity, height };
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
              width: pillSize,
              height: pillSize,
              borderRadius: pillSize / 2,
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
                size={iconSize}
                color={activeColor}
              />
            </Animated.View>
            {/* Inactive icon layer */}
            <Animated.View style={inactiveTintStyle}>
              <Ionicons
                name={tab.iconOutline ?? tab.icon}
                size={iconSize}
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
            { marginTop: 3, overflow: "hidden" },
            labelStyle,
          ]}
        >
          <AnimatedText
            style={{
              color: "#22c55e",
              fontSize: 10,
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
  const barHeight = Platform.OS === "ios" ? 64 : 68;
  const visibleTabs = tabs
    .map((tab, index) => ({ tab, index }))
    .filter(({ tab }) => !tab.hidden);

  return (
    <View
      pointerEvents="box-none"
      style={{
        backgroundColor: "transparent",
        width: "100%",
        paddingBottom: 16 + insets.bottom, // Visual spacing from the bottom edge
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: "90%",
          height: barHeight,
          borderRadius: 32,
          overflow: "hidden",
          // UI polish: premium shadow
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.4 : 0.15,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: isDark ? 10 : 6,
        }}
      >
        <BlurView
          intensity={Platform.OS === "ios" ? 70 : 90}
          tint={isDark ? "dark" : "light"}
          style={[
            StyleSheet.absoluteFill,
            {
              flexDirection: "row",
              // UI polish: extremely subtle backgrounds to let blur lead the aesthetic.
              backgroundColor: isDark
                ? "rgba(10, 10, 10, 0.4)"
                : "rgba(255, 255, 255, 0.4)",
              borderWidth: isDark ? 1 : 0.5,
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.05)",
              alignItems: "center",
              justifyContent: "space-around", // Equal spacing as requested
              paddingHorizontal: 12,
            }
          ]}
        >
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
            />
          ))}
        </BlurView>
      </View>
    </View>
  );
}
