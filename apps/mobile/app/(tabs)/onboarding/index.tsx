import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ScaledText";

export default function OnboardingScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

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
          boxShadow: isDark ? "0 0 0 rgba(0,0,0,0)" : "0 24px 48px rgba(15, 23, 42, 0.08)",
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
          <Text
            className="font-outfit-semibold text-app"
            selectable
            style={{ fontSize: 36, lineHeight: 40, letterSpacing: -0.8 }}
          >
            Let&apos;s build the right plan for your athlete.
          </Text>
          <Text
            className="font-outfit text-secondary"
            selectable
            style={{ fontSize: 16, lineHeight: 24, maxWidth: 340 }}
          >
            Share a few details about age, training rhythm, and goals so we can personalize coaching from the start.
          </Text>
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
                backgroundColor: isDark ? `${colors.background}80` : colors.background,
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
                  backgroundColor: isDark ? `${colors.accent}20` : colors.accentLight,
                }}
              >
                <Feather name={item.icon as any} size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text className="font-outfit-semibold text-app" style={{ fontSize: 16 }}>
                  {item.title}
                </Text>
                <Text className="font-outfit text-secondary" style={{ fontSize: 14, lineHeight: 20 }}>
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
          <Text className="font-outfit-semibold text-app" style={{ fontSize: 18 }}>
            Ready to continue?
          </Text>
          <Text className="font-outfit text-secondary" style={{ fontSize: 14, lineHeight: 21 }}>
            This only takes a few minutes, and you can update athlete details later.
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
          <Text className="font-outfit-semibold" style={{ color: "#FFFFFF", fontSize: 17 }}>
            Register an Athlete
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
