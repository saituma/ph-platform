import { GuardianDashboard } from "@/components/dashboard/GuardianDashboard";
import { AdminStorySection } from "@/components/home/AdminStorySection";
import { IntroVideoSection } from "@/components/home/IntroVideoSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { Feather } from "@/components/ui/theme-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useRouter } from "expo-router";
import { hasPaidProgramTier } from "@/lib/planAccess";
import Animated, {
  Easing,
  FadeInDown,
  FadeInRight,
} from "react-native-reanimated";
import { useHomeContent } from "@/hooks/home/useHomeContent";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const QuickLink = ({
  icon,
  label,
  sublabel,
  onPress,
  index,
  colors,
  isDark,
}: any) => {
  return (
    <AnimatedTouchableOpacity
      entering={FadeInRight.delay(400 + index * 100)
        .duration(380)
        .easing(Easing.out(Easing.cubic))}
      onPress={onPress}
      activeOpacity={0.8}
      className="flex-1 rounded-[32px] p-5 h-[160px] justify-between border"
      style={{
        backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
        ...(isDark ? Shadows.none : Shadows.md),
      }}
    >
      <View
        className="h-12 w-12 rounded-[20px] items-center justify-center"
        style={{
          backgroundColor: isDark ? "rgba(34,197,94,0.12)" : "#F0FDF4",
        }}
      >
        <Feather name={icon} size={22} color={colors.accent} />
      </View>
      <View>
        <Text
          className="text-[16px] font-clash font-bold text-app mb-0.5"
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          className="text-[11px] font-outfit text-secondary"
          numberOfLines={1}
        >
          {sublabel}
        </Text>
      </View>
    </AnimatedTouchableOpacity>
  );
};

