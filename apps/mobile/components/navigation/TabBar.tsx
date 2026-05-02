import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";

// ── Types ────────────────────────────────────────────────────────────

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

// ── Icon resolver ────────────────────────────────────────────────────

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
    case "school":
    case "school-outline":
      return "parents";
    case "menu":
    case "menu-outline":
      return "menu";
    // Admin tabs
    case "film":
    case "film-outline":
      return "play";
    case "people-circle":
    case "people-circle-outline":
    case "people":
    case "people-outline":
      return "user";
    case "mail":
    case "mail-outline":
      return "chat";
    case "library":
    case "library-outline":
      return "programs";
    case "cog":
    case "cog-outline":
      return "settings";
    case "person-circle":
    case "person-circle-outline":
    case "person":
    case "person-outline":
      return "user";
    // Generic fallbacks
    case "stats-chart":
    case "stats-chart-outline":
    case "analytics":
    case "analytics-outline":
      return "stats";
    case "ellipsis-horizontal":
    case "ellipsis-horizontal-outline":
    case "grid":
    case "grid-outline":
      return "more";
    // Team manager tabs
    case "chatbubbles":
    case "chatbubbles-outline":
      return "chat-detail";
    case "id-card":
    case "id-card-outline":
    case "clipboard":
    case "clipboard-outline":
      return "roster";
    default:
      return "menu";
  }
}

// ── Tab Item ─────────────────────────────────────────────────────────

const TAB_HEIGHT = 56;

const TabItem = React.memo(function TabItem({
  tab,
  index,
  activeIndex,
  onTabPress,
  colors,
  isDark,
}: {
  tab: TabConfig;
  index: number;
  activeIndex: number;
  onTabPress: (index: number) => void;
  colors: any;
  isDark: boolean;
}) {
  const isActive = activeIndex === index;

  const iconName = isActive ? tab.icon : (tab.iconOutline ?? tab.icon);
  const resolvedIcon = resolveTabIcon(iconName);

  const activeColor = colors.accent ?? colors.tint;
  const inactiveColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)";
  const activeBg = isDark
    ? "rgba(52,199,89,0.14)"
    : "rgba(22,163,74,0.10)";

  const handlePress = () => {
    if (index !== activeIndex) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onTabPress(index);
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="tab"
      accessibilityLabel={tab.label ?? tab.key}
      accessibilityHint={`Switch to ${tab.label ?? tab.key}`}
      accessibilityState={{ selected: isActive }}
      style={styles.tabItemContainer}
    >
      <View
        style={[
          styles.tabItemInner,
          isActive && {
            backgroundColor: activeBg,
            borderColor: isDark
              ? "rgba(52,199,89,0.24)"
              : "rgba(22,163,74,0.18)",
          },
        ]}
      >
        {/* Icon */}
        <AppIcon
          name={resolvedIcon}
          size={22}
          color={isActive ? activeColor : inactiveColor}
          filled={isActive && resolvedIcon === "home"}
          strokeWidth={isActive ? 2.25 : 1.75}
        />

        {/* Label */}
        {tab.label ? (
          <Animated.Text
            style={[
              styles.tabLabel,
              { color: isActive ? activeColor : inactiveColor },
            ]}
            numberOfLines={1}
          >
            {tab.label}
          </Animated.Text>
        ) : null}

        {/* Badge */}
        {tab.badgeCount && tab.badgeCount > 0 ? (
          <View
            style={[
              styles.badgeContainer,
              {
                backgroundColor: colors.danger,
                borderColor: isDark ? "#111111" : colors.surface,
              },
            ]}
          >
            <Animated.Text style={styles.badgeText} numberOfLines={1}>
              {tab.badgeCount > 99 ? "99+" : tab.badgeCount}
            </Animated.Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

// ── TabBar ───────────────────────────────────────────────────────────

export function TabBar({ tabs, activeIndex, onTabPress }: TabBarProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();

  const visibleTabs = React.useMemo(
    () =>
      tabs
        .map((tab, index) => ({ tab, index }))
        .filter(({ tab }) => !tab.hidden),
    [tabs],
  );

  const safeBottom = Math.max(insets.bottom, 8);
  const totalHeight = TAB_HEIGHT + safeBottom;

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View style={{ width: "100%", height: totalHeight }}>
        {/* Background: BlurView on iOS, solid surface on Android */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              overflow: "hidden",
              borderTopWidth: 0.5,
              borderTopColor: "rgba(255,255,255,0.08)",
            },
          ]}
        >
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? "#111111" : colors.surface },
              ]}
            />
          )}
        </View>

        {/* Tab items */}
        <View
          accessibilityRole="tablist"
          style={[
            StyleSheet.absoluteFill,
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-around",
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
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

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
    height: TAB_HEIGHT,
  },
  tabItemInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minWidth: 46,
    minHeight: 46,
    paddingHorizontal: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Outfit-Medium",
    letterSpacing: 0.1,
  },
  badgeContainer: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    zIndex: 3,
  },
  badgeText: {
    fontFamily: "Outfit-Bold",
    fontSize: 9,
    lineHeight: 11,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
});
