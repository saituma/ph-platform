import { AdminStorySection } from "@/components/home/AdminStorySection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { Feather } from "@/components/ui/theme-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useRole } from "@/context/RoleContext";
import { apiRequest } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAthleteUserId } from "@/store/slices/userSlice";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Image,
  InteractionManager,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ScaledText";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";

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
};

export default function HomeScreen() {
  const { role } = useRole();
  const { colors } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const { profile, token } = useAppSelector((state) => state.user);
  const { isSectionHidden } = useAgeExperience();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [athleteName, setAthleteName] = useState<string | null>(null);
  const [athleteAvatar, setAthleteAvatar] = useState<string | null>(null);
  const [homeContent, setHomeContent] = useState<HomeContentPayload | null>(null);
  const [homeContentError, setHomeContentError] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<
    { id: number; name?: string | null; userId?: number | null; profilePicture?: string | null }[]
  >([]);
  const [activeAthleteId, setActiveAthleteId] = useState<number | null>(null);
  const [isAthleteSwitcherVisible, setIsAthleteSwitcherVisible] = useState(false);
  const isMountedRef = useRef(true);
  const shouldShowSwitchAthlete = role !== "Guardian" && athletes.length > 1;
  const lastLoadAtRef = useRef(0);

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

  const loadAthleteName = React.useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ athlete: { name?: string; profilePicture?: string | null } | null }>("/onboarding", {
        token,
        suppressStatusCodes: [401],
      });
      if (!isMountedRef.current) return;
      setAthleteName(data.athlete?.name ?? null);
      setAthleteAvatar(data.athlete?.profilePicture ?? null);
    } catch {
      if (!isMountedRef.current) return;
      setAthleteName(null);
      setAthleteAvatar(null);
    }
  }, [token]);

  const loadAthleteList = React.useCallback(async () => {
    if (!token || role !== "Athlete") {
      if (!isMountedRef.current) return;
      setAthletes([]);
      setActiveAthleteId(null);
      return;
    }
    try {
      const data = await apiRequest<{
        guardian?: { activeAthleteId?: number | null } | null;
        athletes?: { id: number; name?: string | null; userId?: number | null; profilePicture?: string | null }[];
      }>("/onboarding/athletes", { token, suppressStatusCodes: [401] });
      if (!isMountedRef.current) return;
      setAthletes(data.athletes ?? []);
      setActiveAthleteId(data.guardian?.activeAthleteId ?? null);
    } catch {
      if (!isMountedRef.current) return;
      setAthletes([]);
      setActiveAthleteId(null);
    }
  }, [role, token]);

  const loadHomeContent = React.useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ items?: any[] }>(`/content/home?ts=${Date.now()}`, { token });
      const item = (data.items ?? [])[0];
      if (!item) {
        if (!isMountedRef.current) return;
        setHomeContent(null);
        return;
      }
      let body: HomeContentPayload = {};
      if (typeof item.body === "string" && item.body.trim().length) {
        try {
          body = JSON.parse(item.body) as HomeContentPayload;
        } catch {
          body = {};
        }
      }
      const parsedTestimonials =
        typeof body.testimonials === "string" && body.testimonials.trim().length
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
      setHomeContentError(null);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setHomeContentError(err?.message ?? "Failed to load home content");
    }
  }, [token]);

  const scheduleLoad = React.useCallback(() => {
    const now = Date.now();
    if (now - lastLoadAtRef.current < 500) return;
    lastLoadAtRef.current = now;
    const task = InteractionManager.runAfterInteractions(() => {
      loadAthleteName();
      loadHomeContent();
      loadAthleteList();
    });
    return () => task?.cancel?.();
  }, [loadAthleteList, loadAthleteName, loadHomeContent]);

  useEffect(() => {
    return scheduleLoad();
  }, [scheduleLoad]);

  useFocusEffect(
    React.useCallback(() => {
      return scheduleLoad();
    }, [scheduleLoad])
  );

  const handleSelectAthlete = async (athleteId: number, userId?: number | null) => {
    if (!token) return;
    try {
      await apiRequest("/onboarding/select-athlete", {
        method: "POST",
        token,
        body: { athleteId },
      });
      if (!isMountedRef.current) return;
      setActiveAthleteId(athleteId);
      if (userId) {
        dispatch(setAthleteUserId(userId));
      }
      const selected = athletes.find((athlete) => athlete.id === athleteId);
      setAthleteName(selected?.name ?? athleteName);
      setAthleteAvatar(selected?.profilePicture ?? athleteAvatar);
      setIsAthleteSwitcherVisible(false);
    } catch (error) {
      console.warn("Failed to switch athlete", error);
    }
  };

  // Removed the hamburger modal; More is now a bottom tab.

  return (
    <>
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
              Promise.all([loadAthleteName(), loadHomeContent()]).finally(() => {
                setTimeout(() => setIsRefreshing(false), 400);
              });
            }}
            tintColor={colors.textSecondary}
          />
        }
      >
      {/* Hero */}
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
              <Text className="font-clash text-4xl text-app leading-[1.05]">
                {greeting},{"\n"}
                <Text className="text-accent">
                  {role === "Guardian"
                    ? profile?.name || "Parent"
                    : athleteName || "Athlete"}
                </Text>
              </Text>
              {homeContent?.welcome ? (
                <Text className="text-secondary font-outfit text-sm mt-3 max-w-[240px]">
                  {homeContent.welcome}
                </Text>
              ) : null}
            </View>

            <View className="h-14 w-14 bg-secondary rounded-[22px] border-2 border-app shadow-lg items-center justify-center relative overflow-hidden">
              {role === "Athlete" && athleteAvatar ? (
                <Image
                  source={{ uri: athleteAvatar }}
                  resizeMode="cover"
                  className="h-full w-full"
                />
              ) : role !== "Athlete" && profile?.avatar ? (
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

          {/* Removed hardcoded stats to avoid mock data */}

          {role === "Guardian" || shouldShowSwitchAthlete ? (
            <View className="mt-4 flex-row gap-3">
              {role === "Guardian" ? (
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/onboarding/register?mode=add")}
                  className="flex-1 rounded-2xl bg-accent py-3 items-center"
                >
                  <Text className="text-sm font-outfit text-white">Add Athlete</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setIsAthleteSwitcherVisible(true)}
                  className="flex-1 rounded-2xl bg-accent py-3 items-center"
                >
                  <Text className="text-sm font-outfit text-white">Switch Athlete</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>
      </View>

      {homeContentError ? (
        <View className="mb-8 rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <Text className="text-sm font-outfit text-red-400">{homeContentError}</Text>
        </View>
      ) : null}

      {/* Shared Marketing & Trust Sections (Spec Section 5) */}
      <View className="mt-12 gap-12">
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

      <Modal
        visible={isAthleteSwitcherVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAthleteSwitcherVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={() => setIsAthleteSwitcherVisible(false)}
        >
          <Pressable className="w-full rounded-3xl bg-app p-6 border border-app" onPress={() => undefined}>
            <Text className="text-lg font-clash text-app mb-2">Choose Athlete</Text>
            <Text className="text-sm font-outfit text-secondary mb-4">
              Select which athlete profile to manage.
            </Text>
            <View className="gap-3">
              {athletes.length ? (
                athletes.map((athlete) => (
                  <TouchableOpacity
                    key={athlete.id}
                    onPress={() => handleSelectAthlete(athlete.id, athlete.userId ?? null)}
                    className="flex-row items-center justify-between rounded-2xl border border-app px-4 py-3"
                  >
                    <View className="flex-row items-center gap-3">
                      {athlete.profilePicture ? (
                        <View className="w-10 h-10 rounded-full overflow-hidden border border-app">
                          <Image source={{ uri: athlete.profilePicture }} style={{ width: 40, height: 40 }} />
                        </View>
                      ) : (
                        <View className="w-10 h-10 rounded-full bg-secondary items-center justify-center border border-app">
                          <Feather name="user" size={18} className="text-app" />
                        </View>
                      )}
                      <Text className="text-sm font-outfit text-app">
                        {athlete.name ?? "Athlete"}
                      </Text>
                    </View>
                    {activeAthleteId === athlete.id ? (
                      <View className="h-2 w-2 rounded-full bg-success" />
                    ) : null}
                  </TouchableOpacity>
                ))
              ) : (
                <Text className="text-sm font-outfit text-secondary">
                  No athletes found yet.
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setIsAthleteSwitcherVisible(false)}
              className="mt-6 rounded-2xl bg-accent py-3 items-center"
            >
              <Text className="text-sm font-outfit text-white">Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      </ScrollView>
    </>
  );
}
