import React, { useMemo, useCallback } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { isAdminRole } from "@/lib/isAdminRole";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";

// ── Types & Constants ────────────────────────────────────────────────

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
  scrollOffset: Animated.SharedValue<number>;
  onTabPress: (index: number) => void;
}

const TAB_HEIGHT = 64;
const DOCK_MARGIN = 16;

const Springs = {
  snappy: { damping: 15, stiffness: 400, mass: 0.3 },
  responsive: { damping: 20, stiffness: 300, mass: 0.4 },
};

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

const TabItem = React.memo(function TabItem({
  tab,
  index,
  scrollOffset,
  onTabPress,
  colors,
  isDark,
}: {
  tab: TabConfig;
  index: number;
  scrollOffset: Animated.SharedValue<number>;
  onTabPress: (index: number) => void;
  colors: any;
  isDark: boolean;
}) {
  const activeColor = colors.accent ?? colors.tint;
  const isAdminColors = "surface" in colors && (colors as any).surface === "#FFFFFF";
  const inactiveColor = isAdminColors
    ? (isDark ? "rgba(106,204,0,0.4)" : "rgba(45,159,63,0.35)")
    : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)");

  const animatedIconActiveStyle = useAnimatedStyle(() => {
    if (!scrollOffset) return { opacity: 0 };
    const opacity = interpolate(
      scrollOffset.value,
      [index - 0.5, index, index + 0.5],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollOffset.value,
      [index - 1, index, index + 1],
      [1, 1.15, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollOffset.value,
      [index - 1, index, index + 1],
      [0, -4, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ scale }, { translateY }],
    };
  });

  const animatedIconInactiveStyle = useAnimatedStyle(() => {
    if (!scrollOffset) return { opacity: 1 };
    const opacity = interpolate(
      scrollOffset.value,
      [index - 0.5, index, index + 0.5],
      [1, 0, 1],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollOffset.value,
      [index - 1, index, index + 1],
      [1, 0.9, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    if (!scrollOffset) return { opacity: 0 };
    const opacity = interpolate(
      scrollOffset.value,
      [index - 0.5, index, index + 0.5],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollOffset.value,
      [index - 0.5, index, index + 0.5],
      [4, 0, 4],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const resolvedIcon = resolveTabIcon(tab.icon);
  const resolvedIconOutline = resolveTabIcon(tab.iconOutline ?? tab.icon);

  return (
    <Pressable
      onPress={() => onTabPress(index)}
      accessibilityRole="tab"
      style={styles.tabItemContainer}
    >
      <View style={styles.iconStack}>
        {/* Inactive Icon */}
        <Animated.View style={[styles.iconLayer, animatedIconInactiveStyle]}>
          <AppIcon
            name={resolvedIconOutline}
            size={24}
            color={inactiveColor}
          />
        </Animated.View>

        {/* Active Icon */}
        <Animated.View style={[styles.iconLayer, animatedIconActiveStyle]}>
          <AppIcon
            name={resolvedIcon}
            size={24}
            color={activeColor}
            filled={true}
          />
        </Animated.View>

        {/* Badge - Now inside iconStack so it moves with icons */}
        {tab.badgeCount && tab.badgeCount > 0 ? (
          <View
            style={[
              styles.badgeContainer,
              {
                backgroundColor: colors.danger,
                borderColor: isDark ? "#1A1A1A" : colors.surface,
              },
            ]}
          >
            <Animated.Text style={styles.badgeText} numberOfLines={1}>
              {tab.badgeCount > 99 ? "99+" : tab.badgeCount}
            </Animated.Text>
          </View>
        ) : null}
      </View>

      {tab.label && (
        <Animated.View style={[styles.tabLabelWrapper, animatedLabelStyle]}>
          <Animated.Text
            style={[
              styles.tabLabel,
              { color: activeColor },
            ]}
            numberOfLines={1}
          >
            {tab.label}
          </Animated.Text>
        </Animated.View>
      )}
    </Pressable>
  );
});

// ── TabBar ───────────────────────────────────────────────────────────

export function TabBar({ tabs, activeIndex, scrollOffset, onTabPress }: TabBarProps) {
  const { colors, isDark } = useAppTheme();
  const p = useAdminPastel();
  const apiUserRole = useAppSelector((state) => state.user.apiUserRole);
  const isAdmin = isAdminRole(apiUserRole);
  const insets = useAppSafeAreaInsets();

  const visibleTabs = useMemo(
    () => tabs.filter((tab) => !tab.hidden),
    [tabs],
  );

  const numTabs = visibleTabs.length;
  const dockWidthSV = useSharedValue(300);
  const tabWidthSV = useDerivedValue(() => dockWidthSV.value / numTabs);

  const onWrapperLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    dockWidthSV.value = e.nativeEvent.layout.width - DOCK_MARGIN * 2;
  }, [dockWidthSV]);

  const safeBottom = Math.max(insets.bottom, 12);

  // Indicator Animation
  const indicatorStyle = useAnimatedStyle(() => {
    if (!scrollOffset) return { opacity: 0 };
    const tw = tabWidthSV.value;
    const dw = dockWidthSV.value;
    const translateX = interpolate(
      scrollOffset.value,
      [0, numTabs - 1],
      [0, dw - tw],
      Extrapolation.CLAMP,
    );
    return {
      width: tw - 8,
      transform: [{ translateX: translateX + 4 }],
    };
  });

  const tabColors = isAdmin
    ? { ...colors, accent: p.accent, tint: p.accent, danger: p.danger, surface: p.cardWhite }
    : colors;

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: safeBottom }]} onLayout={onWrapperLayout}>
      <Animated.View
        style={[
          styles.dockContainer,
          isAdmin
            ? {
                backgroundColor: isDark ? "rgba(15,22,16,0.92)" : "rgba(244,250,242,0.95)",
                borderColor: isDark ? "rgba(106,204,0,0.15)" : "rgba(45,159,63,0.12)",
              }
            : {
                backgroundColor: isDark ? "rgba(20, 20, 20, 0.75)" : "rgba(255, 255, 255, 0.85)",
                borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
              }
        ]}
      >
        {Platform.OS === "ios" && (
          <BlurView
            intensity={isAdmin ? 50 : 65}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Tab Items */}
        <View style={styles.tabItemsWrapper}>
          {visibleTabs.map((tab, index) => (
            <TabItem
              key={tab.key}
              tab={tab}
              index={index}
              scrollOffset={scrollOffset}
              onTabPress={onTabPress}
              colors={tabColors}
              isDark={isDark}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  dockContainer: {
    marginHorizontal: DOCK_MARGIN,
    height: TAB_HEIGHT,
    borderRadius: 32,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabItemsWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    zIndex: 1,
  },
  tabItemContainer: {
    flex: 1,
    height: TAB_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  iconStack: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12, // Space for label
  },
  iconLayer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabelWrapper: {
    position: "absolute",
    bottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Outfit-Bold",
  },
  badgeContainer: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    zIndex: 10,
  },
  badgeText: {
    fontFamily: "Outfit-Bold",
    fontSize: 8,
    lineHeight: 10,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
});
