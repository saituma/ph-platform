import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { AnimatedText } from "@/components/ScaledText";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, View } from "react-native";
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

const RING_SIZE = 42;
const HOME_RING_SIZE = 54;
const ICON_SIZE = 20;
const HOME_ICON_SIZE = 24;

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
    const ringSize = isHome ? HOME_RING_SIZE : RING_SIZE;
    const iconSize = isHome ? HOME_ICON_SIZE : ICON_SIZE;

    // Animated ring border color: active = bright, inactive = subtle
    const ringStyle = useAnimatedStyle(() => {
      const activeBorder = "#22c55e";
      const inactiveBorder = isDark
        ? "rgba(255,255,255,0.18)"
        : "rgba(0,0,0,0.15)";

      if (!scrollOffset) {
        const active = index === activeIndex;
        return {
          borderColor: active ? activeBorder : inactiveBorder,
          transform: [{ scale: active ? 1.08 : 1 }],
        };
      }

      const distance = Math.min(Math.abs(scrollOffset.value - index), 1);
      const borderColor = interpolateColor(
        distance,
        [0, 1],
        [activeBorder, inactiveBorder],
      );
      const scale = interpolate(
        distance,
        [0, 1],
        [1.08, 1],
        Extrapolate.CLAMP,
      );

      return { borderColor, transform: [{ scale }] };
    }, [scrollOffset, index, activeIndex, isDark]);

    // Icon color animation
    const activeColor = isDark ? "#ffffff" : colors.tint;
    const inactiveColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";

    const iconColorStyle = useAnimatedStyle(() => {
      if (!scrollOffset) {
        return { opacity: index === activeIndex ? 1 : 0.55 };
      }

      const distance = Math.abs(scrollOffset.value - index);
      const opacity = interpolate(
        distance,
        [0, 0.5, 1],
        [1, 0.7, 0.55],
        Extrapolate.CLAMP,
      );
      return { opacity };
    }, [scrollOffset, index, activeIndex]);

    const iconScaleStyle = useAnimatedStyle(() => {
      if (!scrollOffset) {
        return { transform: [{ scale: index === activeIndex ? 1.15 : 1 }] };
      }

      const distance = Math.abs(scrollOffset.value - index);
      const scale = interpolate(
        distance,
        [0, 1],
        [1.15, 1],
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
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}
      >
        {/* Circular ring container */}
        <Animated.View
          style={[
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderWidth: 1.5,
              alignItems: "center",
              justifyContent: "center",
            },
            ringStyle,
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
  const barHeight = Platform.OS === "ios" ? 68 : 72;
  const visibleTabs = tabs
    .map((tab, index) => ({ tab, index }))
    .filter(({ tab }) => !tab.hidden);

  return (
    <View
      style={{
        backgroundColor: "transparent",
        paddingHorizontal: 12,
        paddingTop: 6,
        paddingBottom: 8 + insets.bottom,
        width: "100%",
        alignSelf: "stretch",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          width: "92%",
          alignSelf: "center",
          height: barHeight,
          backgroundColor: isDark
            ? "rgba(16, 16, 18, 0.92)"
            : "rgba(255, 255, 255, 0.95)",
          borderRadius: 32,
          borderWidth: isDark ? 0.5 : 1,
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.06)"
            : "rgba(0, 0, 0, 0.06)",
          justifyContent: "space-evenly",
          alignItems: "center",
          paddingHorizontal: 4,
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.35 : 0.12,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: isDark ? 12 : 10,
        }}
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
      </View>
    </View>
  );
}
