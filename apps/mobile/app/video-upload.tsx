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
          <View className="items-center max-w-[340px]">
            <View className="mb-8 h-20 w-20 rounded-3xl bg-accent/10 items-center justify-center border border-accent/20">
              <Feather name="video" size={28} className="text-accent" />
            </View>
            <Text className="text-3xl font-clash font-bold text-app text-center mb-3">
              Video Upload Locked
            </Text>
            <Text className="text-[15px] font-outfit text-center text-secondary leading-relaxed max-w-[280px] mb-8">
              Video review is available for PHP Premium members only.
            </Text>

            <View className="w-full rounded-2xl bg-warning/10 px-4 py-3 mb-6">
              <Text className="text-[12px] font-semibold text-warning text-center">
                This feature is for Premium plan users only.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/plans")}
              className="w-full bg-accent py-4 rounded-2xl active:opacity-90 shadow-lg shadow-accent/20"
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
          className="relative rounded-[28px] bg-card p-6 overflow-hidden mb-6"
          style={isDark ? Shadows.none : Shadows.md}
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
          <Text className="text-base font-outfit text-secondary">
            Upload a training clip and get focused feedback from your coach.
          </Text>
        </View>

        <View className="mb-6">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="h-5 w-1.5 rounded-full bg-accent" />
            <Text className="text-lg font-clash text-app">
              How It Works
            </Text>
          </View>
          <View className="gap-3">
            {[
              { title: "Upload your clip", body: "Choose a training video to review." },
              { title: "Add quick notes", body: "Tell your coach what you want feedback on." },
              { title: "Get your review", body: "Receive actionable notes and next steps." },
            ].map((item) => (
              <View
                key={item.title}
                className="rounded-2xl bg-card px-4 py-3"
                style={isDark ? Shadows.none : Shadows.sm}
              >
                <Text className="text-sm font-bold font-outfit text-app">
                  {item.title}
                </Text>
                <Text className="text-[12px] font-outfit text-secondary mt-1">
                  {item.body}
                </Text>
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
