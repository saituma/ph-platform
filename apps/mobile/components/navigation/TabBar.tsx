import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";

const AnimatedIcon = Animated.createAnimatedComponent(Ionicons);

export interface TabConfig {
  key: string;
  label?: string;
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

interface TabLayoutConfig {
  pillWidth: number;
  pillHeight: number;
  iconSize: number;
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
    layout,
  }: {
    tab: TabConfig;
    index: number;
    activeIndex: number;
    onTabPress: (index: number) => void;
    scrollOffset?: SharedValue<number>;
    colors: any;
    isDark: boolean;
    layout: TabLayoutConfig;
  }) => {
    const activeIconColor = colors.tint;
    const inactiveIconColor = colors.textDim;
    const activeBgColor = isDark ? colors.surfaceHigher : colors.limeGlow;

    const iconName =
      activeIndex === index ? tab.icon : (tab.iconOutline ?? tab.icon);

    const getDistance = () => {
      "worklet";
      if (scrollOffset) {
        return Math.min(Math.abs(scrollOffset.value - index), 1);
      }
      return index === activeIndex ? 0 : 1;
    };

    const pillStyle = useAnimatedStyle(() => {
      const distance = getDistance();
      const scale = 1 - distance * 0.15;
      const opacity = Math.max(0, 1 - distance);

      return {
        backgroundColor: activeBgColor,
        transform: [{ scale }],
        opacity,
      };
    });

    const iconColorStyle = useAnimatedStyle(() => {
      const distance = getDistance();
      const color = interpolateColor(
        distance,
        [0, 1],
        [activeIconColor, inactiveIconColor],
      );
      return { color };
    });

    const iconContainerStyle = useAnimatedStyle(() => {
      const distance = getDistance();
      const translateY = distance * 6 - 6;
      return { transform: [{ translateY }] };
    });

    const handlePress = () => {
      if (index !== activeIndex) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onTabPress(index);
    };

    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={tab.label ?? tab.key}
        accessibilityState={{ selected: activeIndex === index }}
        style={({ pressed }) => [
          styles.tabItemContainer,
          pressed && { transform: [{ scale: 0.94 }] },
        ]}
      >
        <Animated.View
          style={[
            { alignItems: "center", justifyContent: "center" },
            iconContainerStyle,
          ]}
        >
          <Animated.View
            style={[
              {
                position: "absolute",
                width: layout.pillWidth,
                height: layout.pillHeight,
                borderRadius: layout.pillHeight / 2,
              },
              pillStyle,
            ]}
          />

          <AnimatedIcon
            name={iconName}
            size={layout.iconSize}
            style={[iconColorStyle, { zIndex: 2 }]}
          />

          {tab.badgeCount && tab.badgeCount > 0 ? (
            <View
              style={[
                styles.badgeContainer,
                { backgroundColor: colors.danger },
              ]}
            />
          ) : null}
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

  const visibleTabs = React.useMemo(
    () =>
      tabs
        .map((tab, index) => ({ tab, index }))
        .filter(({ tab }) => !tab.hidden),
    [tabs],
  );

  const tabCount = visibleTabs.length;
  const compact = tabCount >= 5;

  const safeBottom = Math.max(insets.bottom, 12);
  const barHeight = compact ? 72 : 86;

  const layoutConfig: TabLayoutConfig = React.useMemo(
    () => ({
      pillWidth: compact ? 56 : 64,
      pillHeight: compact ? 48 : 56,
      iconSize: compact ? 30 : 33,
    }),
    [compact],
  );

  const borderTopColor = colors.borderSubtle;
  const highlightGradientColors: readonly [string, string, string] = isDark
    ? ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)", "transparent"]
    : ["rgba(255,255,255,0.8)", "rgba(255,255,255,0.3)", "transparent"];

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View
        style={{ width: "100%", height: barHeight + safeBottom, ...Shadows.lg }}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark ? colors.cardElevated : colors.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor,
              overflow: "hidden",
            },
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={highlightGradientColors}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.3 }}
            style={StyleSheet.absoluteFill}
          />

          <View
            style={[
              StyleSheet.absoluteFill,
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: compact ? 8 : 16,
                paddingBottom: safeBottom,
              },
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
                layout={layoutConfig}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    position: "absolute",
    bottom: 0,
  },
  tabItemContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  badgeContainer: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0F0F1E",
    zIndex: 3,
  },
});
