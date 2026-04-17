import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { hasPhpPlusPlanFeatures } from "@/lib/planAccess";
import { VideoUploadPanel } from "@/components/programs/ProgramPanels";
import { Feather } from "@/components/ui/theme-icons";
import { Shadows } from "@/constants/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VideoUploadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sectionContentId?: string;
    sectionTitle?: string;
    refreshToken?: string;
  }>();
  const sectionContentId = params.sectionContentId
    ? Number(params.sectionContentId)
    : null;
  const sectionTitle =
    typeof params.sectionTitle === "string" && params.sectionTitle.trim()
      ? params.sectionTitle
      : null;
  const refreshToken = params.refreshToken ? Number(params.refreshToken) : 0;
  const { colors, isDark } = useAppTheme();
  const programTier = useAppSelector((state) => state.user.programTier);
  const canUploadForCoach = hasPhpPlusPlanFeatures(programTier);

  // This screen is used as a contextual upload surface (e.g. from a session/exercise),
  // not as a global "inbox" of videos from the More tab.
  if (sectionContentId == null) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <MoreStackHeader
          title="Video Upload"
          subtitle="Upload videos directly from your session detail page."
          />

          <View className="flex-1 items-center justify-center px-6 pb-12">
          <View
            className="w-full max-w-[360px] overflow-hidden rounded-[32px] border px-6 py-8"
            style={{
              backgroundColor: colors.cardElevated,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
              ...(isDark ? Shadows.none : Shadows.md),
            }}
          >
            <View
              className="mb-6 h-20 w-20 rounded-3xl bg-accent/10 items-center justify-center border border-accent/20 self-center"
            >
              <Feather name="video" size={28} color={colors.accent} />
            </View>
            <Text className="text-2xl font-telma-bold font-bold text-app text-center mb-3">
              Upload from a session
            </Text>
            <Text className="text-[15px] font-outfit text-center text-secondary leading-relaxed mb-6">
              Go to Programs → Modules → Session → Session detail, then tap the video icon on the exercise you want reviewed.
            </Text>

            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/programs")}
              className="w-full bg-accent py-4 rounded-2xl active:opacity-90"
              style={isDark ? Shadows.none : Shadows.md}
            >
              <Text className="text-white font-bold text-base text-center">
                Go to Programs
              </Text>
            </TouchableOpacity>
          </View>
          </View>
          </SafeAreaView>
          );
  }

  if (!canUploadForCoach) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <MoreStackHeader
          title="Video upload"
          subtitle="Coach video reviews from session detail."
        />
        <View className="flex-1 items-center justify-center px-8 pb-12">
          <View
            className="w-full max-w-[360px] overflow-hidden rounded-[32px] border px-6 py-8"
            style={{
              backgroundColor: colors.cardElevated,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
              ...(isDark ? Shadows.none : Shadows.md),
            }}
          >
            <Text className="text-2xl font-telma-bold font-bold text-app text-center mb-3">
              Upload not available
            </Text>
            <Text className="text-[15px] font-outfit text-center text-secondary leading-relaxed mb-6">
              Video upload for coach feedback isn’t enabled for your account.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/programs")}
              className="w-full bg-accent py-4 rounded-2xl active:opacity-90"
              style={isDark ? Shadows.none : Shadows.md}
            >
              <Text className="text-white font-bold text-base text-center">Open training</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <MoreStackHeader
        title={sectionTitle ? "Section Video Upload" : "Video Upload"}
        subtitle={
          sectionTitle
            ? `Upload a focused clip for ${sectionTitle}.`
            : "Drop in your best reps, movement clips, or match footage for faster coach review."
        }
      />
      <ThemedScrollView
        contentContainerStyle={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 32 }}
      >
        <View className="px-4 pt-3 pb-2">
          <Text className="text-sm font-outfit text-secondary">
            {sectionTitle
              ? `Record or upload one clear clip for ${sectionTitle}, then add a short note for your coach.`
              : "Upload one focused clip and add a short note for your coach."}
          </Text>
        </View>

        <VideoUploadPanel
          refreshToken={Number.isFinite(refreshToken) ? refreshToken : 0}
          sectionContentId={Number.isFinite(sectionContentId) ? sectionContentId : null}
          sectionTitle={sectionTitle}
        />
      </ThemedScrollView>
    </SafeAreaView>
  );
}