export default function HomeScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, token, programTier, athleteUserId, managedAthletes } =
    useAppSelector((state) => state.user);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const { isSectionHidden } = useAgeExperience();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { homeContent, load, welcomeHeroState } = useHomeContent(
    token,
    bootstrapReady,
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = useMemo(() => {
    const candidate = profile?.name?.trim()?.split(/\s+/)[0];
    return candidate || "Athlete";
  }, [profile?.name]);

  const activeAthlete = useMemo(() => {
    if (!managedAthletes?.length) return null;
    return (
      managedAthletes.find(
        (athlete) =>
          athlete.id === athleteUserId || athlete.userId === athleteUserId,
      ) ?? managedAthletes[0]
    );
  }, [athleteUserId, managedAthletes]);

  const teamName = useMemo(() => {
    const raw = activeAthlete?.team;
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  }, [activeAthlete?.team]);

  const fallbackWelcome = useMemo(() => {
    const opening =
      greeting === "Good morning"
        ? "You're set up for a strong start today."
        : greeting === "Good afternoon"
          ? "Keep your momentum going and stay locked in."
          : "Finish the day strong and stay connected to your plan.";

    return `${opening} Check your next steps, stay consistent, and keep building.`;
  }, [greeting]);

  const resolvedWelcomeMessage = useMemo(() => {
    if (welcomeHeroState === "ready") {
      return homeContent?.welcome?.trim() || homeContent?.headline?.trim();
    }
    return fallbackWelcome;
  }, [welcomeHeroState, homeContent, fallbackWelcome]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await load(true);
    setIsRefreshing(false);
  };

  if (isSectionHidden("dashboard")) {
    return (
      <AgeGate
        title="Dashboard locked"
        message="Dashboard content is restricted for this age."
      />
    );
  }

  if (!bootstrapReady) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <Skeleton width={160} height={40} borderRadius={999} />
      </View>
    );
  }

  const showSkeleton = welcomeHeroState === "loading";

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Modern Hero Header */}
        <Animated.View
          entering={FadeInDown.duration(420).easing(Easing.out(Easing.cubic))}
          className="px-6 mb-8"
        >
          <View
            className="rounded-[36px] border p-5"
            style={{
              backgroundColor: isDark ? colors.heroSurfaceStrong : colors.card,
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(34,197,94,0.12)",
              ...(isDark ? Shadows.none : Shadows.lg),
            }}
          >
            <View
              className="absolute right-0 top-0 h-40 w-40 rounded-full"
              style={{
                backgroundColor: isDark
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(34,197,94,0.10)",
                transform: [{ translateX: 44 }, { translateY: -40 }],
              }}
            />
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <View
                  className="mb-3 self-start rounded-full px-3 py-2"
                  style={{ backgroundColor: colors.accentLight }}
                >
                  <View className="flex-row items-center gap-2">
                    <View
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: colors.accent }}
                    />
                    <Text
                      className="text-[11px] font-outfit font-bold uppercase tracking-[1.8px]"
                      style={{ color: colors.accent }}
                    >
                      {greeting}
                    </Text>
                  </View>
                </View>
                <Text className="font-clash text-[34px] font-bold leading-tight text-app">
                  Welcome back, {firstName}
                </Text>

                {teamName ? (
                  <Text
                    className="mt-2 text-[12px] font-outfit"
                    style={{ color: colors.textSecondary }}
                    numberOfLines={1}
                  >
                    Team: {teamName}
                  </Text>
                ) : null}

                {welcomeHeroState === "loading" ? (
                  <View className="mt-4 gap-2">
                    <Skeleton width="82%" height={18} borderRadius={999} />
                    <Skeleton width="96%" height={18} borderRadius={999} />
                    <Skeleton width="66%" height={18} borderRadius={999} />
                  </View>
                ) : (
                  <>
                    <Text
                      className="mt-4 text-[16px] font-outfit leading-7"
                      style={{ color: colors.textSecondary }}
                    >
                      {resolvedWelcomeMessage}
                    </Text>

                    {welcomeHeroState === "error" ? (
                      <Pressable
                        onPress={handleRefresh}
                        className="mt-4 self-start rounded-full px-4 py-2.5"
                        style={{
                          backgroundColor: isDark
                            ? colors.backgroundSecondary
                            : colors.accentLight,
                          borderWidth: 1,
                          borderColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(34,197,94,0.14)",
                        }}
                      >
                        <View className="flex-row items-center gap-2">
                          <Feather
                            name="refresh-cw"
                            size={15}
                            color={colors.accent}
                          />
                          <Text
                            className="text-[12px] font-outfit font-bold uppercase tracking-[1.2px]"
                            style={{ color: colors.accent }}
                          >
                            Try again
                          </Text>
                        </View>
                      </Pressable>
                    ) : null}
                  </>
                )}
              </View>

              <TouchableOpacity
                onPress={() => router.push("/profile-settings")}
                activeOpacity={0.85}
                className="h-16 w-16 rounded-[24px] overflow-hidden border p-1"
                style={{
                  backgroundColor: isDark
                    ? colors.heroSurfaceMuted
                    : colors.backgroundSecondary,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(34,197,94,0.12)",
                }}
              >
                {profile?.avatar ? (
                  <Image
                    source={{ uri: profile.avatar }}
                    className="h-full w-full rounded-[20px]"
                  />
                ) : (
                  <View
                    className="h-full w-full items-center justify-center rounded-[20px]"
                    style={{ backgroundColor: colors.accentLight }}
                  >
                    <Feather name="user" size={24} color={colors.accent} />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View className="mt-5 flex-row items-center gap-3">
              <View
                className="rounded-full px-3 py-2"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : colors.backgroundSecondary,
                }}
              >
                <Text
                  className="text-[11px] font-outfit font-semibold uppercase tracking-[1.2px]"
                  style={{ color: colors.textSecondary }}
                >
                  {welcomeHeroState === "ready"
                    ? "Personalized welcome"
                    : welcomeHeroState === "error"
                      ? "Using offline fallback"
                      : "Daily focus"}
                </Text>
              </View>
              <Text
                className="flex-1 text-[12px] font-outfit"
                style={{ color: colors.textSecondary }}
              >
                {welcomeHeroState === "ready"
                  ? "Your latest home message is ready."
                  : "Your plan is still here and ready even when content needs a moment."}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Command Center - Refined Two-Column Layout */}
        <View className="mb-10 px-6">
          <Animated.View
            entering={FadeInDown.delay(300).duration(600)}
            className="flex-row items-center justify-between mb-4"
          >
            <Text className="text-[11px] font-outfit font-bold text-secondary uppercase tracking-[2.5px]">
              Command Center
            </Text>
          </Animated.View>

          <View className="flex-row gap-4">
            <QuickLink
              index={0}
              icon="edit-3"
              label="Submit Diary"
              sublabel="Log your fuel"
              onPress={() => router.push("/food-diary")}
              colors={colors}
              isDark={isDark}
            />
            <QuickLink
              index={1}
              icon="users"
              label="Parent Platform"
              sublabel="Family support"
              onPress={() => {
                if (!hasPaidProgramTier(programTier)) {
                  Alert.alert(
                    "Choose a plan",
                    "Pick a training plan in the Programs tab to unlock parent education content.",
                    [
                      { text: "Not now", style: "cancel" },
                      {
                        text: "Programs",
                        onPress: () => router.push("/(tabs)/programs"),
                      },
                    ],
                  );
                  return;
                }
                router.push("/parent-platform");
              }}
              colors={colors}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Dynamic Content Sections */}
        <View className="px-6 gap-12">
          {showSkeleton ? (
            <View className="gap-8">
              <Skeleton width="100%" height={200} borderRadius={32} />
              <Skeleton width="100%" height={140} borderRadius={32} />
            </View>
          ) : (
            <>
              {homeContent?.introVideoUrl && (
                <Animated.View
                  entering={FadeInDown.delay(600)
                    .duration(400)
                    .easing(Easing.out(Easing.cubic))}
                >
                  <View className="flex-row items-center gap-2 mb-4">
                    <View className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <Text className="text-[11px] font-outfit font-bold text-secondary uppercase tracking-[2px]">
                      Featured Highlight
                    </Text>
                  </View>
                  <IntroVideoSection
                    introVideoUrl={homeContent.introVideoUrl}
                    posterUrl={homeContent.heroImageUrl ?? null}
                  />
                </Animated.View>
              )}

              <Animated.View
                entering={FadeInDown.delay(700)
                  .duration(400)
                  .easing(Easing.out(Easing.cubic))}
              >
                <GuardianDashboard />
              </Animated.View>

              {homeContent?.adminStory && (
                <Animated.View
                  entering={FadeInDown.delay(800)
                    .duration(400)
                    .easing(Easing.out(Easing.cubic))}
                >
                  <AdminStorySection
                    story={homeContent.adminStory}
                    photoUrl={homeContent.professionalPhoto ?? null}
                  />
                </Animated.View>
              )}

              {homeContent?.testimonials && (
                <Animated.View
                  entering={FadeInDown.delay(900)
                    .duration(400)
                    .easing(Easing.out(Easing.cubic))}
                  className="mb-10"
                >
                  <TestimonialsSection items={homeContent.testimonials} />
                </Animated.View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
