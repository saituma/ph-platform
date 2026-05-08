import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import type { AppRole } from "@/lib/appRole";

type QuickLink = {
  label: string;
  icon: AppIconName;
  route: string;
};

function getLinksForRole(appRole: AppRole | null): QuickLink[] {
  switch (appRole) {
    case "coach":
      return [
        { label: "Programs", icon: "programs", route: "/(tabs)/programs" },
        { label: "Nutrition", icon: "tracking", route: "/nutrition" },
        { label: "Schedule", icon: "calendar", route: "/(tabs)/schedule" },
        { label: "Messages", icon: "chat", route: "/(tabs)/messages" },
      ];
    case "team_manager":
      return [
        { label: "Team", icon: "user", route: "/(tabs)/team" },
        { label: "Nutrition", icon: "tracking", route: "/nutrition" },
        { label: "Messages", icon: "chat", route: "/(tabs)/messages" },
        { label: "More", icon: "more", route: "/(tabs)/more" },
      ];
    case "adult_athlete":
    case "adult_athlete_team":
    case "team":
      return [
        { label: "Programs", icon: "programs", route: "/(tabs)/programs" },
        { label: "Nutrition", icon: "tracking", route: "/nutrition" },
        { label: "Progress", icon: "stats", route: "/progress" },
        { label: "Sleep", icon: "sleep", route: "/sleep" },
        { label: "Messages", icon: "chat", route: "/(tabs)/messages" },
      ];
    case "youth_athlete":
    case "youth_athlete_guardian_only":
    case "youth_athlete_team_guardian":
      return [
        { label: "Programs", icon: "programs", route: "/(tabs)/programs" },
        { label: "Nutrition", icon: "tracking", route: "/nutrition" },
        { label: "Parent", icon: "parents", route: "/parent-platform" },
        { label: "Messages", icon: "chat", route: "/(tabs)/messages" },
      ];
    default:
      return [
        { label: "Programs", icon: "programs", route: "/(tabs)/programs" },
        { label: "Nutrition", icon: "tracking", route: "/nutrition" },
        { label: "Messages", icon: "chat", route: "/(tabs)/messages" },
        { label: "More", icon: "more", route: "/(tabs)/more" },
      ];
  }
}

const QuickLinkItem = React.memo(function QuickLinkItem({ link }: { link: QuickLink }) {
  const p = useAdminPastel();
  const router = useRouter();

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(() => {
    router.push(link.route as any);
  }, [router, link.route]);

  const tap = useMemo(() => Gesture.Tap()
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
    }), [handlePress]);

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
            borderRadius: 20,
            paddingVertical: 18,
            paddingHorizontal: 8,
            alignItems: "center",
            gap: 10,
            backgroundColor: p.cardWhite,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: p.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppIcon name={link.icon} size={20} color={p.accent} />
          </View>
          <Text
            style={{
              fontFamily: "Outfit-Medium",
              fontSize: 12,
              letterSpacing: 0.1,
              textAlign: "center",
              color: p.textPrimary,
            }}
            numberOfLines={1}
          >
            {link.label}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

export const QuickLinksSection = React.memo(function QuickLinksSection({ appRole }: { appRole: AppRole | null }) {
  const links = getLinksForRole(appRole);

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {links.map((link) => (
        <QuickLinkItem key={link.label} link={link} />
      ))}
    </View>
  );
});
