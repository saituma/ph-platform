import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { canAccessTier } from "@/lib/planAccess";
import { VideoUploadPanel } from "@/components/programs/ProgramPanels";
import { Feather } from "@expo/vector-icons";
import { Shadows } from "@/constants/theme";
import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const HOW_IT_WORKS = [
  {
    title: "Choose the right clip",
    body: "Record one clear rep, drill, or movement pattern you want your coach to review.",
    icon: "video",
  },
  {
    title: "Add coaching context",
    body: "Mention what feels off, what changed, or the exact cue you want feedback on.",
    icon: "message-square",
  },
  {
    title: "Review and apply",
    body: "Once your coach responds, use the notes and response video to guide your next session.",
    icon: "check-circle",
  },
];

const READINESS_TIPS = [
  "Keep the full movement in frame.",
  "Use good light and a steady angle.",
  "Send one clear focus point per clip.",
  "Keep the file under 200MB.",
];

export default function VideoUploadScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const programTier = useAppSelector((state) => state.user.programTier);
  const canUploadVideo = canAccessTier(programTier ?? null, "PHP_Premium");

  if (!canUploadVideo) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <MoreStackHeader
          title="Video Upload"
          subtitle="Send training clips for review and keep technique feedback flowing in one premium workflow."
          badge="Premium"
        />

        <View className="flex-1 items-center justify-center px-6 pb-12">
          <View
            className="w-full max-w-[360px] overflow-hidden rounded-[32px] border px-6 py-8"
            style={{
              backgroundColor: isDark ? colors.cardElevated : "#F7FFF9",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
              ...(isDark ? Shadows.none : Shadows.md),
            }}
          >
            <View
              className="absolute -right-10 -top-10 h-28 w-28 rounded-full"
              style={{ backgroundColor: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.12)" }}
            />
            <View className="items-center">
              <View className="mb-6 h-20 w-20 rounded-3xl bg-accent/10 items-center justify-center border border-accent/20">
                <Feather name="video" size={28} color={colors.accent} />
              </View>
              <View className="mb-4 rounded-full px-3 py-1.5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.8)" }}>
                <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.4px]" style={{ color: colors.accent }}>
                  Premium feature
                </Text>
              </View>
            </View>
            <Text className="text-3xl font-clash font-bold text-app text-center mb-3">
              Video Upload Locked
            </Text>
            <Text className="text-[15px] font-outfit text-center text-secondary leading-relaxed mb-6">
              Coach video review is available for PHP Premium members who want detailed technique feedback and follow-up guidance.
            </Text>

            <View className="w-full rounded-2xl bg-warning/10 px-4 py-3 mb-6 border border-warning/20">
              <Text className="text-[12px] font-semibold text-warning text-center">
                Upgrade to unlock clip uploads, coach review, and response videos.
              </Text>
            </View>

            <View className="mb-6 gap-3">
              {[
                "Upload movement clips directly from the app",
                "Add notes so your coach knows what to assess",
                "Receive written feedback and response videos",
              ].map((item) => (
                <View key={item} className="flex-row items-start gap-3">
                  <View className="mt-1 h-5 w-5 rounded-full items-center justify-center bg-accent/10">
                    <Feather name="check" size={12} color={colors.accent} />
                  </View>
                  <Text className="flex-1 text-sm font-outfit text-app leading-6">{item}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => router.push("/plans")}
              className="w-full bg-accent py-4 rounded-2xl active:opacity-90"
              style={isDark ? Shadows.none : Shadows.md}
            >
              <Text className="text-white font-bold text-base text-center">
                View Premium Plans
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <MoreStackHeader
        title="Video Upload"
        subtitle="Drop in your best reps, movement clips, or match footage for faster coach review."
        badge="Premium"
      />

      <ThemedScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 }}
      >
        <View
          className="relative rounded-[30px] bg-card p-6 overflow-hidden mb-6 border"
          style={{
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          <View
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: colors.accentLight,
              opacity: 0.5,
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: -48,
              left: -48,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: colors.backgroundSecondary,
              opacity: 0.9,
            }}
          />

          <View className="flex-row items-center gap-3 mb-2">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text className="text-xs font-outfit text-secondary uppercase tracking-[2px]">
              Premium Feature
            </Text>
          </View>
          <Text className="text-3xl font-clash text-app mb-2">
            Coach Video Review
          </Text>
          <Text className="text-base font-outfit text-secondary leading-6">
            Upload a training clip, add context, and get clearer feedback on movement quality, technique, and next-step adjustments.
          </Text>

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1 rounded-[22px] px-4 py-4" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.84)" }}>
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px] text-secondary mb-2">
                Best for
              </Text>
              <Text className="font-clash text-lg text-app mb-1">Form review</Text>
              <Text className="text-sm font-outfit text-secondary leading-5">Lifting mechanics, drills, sprint work, and match clips.</Text>
            </View>
            <View className="flex-1 rounded-[22px] px-4 py-4" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.84)" }}>
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px] text-secondary mb-2">
                Typical flow
              </Text>
              <Text className="font-clash text-lg text-app mb-1">Upload → Review</Text>
              <Text className="text-sm font-outfit text-secondary leading-5">Send one focused clip and check back for notes or a response video.</Text>
            </View>
          </View>
        </View>

        <View
          className="mb-6 rounded-[28px] border p-5"
          style={{
            backgroundColor: colors.card,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.sm),
          }}
        >
          <View className="flex-row items-center gap-3 mb-4">
            <View className="h-5 w-1.5 rounded-full bg-accent" />
            <Text className="text-lg font-clash text-app">Before you upload</Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            {READINESS_TIPS.map((tip) => (
              <View
                key={tip}
                className="rounded-full border px-3 py-2"
                style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                }}
              >
                <Text className="text-xs font-outfit font-bold uppercase tracking-[1.1px]" style={{ color: colors.textSecondary }}>
                  {tip}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="mb-6">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="h-5 w-1.5 rounded-full bg-accent" />
            <Text className="text-lg font-clash text-app">
              How It Works
            </Text>
          </View>
          <View className="gap-3">
            {HOW_IT_WORKS.map((item, index) => (
              <View
                key={item.title}
                className="rounded-[24px] bg-card px-4 py-4 border"
                style={{
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                  ...(isDark ? Shadows.none : Shadows.sm),
                }}
              >
                <View className="flex-row items-start gap-3">
                  <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.accentLight }}>
                    <Feather name={item.icon as any} size={18} color={colors.accent} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px] text-secondary mb-1">
                      Step {index + 1}
                    </Text>
                    <Text className="text-sm font-bold font-outfit text-app">
                      {item.title}
                    </Text>
                    <Text className="text-[12px] font-outfit text-secondary mt-1 leading-5">
                      {item.body}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View
          className="rounded-[28px] bg-card p-4"
          style={isDark ? Shadows.none : Shadows.md}
        >
          <VideoUploadPanel />
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}
