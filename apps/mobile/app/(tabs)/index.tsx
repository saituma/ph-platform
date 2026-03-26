import { GuardianDashboard } from "@/components/dashboard/GuardianDashboard";
import { AdminStorySection } from "@/components/home/AdminStorySection";
import { IntroVideoSection } from "@/components/home/IntroVideoSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { Feather } from "@/components/ui/theme-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  InteractionManager,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useRouter } from "expo-router";
import { hasPaidProgramTier } from "@/lib/planAccess";
import Animated, { 
  FadeInDown, 
  FadeInRight, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withDelay 
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type HomeTestimonial = {
  id: string;
  name: string;
  role?: string | null;
  quote: string;
  rating?: number | null;
  photoUrl?: string | null;
  photo?: string | null;
  imageUrl?: string | null;
  image?: string | null;
};

type HomeContentPayload = {
  headline?: string | null;
  description?: string | null;
  welcome?: string | null;
  introVideoUrl?: string | null;
  heroImageUrl?: string | null;
  testimonials?: HomeTestimonial[] | null;
  adminStory?: string | null;
  professionalPhoto?: string | null;
  professionalPhotos?: string[] | string | null;
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const QuickLink = ({ icon, label, sublabel, onPress, index, colors, isDark }: any) => {
  return (
    <AnimatedTouchableOpacity
      entering={FadeInRight.delay(400 + index * 100).springify()}
      onPress={onPress}
      activeOpacity={0.8}
      className="flex-1 rounded-[32px] p-5 h-[160px] justify-between border"
      style={{
        backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
        ...(isDark ? Shadows.none : Shadows.md),
      }}
    >
      <View className="h-12 w-12 rounded-[20px] items-center justify-center" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.12)" : "#F0FDF4" }}>
        <Feather name={icon} size={22} color={colors.accent} />
      </View>
      <View>
        <Text className="text-[16px] font-clash font-bold text-app mb-0.5" numberOfLines={1}>{label}</Text>
        <Text className="text-[11px] font-outfit text-secondary" numberOfLines={1}>{sublabel}</Text>
      </View>
    </AnimatedTouchableOpacity>
  );
};

export default function HomeScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, token, programTier } = useAppSelector((state) => state.user);
  const { isSectionHidden } = useAgeExperience();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [homeContent, setHomeContent] = useState<HomeContentPayload | null>(null);
  const [homeContentError, setHomeContentError] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const isMountedRef = useRef(true);
  const lastLoadAtRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, [isRefreshing]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadHomeContent = React.useCallback(async (forceRefresh = false) => {
    if (!token) return;
    setIsLoadingContent(true);
    try {
      const data = await apiRequest<{ items?: any[] }>("/content/home", { token, forceRefresh });
      const item = (data.items ?? [])[0];
      if (!item) {
        if (!isMountedRef.current) return;
        if (!hasLoadedRef.current) setHomeContent(null);
      } else {
        let body: HomeContentPayload = {};
        if (item.body) {
          if (typeof item.body === "string" && item.body.trim().length) {
            try { body = JSON.parse(item.body) as HomeContentPayload; } catch { body = {}; }
          } else if (typeof item.body === "object") {
            body = item.body as HomeContentPayload;
          }
        }
        const parsedTestimonials = typeof body.testimonials === "string" && (body.testimonials as string).trim().length
            ? (() => { try { const parsed = JSON.parse(body.testimonials); return Array.isArray(parsed) ? parsed : null; } catch { return null; } })()
            : null;
        
        const professionalPhoto = typeof body.professionalPhoto === "string" && body.professionalPhoto.trim()
            ? body.professionalPhoto.trim()
            : Array.isArray(body.professionalPhotos)
              ? body.professionalPhotos[0] ?? null
              : typeof body.professionalPhotos === "string"
                ? body.professionalPhotos.split(/\r?\n|,/).map((entry) => entry.trim()).filter(Boolean)[0] ?? null
                : null;

        if (!isMountedRef.current) return;
        setHomeContent({
          headline: body.headline ?? item.content ?? item.title ?? null,
          description: body.description ?? null,
          welcome: body.welcome ?? null,
          introVideoUrl: body.introVideoUrl ?? null,
          heroImageUrl: body.heroImageUrl ?? null,
          testimonials: parsedTestimonials ?? (Array.isArray(body.testimonials) ? body.testimonials : null),
          adminStory: body.adminStory ?? null,
          professionalPhoto,
        });
      }
      setHomeContentError(null);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setHomeContentError(err?.message ?? "Failed to load home content");
    } finally {
      if (isMountedRef.current) {
        setIsLoadingContent(false);
        hasLoadedRef.current = true;
      }
    }
  }, [token]);

  useEffect(() => {
    const now = Date.now();
    if (now - lastLoadAtRef.current < 500) return;
    lastLoadAtRef.current = now;
    const task = InteractionManager.runAfterInteractions(() => {
      loadHomeContent();
    });
    return () => task?.cancel?.();
  }, [loadHomeContent]);

  const showSkeleton = isLoadingContent && !homeContentError;

  if (isSectionHidden("dashboard")) {
    return <AgeGate title="Dashboard locked" message="Dashboard content is restricted for this age." />;
  }

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
            onRefresh={() => {
              setIsRefreshing(true);
              Promise.all([loadHomeContent(true)]).finally(() => {
                setTimeout(() => setIsRefreshing(false), 400);
              });
            }}
            tintColor={colors.accent}
          />
        }
      >
        {/* Modern Hero Header */}
        <Animated.View 
          entering={FadeInDown.duration(600).springify()}
          className="px-6 mb-8"
        >
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="h-1.5 w-1.5 rounded-full bg-accent" />
                <Text className="text-[11px] font-outfit font-bold text-secondary uppercase tracking-[2px]">
                  {greeting}
                </Text>
              </View>
              <Text className="font-clash text-[36px] font-bold text-app leading-tight">
                Hi, {profile?.name?.split(" ")[0] || "Athlete"}
              </Text>
              {homeContent?.welcome ? (
                <Text
                  className="mt-4 text-[17px] font-outfit leading-7"
                  style={{ color: colors.textSecondary }}
                >
                  {homeContent.welcome}
                </Text>
              ) : homeContent?.headline && !showSkeleton ? (
                <Text
                  className="mt-3 text-[15px] font-outfit font-semibold leading-6"
                  style={{ color: colors.textSecondary }}
                >
                  {homeContent.headline}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity 
              onPress={() => router.push("/profile-settings")}
              className="h-14 w-14 rounded-[20px] overflow-hidden border-2"
              style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(34,197,94,0.1)" }}
            >
              {profile?.avatar ? (
                <Image source={{ uri: profile.avatar }} className="h-full w-full" />
              ) : (
                <View className="h-full w-full items-center justify-center bg-accent/10">
                  <Feather name="user" size={24} color={colors.accent} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Command Center - Refined Two-Column Layout */}
        <View className="mb-10 px-6">
          <Animated.View 
            entering={FadeInDown.delay(300).duration(600)}
            className="flex-row items-center justify-between mb-4"
          >
            <Text className="text-[11px] font-outfit font-bold text-secondary uppercase tracking-[2.5px]">Command Center</Text>
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
                      { text: "Programs", onPress: () => router.push("/(tabs)/programs") },
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
                <Animated.View entering={FadeInDown.delay(600).springify()}>
                  <View className="flex-row items-center gap-2 mb-4">
                    <View className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <Text className="text-[11px] font-outfit font-bold text-secondary uppercase tracking-[2px]">Featured Highlight</Text>
                  </View>
                  <IntroVideoSection
                    introVideoUrl={homeContent.introVideoUrl}
                    posterUrl={homeContent.heroImageUrl ?? null}
                  />
                </Animated.View>
              )}

              <Animated.View entering={FadeInDown.delay(700).springify()}>
                <GuardianDashboard />
              </Animated.View>

              {homeContent?.adminStory && (
                <Animated.View entering={FadeInDown.delay(800).springify()}>
                  <AdminStorySection
                    story={homeContent.adminStory}
                    photoUrl={homeContent.professionalPhoto ?? null}
                  />
                </Animated.View>
              )}

              {homeContent?.testimonials && (
                <Animated.View entering={FadeInDown.delay(900).springify()} className="mb-10">
                  <TestimonialsSection items={homeContent.testimonials} />
                </Animated.View>
              )}
            </>
          )}
        </View>

        {homeContentError && (
          <View className="mx-6 mt-4 rounded-2xl bg-red-500/10 p-4 border border-red-500/20">
            <Text className="text-xs font-outfit text-red-500 text-center">{homeContentError}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
