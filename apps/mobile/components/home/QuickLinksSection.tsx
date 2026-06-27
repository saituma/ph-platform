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
import type { AppCapabilities } from "@/store/slices/userSlice";
import { requestGlobalTabChange, getTabIndexByKey } from "@/context/ActiveTabContext";

type QuickLink = {
  label: string;
  icon: AppIconName;
  /** Push route for non-tab destinations (e.g. "/nutrition") */
  route?: string;
  /** Tab key for tab switching via requestGlobalTabChange */
  tabKey?: string;
};

function tab(label: string, icon: AppIconName, tabKey: string): QuickLink {
  return { label, icon, tabKey };
}
function push(label: string, icon: AppIconName, route: string): QuickLink {
  return { label, icon, route };
}

function getLinksForRole(
  appRole: AppRole | null,
  capabilities: AppCapabilities | null,
  programTier: string | null,
): QuickLink[] {
  // Wellbeing/Sleep is gated by tier only (PHP Starter has no access);
  // team athletes on higher tiers (PHP_Premium etc.) should still see these.
  const hideWellbeingSleep = programTier === "PHP";

  switch (appRole) {
    case "coach":
      return [
        push("Nutrition", "tracking", "/nutrition"),
        tab("Schedule", "calendar", "schedule"),
        tab("Messages", "chat", "messages"),
      ];
    case "team_manager":
      return [
        tab("Team", "user", "manager-home"),
        push("Nutrition", "tracking", "/nutrition"),
        tab("Messages", "chat", "messages"),
        tab("Schedule", "calendar", "schedule"),
      ];
    case "adult_athlete":
    case "adult_athlete_team":
    case "team": {
      const links: QuickLink[] = [];
      if (!hideWellbeingSleep && capabilities?.wellbeing === true) links.push(push("Wellbeing", "wellbeing", "/wellbeing"));
      if (capabilities?.progressTracking === true) links.push(push("Progress", "stats", "/progress"));
      if (!hideWellbeingSleep && capabilities?.sleep === true) links.push(push("Sleep", "sleep", "/sleep"));
      links.push(tab("Messages", "chat", "messages"));
      return links;
    }
    case "youth_athlete":
    case "youth_athlete_guardian_only":
    case "youth_athlete_team_guardian": {
      const links: QuickLink[] = [];
      if (!hideWellbeingSleep && capabilities?.wellbeing === true) links.push(push("Wellbeing", "wellbeing", "/wellbeing"));
      if (!hideWellbeingSleep && capabilities?.sleep === true) links.push(push("Sleep", "sleep", "/sleep"));
      links.push(push("Nutrition", "tracking", "/nutrition"));
      links.push(tab("Messages", "chat", "messages"));
      return links;
    }
    default:
      return [
        push("Nutrition", "tracking", "/nutrition"),
        tab("Messages", "chat", "messages"),
        tab("More", "more", "more"),
      ];
  }
}

const QuickLinkItem = React.memo(function QuickLinkItem({ link }: { link: QuickLink }) {
  const p = useAdminPastel();
  const router = useRouter();

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(() => {
    if (link.tabKey) {
      const idx = getTabIndexByKey(link.tabKey);
      if (idx >= 0) {
        requestGlobalTabChange(idx);
        return;
      }
    }
    if (link.route) {
      router.push(link.route as any);
    }
  }, [router, link]);

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

export const QuickLinksSection = React.memo(function QuickLinksSection({
  appRole,
  capabilities,
  programTier,
}: {
  appRole: AppRole | null;
  capabilities: AppCapabilities | null;
  programTier?: string | null;
}) {
  const links = getLinksForRole(appRole, capabilities, programTier ?? null);

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {links.map((link) => (
        <QuickLinkItem key={link.label} link={link} />
      ))}
    </View>
  );
});
