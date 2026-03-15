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
        contentContainerStyle={{ paddingHorizontal: 0, paddingTop: 12, paddingBottom: 24 }}
      >
        <View className="px-4 pb-2">
          <Text className="text-sm font-outfit text-secondary">
            Upload one focused clip and add a short note for your coach.
          </Text>
        </View>

        <VideoUploadPanel />
      </ThemedScrollView>
    </SafeAreaView>
  );
}
