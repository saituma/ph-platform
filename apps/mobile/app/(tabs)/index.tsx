import { GuardianDashboard } from "@/components/dashboard/GuardianDashboard";
import { AdminStorySection } from "@/components/home/AdminStorySection";
import { IntroVideoSection } from "@/components/home/IntroVideoSection";
import { StoriesSection } from "@/components/home/StoriesSection";
import { StoriesViewer, type StoryViewerItem } from "@/components/home/StoriesViewer";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { Feather } from "@/components/ui/theme-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { prefetchStoryMedia } from "@/lib/story-media-prefetch";
import { useAppSelector } from "@/store/hooks";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  InteractionManager,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useRouter } from "expo-router";

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

type HomeStory = {
  id?: string | null;
  title?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  badge?: string | null;
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
  stories?: HomeStory[] | string | null;
};

export default function HomeScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, token } = useAppSelector((state) => state.user);
  const { isSectionHidden } = useAgeExperience();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [homeContent, setHomeContent] = useState<HomeContentPayload | null>(null);
  const [homeContentError, setHomeContentError] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [homeStories, setHomeStories] = useState<HomeStory[]>([]);
  const [homeStoriesError, setHomeStoriesError] = useState<string | null>(null);
  const [hasLoadedStories, setHasLoadedStories] = useState(false);
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const isMountedRef = useRef(true);
  const lastLoadAtRef = useRef(0);
  const hasLoadedRef = useRef(false);

  if (isSectionHidden("dashboard")) {
    return <AgeGate title="Dashboard locked" message="Dashboard content is restricted for this age." />;
  }

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const storyItems = useMemo(() => {
    const storiesValue = hasLoadedStories ? homeStories : homeContent?.stories ?? null;
    const parsedStories =
      typeof storiesValue === "string" && storiesValue.trim().length
        ? (() => {
            try {
              const parsed = JSON.parse(storiesValue);
              return Array.isArray(parsed) ? (parsed as HomeStory[]) : [];
            } catch {
              return [];
            }
          })()
        : Array.isArray(storiesValue)
          ? storiesValue
          : [];

    const mappedStories = parsedStories.map((story, index) => ({
      id: story.id ?? `story-${index}`,
      name: story.title ?? `Story ${index + 1}`,
      imageUrl: story.mediaType === "image" ? story.mediaUrl ?? null : null,
      mediaUrl: story.mediaUrl ?? null,
      mediaType: story.mediaType ?? "image",
      badge: story.badge ?? (story.mediaType === "video" ? "Video" : null),
    }));

    return mappedStories;
  }, [hasLoadedStories, homeContent?.stories, homeStories]);

  const viewerStories = useMemo<StoryViewerItem[]>(
    () =>
      storyItems
        .filter((story) => !story.isAdd)
        .map((story) => ({
          id: story.id,
          title: story.name,
          mediaUrl: story.mediaUrl ?? story.imageUrl ?? null,
          mediaType: story.mediaType ?? "image",
          badge: story.badge ?? null,
        })),
    [storyItems],
  );

  useEffect(() => {
    if (!viewerStories.length) return;
    void prefetchStoryMedia(viewerStories, {
      startIndex: 0,
      itemCount: 4,
      maxVideos: 1,
    });
  }, [viewerStories]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadHomeContent = React.useCallback(async (forceRefresh = false) => {
    if (!token) return;
    setIsLoadingContent(true);
    try {
      const [data, storiesData] = await Promise.all([
        apiRequest<{ items?: any[] }>("/content/home", { token, forceRefresh }),
        apiRequest<{ items?: HomeStory[] }>("/stories", { token, forceRefresh: true, skipCache: true }),
      ]);
      const item = (data.items ?? [])[0];
      if (!item) {
        if (!isMountedRef.current) return;
        if (!hasLoadedRef.current) {
          setHomeContent(null);
        }
      } else {
        let body: HomeContentPayload = {};
        if (item.body) {
          if (typeof item.body === "string" && item.body.trim().length) {
            try {
              body = JSON.parse(item.body) as HomeContentPayload;
            } catch {
              body = {};
            }
          } else if (typeof item.body === "object") {
            body = item.body as HomeContentPayload;
          }
        }
        const parsedTestimonials =
          typeof body.testimonials === "string" && (body.testimonials as string).trim().length
            ? (() => {
                try {
                  const parsed = JSON.parse(body.testimonials);
                  return Array.isArray(parsed) ? parsed : null;
                } catch {
                  return null;
                }
              })()
            : null;
        const parsedStories =
          typeof body.stories === "string" && (body.stories as string).trim().length
            ? (() => {
                try {
                  const parsed = JSON.parse(body.stories);
                  return Array.isArray(parsed) ? parsed : null;
                } catch {
                  return null;
                }
              })()
            : null;
        const professionalPhoto =
          typeof body.professionalPhoto === "string" && body.professionalPhoto.trim()
            ? body.professionalPhoto.trim()
            : Array.isArray(body.professionalPhotos)
              ? body.professionalPhotos[0] ?? null
              : typeof body.professionalPhotos === "string"
                ? body.professionalPhotos
                    .split(/\r?\n|,/)
                    .map((entry) => entry.trim())
                    .filter(Boolean)[0] ?? null
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
          stories: parsedStories ?? (Array.isArray(body.stories) ? body.stories : null),
        });
      }
      if (Array.isArray(storiesData?.items)) {
        setHomeStories(storiesData.items);
        setHasLoadedStories(true);
      }
      setHomeContentError(null);
      setHomeStoriesError(null);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setHomeContentError(err?.message ?? "Failed to load home content");
      setHomeStoriesError(err?.message ?? "Failed to load stories");
    } finally {
      if (isMountedRef.current) {
        setIsLoadingContent(false);
        hasLoadedRef.current = true;
      }
    }
  }, [token]);

  const scheduleLoad = React.useCallback(() => {
    const now = Date.now();
    if (now - lastLoadAtRef.current < 500) return;
    lastLoadAtRef.current = now;
    const task = InteractionManager.runAfterInteractions(() => {
      loadHomeContent();
    });
    return () => task?.cancel?.();
  }, [loadHomeContent]);

  useEffect(() => {
    return scheduleLoad();
  }, [scheduleLoad]);

  const showSkeleton = isLoadingContent && !homeContentError;

  return (
    <View className="flex-1" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1 bg-transparent"
        contentContainerStyle={{
          paddingTop: 10,
          paddingBottom: insets.bottom + 100, // Extra padding to clear floating tab bar
          paddingHorizontal: 24,
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
            tintColor={colors.textSecondary}
          />
        }
      >
        <View className="mb-10">
          <View className="relative bg-card rounded-[32px] p-6 overflow-hidden" style={isDark ? Shadows.none : Shadows.md}>
            <View
              style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: colors.accentLight,
                opacity: 0.6,
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: -48,
                left: -48,
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: colors.backgroundSecondary,
                opacity: 0.9,
              }}
            />

            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-3">
                  <View className="h-2 w-2 rounded-full bg-success" />
                  <Text className="text-xs font-outfit text-secondary uppercase tracking-[2px]">
                    Today
                  </Text>
                </View>
                {showSkeleton ? (
                  <>
                    <Skeleton width={220} height={36} borderRadius={18} style={{ marginBottom: 10 }} />
                    <Skeleton width={180} height={30} borderRadius={16} />
                    <Skeleton width={200} height={16} borderRadius={10} style={{ marginTop: 16 }} />
                  </>
                ) : (
                  <>
                    <Text className="font-telma-bold text-4xl text-app leading-[1.05]">
                      {greeting},{"\n"}
                      <Text className="text-accent">
                        {profile?.name || "Guardian"}
                      </Text>
                    </Text>
                    {homeContent?.welcome ? (
                      <Text className="text-secondary font-outfit text-sm mt-3 max-w-[240px]">
                        {homeContent.welcome}
                      </Text>
                    ) : null}
                  </>
                )}
              </View>

              <View className="h-14 w-14 bg-card rounded-[22px] items-center justify-center relative overflow-hidden" style={isDark ? Shadows.none : Shadows.sm}>
                {showSkeleton ? (
                  <Skeleton width={56} height={56} circle />
                ) : profile?.avatar ? (
                  <Image
                    source={{ uri: profile.avatar }}
                    resizeMode="cover"
                    className="h-full w-full"
                  />
                ) : (
                  <Feather name="user" size={24} className="text-app" />
                )}
                <View className="absolute bottom-0 right-0 h-4 w-4 bg-success rounded-full" />
              </View>
            </View>
          </View>
        </View>

        <View className="mb-10">
          <View className="flex-row items-center gap-2 mb-4">
            <View className="h-2 w-2 rounded-full bg-accent" />
            <Text className="text-xs font-outfit text-secondary uppercase tracking-[2px]">Quick Links</Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            <TouchableOpacity
              onPress={() => router.push("/video-upload")}
              className="flex-1 min-w-[140px] rounded-[24px] border px-5 py-5"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
                ...(isDark ? Shadows.none : Shadows.sm),
              }}
            >
              <View className="h-12 w-12 rounded-[18px] items-center justify-center mb-4" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.accentLight }}>
                <Feather name="video" size={18} color={colors.accent} />
              </View>
              <Text className="text-sm font-outfit font-semibold text-app">Upload Video</Text>
              <Text className="text-xs font-outfit text-secondary mt-1">Coach review</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/parent-platform")}
              className="flex-1 min-w-[140px] rounded-[24px] border px-5 py-5"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
                ...(isDark ? Shadows.none : Shadows.sm),
              }}
            >
              <View className="h-12 w-12 rounded-[18px] items-center justify-center mb-4" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.accentLight }}>
                <Feather name="users" size={18} color={colors.accent} />
              </View>
              <Text className="text-sm font-outfit font-semibold text-app">Parent Platform</Text>
              <Text className="text-xs font-outfit text-secondary mt-1">Family support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {homeContentError ? (
          <View className="mb-8 rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
            <Text className="text-sm font-outfit text-red-400">{homeContentError}</Text>
          </View>
        ) : !showSkeleton && !homeContent ? (
          <View className="mb-8 rounded-2xl border border-white/10 bg-card p-4">
            <Text className="text-sm font-outfit text-secondary">
              Home content will appear here once it is available.
            </Text>
          </View>
        ) : null}

        {showSkeleton ? (
          <>
            <View className="mb-6">
              <Skeleton width="100%" height={180} borderRadius={28} />
            </View>
            <View className="mb-8">
              <Skeleton width="100%" height={140} borderRadius={24} />
            </View>
            <View className="mt-6 gap-6">
              <Skeleton width="100%" height={120} borderRadius={24} />
              <Skeleton width="100%" height={180} borderRadius={24} />
              <Skeleton width="100%" height={160} borderRadius={24} />
            </View>
          </>
        ) : (
          <>
            {homeContent?.introVideoUrl ? (
              <View className="mb-14">
                <IntroVideoSection
                  introVideoUrl={homeContent.introVideoUrl}
                  posterUrl={homeContent.heroImageUrl ?? null}
                />
              </View>
            ) : null}

            <StoriesSection
              items={storyItems}
              onPressStory={(story) => {
                const nextIndex = viewerStories.findIndex((item) => item.id === story.id);
                if (nextIndex >= 0) {
                  void prefetchStoryMedia(viewerStories, {
                    startIndex: nextIndex,
                    itemCount: 3,
                    maxVideos: 1,
                  });
                  setStoryViewerIndex(nextIndex);
                  setStoryViewerVisible(true);
                }
              }}
            />

            <StoriesViewer
              visible={storyViewerVisible}
              stories={viewerStories}
              initialIndex={storyViewerIndex}
              onClose={() => setStoryViewerVisible(false)}
            />

            <View className="mb-8">
              <GuardianDashboard />
            </View>

            <View className="mt-16 gap-16">
              <View>
                <AdminStorySection
                  story={homeContent?.adminStory}
                  photoUrl={homeContent?.professionalPhoto ?? null}
                />
              </View>

              <View>
                <TestimonialsSection items={homeContent?.testimonials ?? null} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
