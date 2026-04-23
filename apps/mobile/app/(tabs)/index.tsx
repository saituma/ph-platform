import { AdminStorySection } from "@/components/home/AdminStorySection";
import { AthleteDashboard } from "@/components/dashboard/AthleteDashboard";
import { GuardianDashboard } from "@/components/dashboard/GuardianDashboard";
import { IntroVideoSection } from "@/components/home/IntroVideoSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows, radius, spacing } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useRouter } from "expo-router";
import Animated, {
  Easing,
  FadeInDown,
} from "react-native-reanimated";
import { useHomeContent } from "@/hooks/home/useHomeContent";
import { isAdultAthleteAppRole } from "@/lib/appRole";

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
}: {
  icon: AppIconName;
  label: string;
  sublabel?: string;
  onPress: () => void;
  index: number;
  colors: any;
  isDark: boolean;
}) => {
  return (
    <AnimatedTouchableOpacity
      entering={FadeInDown.delay(180 + index * 70)
        .duration(260)
        .easing(Easing.out(Easing.cubic))}
      onPress={onPress}
      activeOpacity={0.8}
      className="flex-1 border"
      style={{
        minHeight: 116,
        borderRadius: radius.xl,
        padding: spacing.lg,
        justifyContent: "space-between",
        backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
        ...(isDark ? Shadows.none : Shadows.md),
      }}
    >
      <View
        className="items-center justify-center"
        style={{
          width: 42,
          height: 42,
          borderRadius: 16,
          backgroundColor: isDark ? "rgba(34,197,94,0.12)" : "#F0FDF4",
        }}
      >
        <AppIcon name={icon} size={20} color={colors.accent} />
      </View>
      <View style={{ gap: 4 }}>
        <Text
          className="font-clash font-bold text-app"
          style={{ fontSize: 16 }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text
            className="font-outfit text-secondary"
            style={{ fontSize: 12 }}
            numberOfLines={2}
          >
            {sublabel}
          </Text>
        ) : null}
      </View>
    </AnimatedTouchableOpacity>
  );
};

export default function HomeScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const { profile, token, athleteUserId, managedAthletes, appRole } =
    useAppSelector((state) => state.user);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const { isSectionHidden } = useAgeExperience();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { homeContent, load, welcomeHeroState } = useHomeContent(
    token,
    bootstrapReady,
  );

  const resolvedIntroVideoUrl = useMemo(() => {
    const fallback = homeContent?.introVideoUrl ?? null;
    const rules = homeContent?.introVideos ?? null;
    if (!rules || rules.length === 0) return fallback;

    const introAudience = (() => {
      if (!appRole) return "youth" as const;
      if (
        appRole === "team" ||
        appRole === "adult_athlete_team" ||
        appRole === "youth_athlete_team_guardian"
      ) {
        return "team" as const;
      }
      if (appRole === "coach") return "adult" as const;
      return isAdultAthleteAppRole(appRole) ? ("adult" as const) : ("youth" as const);
    })();

    const match = rules.find(
      (rule) => rule?.url && Array.isArray(rule.roles) && rule.roles.includes(introAudience),
    );
    return match?.url ?? fallback ?? rules[0]?.url ?? null;
  }, [appRole, homeContent?.introVideoUrl, homeContent?.introVideos]);

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

  const resolvedWelcomeMessage = useMemo(() => {
    if (welcomeHeroState === "ready") {
      return homeContent?.welcome?.trim() || homeContent?.headline?.trim() || "";
    }
    return "";
  }, [welcomeHeroState, homeContent]);

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
  const showAthleteDashboard =
    appRole === "team" ||
    appRole === "adult_athlete_team" ||
    appRole === "adult_athlete";

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
        <Animated.View
          entering={FadeInDown.duration(280).easing(Easing.out(Easing.cubic))}
          className="px-6 mb-6"
        >
          <View
            className="border"
            style={{
              borderRadius: radius.xxl,
              padding: spacing.xl,
              backgroundColor: isDark ? colors.cardElevated : colors.card,
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(34,197,94,0.12)",
              ...(isDark ? Shadows.none : Shadows.md),
            }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="font-clash font-bold leading-tight text-app" style={{ fontSize: 28 }}>
                  Welcome back, {firstName}
                </Text>

                {teamName ? (
                  <Text
                    className="mt-2 font-outfit"
                    style={{ fontSize: 13, color: colors.textSecondary }}
                    numberOfLines={1}
                  >
                    {teamName}
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
                    {resolvedWelcomeMessage ? (
                      <Text
                        className="mt-3 font-outfit"
                        style={{ fontSize: 15, lineHeight: 22, color: colors.textSecondary }}
                      >
                        {resolvedWelcomeMessage}
                      </Text>
                    ) : null}

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
                          <AppIcon name="refresh" size={15} color={colors.accent} />
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
                className="overflow-hidden border p-1"
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 22,
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
                    <AppIcon name="user" size={24} color={colors.accent} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <View className="mb-8 px-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-clash font-bold text-app" style={{ fontSize: 18 }}>
              Quick links
            </Text>
          </View>
          <View className="flex-row gap-4">
            <QuickLink
              index={0}
              icon="programs"
              label="Nutrition"
              sublabel="Meals and habits"
              onPress={() => router.push("/nutrition")}
              colors={colors}
              isDark={isDark}
            />
            {isAdultAthleteAppRole(appRole) ? (
              <QuickLink
                index={1}
                icon="tracking"
                label="Run Tracking"
                sublabel="Start or review runs"
                onPress={() => router.push("/(tabs)/tracking")}
                colors={colors}
                isDark={isDark}
              />
            ) : (
              <QuickLink
                index={1}
                icon="user"
                label="Parent Platform"
                sublabel="Family progress"
                onPress={() => router.push("/parent-platform")}
                colors={colors}
                isDark={isDark}
              />
            )}
          </View>
        </View>

        <View className="px-6 gap-8">
          <Animated.View
            entering={FadeInDown.delay(260).duration(260).easing(Easing.out(Easing.cubic))}
          >
            {showAthleteDashboard ? <AthleteDashboard /> : <GuardianDashboard />}
          </Animated.View>

          {showSkeleton ? (
            <View className="gap-8">
              <Skeleton width="100%" height={200} borderRadius={32} />
              <Skeleton width="100%" height={140} borderRadius={32} />
            </View>
          ) : (
            <>
              {resolvedIntroVideoUrl && (
                <Animated.View
                  entering={FadeInDown.delay(320)
                    .duration(280)
                    .easing(Easing.out(Easing.cubic))}
                >
                  <IntroVideoSection
                    introVideoUrl={resolvedIntroVideoUrl}
                    posterUrl={homeContent?.heroImageUrl ?? null}
                  />
                </Animated.View>
              )}

              {homeContent?.adminStory && (
                <Animated.View
                  entering={FadeInDown.delay(380)
                    .duration(280)
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
                  entering={FadeInDown.delay(440)
                    .duration(280)
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
