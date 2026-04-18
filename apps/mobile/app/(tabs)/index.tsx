import { AdminStorySection } from "@/components/home/AdminStorySection";
import { IntroVideoSection } from "@/components/home/IntroVideoSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { Feather } from "@/components/ui/theme-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useRouter } from "expo-router";
import Animated, {
  Easing,
  FadeInDown,
  FadeInRight,
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
        {sublabel ? (
          <Text
            className="text-[11px] font-outfit text-secondary"
            numberOfLines={1}
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
  const insets = useSafeAreaInsets();
  const { profile, token, athleteUserId, managedAthletes, appRole } =
    useAppSelector((state) => state.user);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const { isSectionHidden } = useAgeExperience();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { homeContent, load, welcomeHeroState } = useHomeContent(
    token,
    bootstrapReady,
  );

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
                    {resolvedWelcomeMessage ? (
                      <Text
                        className="mt-4 text-[16px] font-outfit leading-7"
                        style={{ color: colors.textSecondary }}
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
          </View>
        </Animated.View>

        <View className="mb-10 px-6">
          <View className="flex-row gap-4">
            <QuickLink
              index={0}
              icon="edit-3"
              label="Nutrition"
              onPress={() => router.push("/nutrition")}
              colors={colors}
              isDark={isDark}
            />
            {isAdultAthleteAppRole(appRole) ? (
              <QuickLink
                index={1}
                icon="activity"
                label="Run Tracking"
                onPress={() => router.push("/(tabs)/tracking")}
                colors={colors}
                isDark={isDark}
              />
            ) : (
              <QuickLink
                index={1}
                icon="users"
                label="Parent Platform"
                onPress={() => router.push("/parent-platform")}
                colors={colors}
                isDark={isDark}
              />
            )}
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
                  <IntroVideoSection
                    introVideoUrl={homeContent.introVideoUrl}
                    posterUrl={homeContent.heroImageUrl ?? null}
                  />
                </Animated.View>
              )}

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
