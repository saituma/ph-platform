import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ScaledText";
import { Shadows } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import { isAdminRole } from "@/lib/isAdminRole";
import { apiRequest } from "@/lib/api";

type OnboardingPublicConfig = {
  welcomeMessage?: string | null;
  coachMessage?: string | null;
  approvalWorkflow?: "manual" | "auto" | null;
};

export default function OnboardingScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { apiUserRole, profile } = useAppSelector((state) => state.user);
  const [config, setConfig] = useState<OnboardingPublicConfig | null>(null);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);

  useEffect(() => {
    const identity = String(profile.id ?? profile.email ?? "").trim().toLowerCase();
    if (!identity) {
      setShowWelcomeMessage(true);
      return;
    }
    const key = `ph:onboarding-welcome-seen:${identity}`;
    let active = true;
    const run = async () => {
      try {
        const seen = await AsyncStorage.getItem(key);
        if (!active) return;
        const shouldShow = seen !== "1";
        setShowWelcomeMessage(shouldShow);
        if (shouldShow) {
          await AsyncStorage.setItem(key, "1");
        }
      } catch {
        if (!active) return;
        setShowWelcomeMessage(true);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [profile.email, profile.id]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const response = await apiRequest<{ config?: OnboardingPublicConfig }>("/onboarding/config", {
          method: "GET",
        });
        if (!active) return;
        setConfig(response?.config ?? null);
      } catch {
        if (!active) return;
        setConfig(null);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  if (isAdminRole(apiUserRole)) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: insets.top + 20,
        paddingBottom: Math.max(insets.bottom + 28, 32),
        gap: 24,
      }}
    >
      <View
        style={{
          borderRadius: 32,
          padding: 24,
          backgroundColor: isDark ? colors.cardElevated : "#F7FFF9",
          borderWidth: 1,
          borderColor: colors.border,
          boxShadow: undefined,
          ...(isDark ? Shadows.none : Shadows.lg),
          gap: 18,
        }}
      >
        <View
          style={{
            alignSelf: "flex-start",
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 7,
            backgroundColor: isDark ? `${colors.accent}1F` : colors.accentLight,
          }}
        >
          <Text
            className="font-outfit-semibold uppercase"
            style={{ color: colors.accent, fontSize: 11, letterSpacing: 1.1 }}
          >
            Athlete onboarding
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text
            className="font-outfit-semibold text-app"
            selectable
            style={{ fontSize: 14, lineHeight: 18, letterSpacing: 0.2 }}
          >
            Welcome to the football coaching app
          </Text>
          {showWelcomeMessage ? (
            <>
              <Text
                className="font-outfit-semibold text-app"
                selectable
                style={{ fontSize: 36, lineHeight: 40, letterSpacing: -0.8 }}
              >
                {config?.welcomeMessage?.trim() || "Let's build the right plan for your athlete."}
              </Text>
              <Text
                className="font-outfit text-secondary"
                selectable
                style={{ fontSize: 16, lineHeight: 24, maxWidth: 340 }}
              >
                {config?.coachMessage?.trim() ||
                  "Share a few details about age, training rhythm, and goals so we can personalize coaching from the start."}
              </Text>
            </>
          ) : null}
        </View>

        <View style={{ gap: 12 }}>
          {[
            {
              icon: "calendar",
              title: "Training profile",
              body: "Capture age, schedule, and current level in a quick pass.",
            },
            {
              icon: "target",
              title: "Performance focus",
              body: "Highlight the goals that matter most this season.",
            },
            {
              icon: "shield",
              title: "Safer planning",
              body: "Note injuries and equipment access so coaching stays realistic.",
            },
          ].map((item) => (
            <View
              key={item.title}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 14,
                padding: 16,
                borderRadius: 22,
                backgroundColor: isDark
                  ? `${colors.background}80`
                  : colors.background,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark
                    ? `${colors.accent}20`
                    : colors.accentLight,
                }}
              >
                <Feather
                  name={item.icon as any}
                  size={18}
                  color={colors.accent}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  className="font-outfit-semibold text-app"
                  style={{ fontSize: 16 }}
                >
                  {item.title}
                </Text>
                <Text
                  className="font-outfit text-secondary"
                  style={{ fontSize: 14, lineHeight: 20 }}
                >
                  {item.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View
        style={{
          borderRadius: 28,
          padding: 20,
          backgroundColor: isDark ? colors.card : "#FFFFFF",
          borderWidth: 1,
          borderColor: colors.border,
          gap: 16,
        }}
      >
        <View style={{ gap: 6 }}>
          <Text
            className="font-outfit-semibold text-app"
            style={{ fontSize: 18 }}
          >
            Ready to continue?
          </Text>
          <Text
            className="font-outfit text-secondary"
            style={{ fontSize: 14, lineHeight: 21 }}
          >
            This only takes a few minutes, and you can update athlete details
            later.
          </Text>
          <Text className="font-outfit text-secondary" style={{ fontSize: 12 }}>
            Approval: {config?.approvalWorkflow === "auto" ? "Auto" : "Manual (coach review)"}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/onboarding/register")}
          style={{
            width: "100%",
            minHeight: 56,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 18,
            backgroundColor: colors.accent,
          }}
        >
          <Text
            className="font-outfit-semibold"
            style={{ color: "#FFFFFF", fontSize: 17 }}
          >
            Register an Athlete
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
