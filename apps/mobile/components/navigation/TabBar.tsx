import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";

export interface TabConfig {
  key: string;
  label?: string;
  icon: string;
  iconOutline?: string;
  badgeCount?: number;
  hidden?: boolean;
}

interface TabBarProps {
  tabs: TabConfig[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

interface TabLayoutConfig {
  pillWidth: number;
  pillHeight: number;
  iconSize: number;
}

function resolveTabIcon(icon: string): AppIconName {
  switch (icon) {
    case "home":
    case "home-outline":
      return "home";
    case "pulse":
    case "pulse-outline":
      return "programs";
    case "chatbox-ellipses":
    case "chatbox-ellipses-outline":
      return "chat-detail";
    case "calendar":
    case "calendar-outline":
      return "calendar";
    case "walk":
    case "walk-outline":
      return "tracking";
    case "menu":
    case "menu-outline":
      return "menu";
    default:
      return "menu";
  }
}

const TabItem = React.memo(
  ({
    tab,
    index,
    activeIndex,
    onTabPress,
    colors,
    isDark,
    layout,
  }: {
    tab: TabConfig;
    index: number;
    activeIndex: number;
    onTabPress: (index: number) => void;
    colors: any;
    isDark: boolean;
    layout: TabLayoutConfig;
  }) => {
    const activeIconColor = colors.accent ?? colors.tint;
    const inactiveIconColor = colors.icon ?? colors.textDim;
    const activeBgColor = colors.accentLight ?? (isDark ? colors.surfaceHigher : colors.limeGlow);

    const iconName = activeIndex === index ? tab.icon : (tab.iconOutline ?? tab.icon);
    const resolvedIcon = resolveTabIcon(iconName);
    const isActive = activeIndex === index;

    const pillStyle = useAnimatedStyle(() => {
      const scale = withTiming(isActive ? 1 : 0.88, { duration: 180 });
      const opacity = withTiming(isActive ? 1 : 0, { duration: 160 });

      return {
        backgroundColor: activeBgColor,
        transform: [{ scale }],
        opacity,
      };
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

          <View style={{ zIndex: 2 }}>
            <AppIcon
              name={resolvedIcon}
              size={layout.iconSize - 3}
              color={isActive ? activeIconColor : inactiveIconColor}
              filled={isActive && resolvedIcon === "home"}
              strokeWidth={isActive ? 2.3 : 2}
            />
          </View>

          {tab.badgeCount && tab.badgeCount > 0 ? (
            <View
              style={[
                styles.badgeContainer,
                { backgroundColor: colors.danger },
                // Ensure badge ring matches the bar surface in both themes.
                { borderColor: isDark ? colors.cardElevated : colors.card },
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
}: TabBarProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();

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
