import { GuardianDashboard } from "@/components/dashboard/GuardianDashboard";
import { AdminStorySection } from "@/components/home/AdminStorySection";
import { AnnouncementsSection, type AnnouncementItem } from "@/components/home/AnnouncementsSection";
import { IntroVideoSection } from "@/components/home/IntroVideoSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { Feather } from "@/components/ui/theme-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  InteractionManager,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";

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

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { profile, token } = useAppSelector((state) => state.user);
  const { isSectionHidden } = useAgeExperience();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [homeContent, setHomeContent] = useState<HomeContentPayload | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[] | null>(null);
  const [homeContentError, setHomeContentError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
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

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadHomeContent = React.useCallback(async () => {
    if (!token) return;
    const showSkeleton = !hasLoadedRef.current;
    if (showSkeleton) {
      setIsInitialLoading(true);
    }
    try {
      const [data, announcementsData] = await Promise.all([
        apiRequest<{ items?: any[] }>(`/content/home?ts=${Date.now()}`, { token }),
        apiRequest<{ items?: any[] }>(`/content/announcements?ts=${Date.now()}`, { token }),
      ]);
      const item = (data.items ?? [])[0];
      if (!item) {
        if (!isMountedRef.current) return;
        setHomeContent(null);
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
        });
      }
      if (isMountedRef.current) {
        const items = (announcementsData.items ?? []) as AnnouncementItem[];
        setAnnouncements(
          items.length
            ? items.map((entry) => ({
                id: String((entry as any).id ?? entry.title ?? Math.random()),
                title: entry.title ?? null,
                body: (entry as any).body ?? null,
                content: entry.content ?? null,
                createdAt: (entry as any).createdAt ?? null,
                updatedAt: (entry as any).updatedAt ?? null,
              }))
            : null
        );
      }
      setHomeContentError(null);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setHomeContentError(err?.message ?? "Failed to load home content");
    } finally {
      if (isMountedRef.current && showSkeleton) {
        setIsInitialLoading(false);
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

  const showSkeleton = isInitialLoading && !homeContent && !homeContentError;

  return (
    <ScrollView
      className="flex-1 bg-app"
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 24,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            Promise.all([loadHomeContent()]).finally(() => {
              setTimeout(() => setIsRefreshing(false), 400);
            });
          }}
          tintColor={colors.textSecondary}
        />
      }
    >
      <View className="mb-10">
        <View className="relative bg-input border border-app rounded-[32px] p-6 overflow-hidden">
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
                  <Text className="font-clash text-4xl text-app leading-[1.05]">
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

            <View className="h-14 w-14 bg-secondary rounded-[22px] border-2 border-app shadow-lg items-center justify-center relative overflow-hidden">
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
              <View className="absolute bottom-0 right-0 h-4 w-4 bg-success rounded-full border-2 border-app" />
            </View>
          </View>
        </View>
      </View>

      {homeContentError ? (
        <View className="mb-8 rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <Text className="text-sm font-outfit text-red-400">{homeContentError}</Text>
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
            <View className="mb-6">
              <IntroVideoSection introVideoUrl={homeContent.introVideoUrl} />
            </View>
          ) : null}

          <GuardianDashboard />

          <View className="mt-12 gap-12">
            <View>
              <AnnouncementsSection items={announcements ?? null} />
            </View>
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
  );
}
