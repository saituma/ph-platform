import React, { useCallback } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import type { AppRole } from "@/lib/appRole";

type QuickLink = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconActive: React.ComponentProps<typeof Ionicons>["name"];
  route: string;
};

function getLinksForRole(appRole: AppRole | null): QuickLink[] {
  switch (appRole) {
    case "coach":
      return [
        { label: "Programs", icon: "barbell-outline", iconActive: "barbell", route: "/(tabs)/programs" },
        { label: "Nutrition", icon: "restaurant-outline", iconActive: "restaurant", route: "/nutrition" },
        { label: "Schedule", icon: "calendar-outline", iconActive: "calendar", route: "/(tabs)/schedule" },
        { label: "Messages", icon: "chatbubble-outline", iconActive: "chatbubble", route: "/(tabs)/messages" },
      ];
    case "team_manager":
      return [
        { label: "Team", icon: "people-outline", iconActive: "people", route: "/(tabs)/team" },
        { label: "Nutrition", icon: "restaurant-outline", iconActive: "restaurant", route: "/nutrition" },
        { label: "Messages", icon: "chatbubble-outline", iconActive: "chatbubble", route: "/(tabs)/messages" },
        { label: "More", icon: "grid-outline", iconActive: "grid", route: "/(tabs)/more" },
      ];
    case "adult_athlete":
    case "adult_athlete_team":
    case "team":
      return [
        { label: "Programs", icon: "barbell-outline", iconActive: "barbell", route: "/(tabs)/programs" },
        { label: "Nutrition", icon: "restaurant-outline", iconActive: "restaurant", route: "/nutrition" },
        { label: "Progress", icon: "analytics-outline", iconActive: "analytics", route: "/progress" },
        { label: "Messages", icon: "chatbubble-outline", iconActive: "chatbubble", route: "/(tabs)/messages" },
      ];
    case "youth_athlete":
    case "youth_athlete_guardian_only":
    case "youth_athlete_team_guardian":
      return [
        { label: "Programs", icon: "barbell-outline", iconActive: "barbell", route: "/(tabs)/programs" },
        { label: "Nutrition", icon: "restaurant-outline", iconActive: "restaurant", route: "/nutrition" },
        { label: "Parent", icon: "people-circle-outline", iconActive: "people-circle", route: "/parent-platform" },
        { label: "Messages", icon: "chatbubble-outline", iconActive: "chatbubble", route: "/(tabs)/messages" },
      ];
    default:
      return [
        { label: "Programs", icon: "barbell-outline", iconActive: "barbell", route: "/(tabs)/programs" },
        { label: "Nutrition", icon: "restaurant-outline", iconActive: "restaurant", route: "/nutrition" },
        { label: "Messages", icon: "chatbubble-outline", iconActive: "chatbubble", route: "/(tabs)/messages" },
        { label: "More", icon: "grid-outline", iconActive: "grid", route: "/(tabs)/more" },
      ];
  }
}

function QuickLinkItem({ link }: { link: QuickLink }) {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();

  // Robis: spring micro-interaction instead of plain opacity
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(() => {
    router.push(link.route as any);
  }, [router, link.route]);

  const tap = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    })
    .onEnd(() => {
      'worklet';
      runOnJS(handlePress)();
    });

  // Robis: tinted not pure dark — hsl(220,8%,11%) instead of #1A1A1A
  const cardBg = isDark ? "hsl(220, 8%, 11%)" : colors.card;
  // Robis: dark mode border instead of shadow for elevation
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)";
  // Robis: low-sat icon bg
  const iconBg = isDark ? "rgba(255,255,255,0.07)" : `${colors.accent}15`;
  // Robis: explicit label color — no opacity hack
  const labelColor = isDark ? "hsl(220, 5%, 82%)" : "hsl(220, 8%, 20%)";

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        style={[{ flex: 1 }, animStyle]}
        accessibilityRole="button"
        accessibilityLabel={link.label}
        accessibilityHint={`Navigate to ${link.label}`}
      >
        <View
          style={{
            // Robis: outer borderRadius 20, paddingHorizontal 8
            // -> iconWrap inner radius = 20 - 8 = 12
            borderRadius: 20,
            paddingVertical: 18,
            paddingHorizontal: 8,
            alignItems: "center",
            gap: 10,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: cardBorder,
          }}
        >
          {/* Icon wrap — radius 12 = outer(20) - padding(8) */}
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: iconBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Robis: icon consistency — outline at rest (used as default, iconActive on press not needed here since no selected state) */}
            <Ionicons name={link.icon} size={22} color={colors.accent} />
          </View>

          {/* Robis: explicit color, no opacity, correct font size */}
          <Text
            style={{
              fontFamily: "Outfit-Medium",
              fontSize: 12,
              letterSpacing: 0.1,
              textAlign: "center",
              color: labelColor,
            }}
            numberOfLines={1}
          >
            {link.label}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export function QuickLinksSection({ appRole }: { appRole: AppRole | null }) {
  const links = getLinksForRole(appRole);

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {links.map((link) => (
        <QuickLinkItem key={link.label} link={link} />
      ))}
    </View>
  );
}
