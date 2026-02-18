import { CoachSection } from "@/components/home/CoachSection";
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
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import MoreScreen from "./more";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";

function MenuGlyph({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 20,
        height: 16,
        justifyContent: "center",
      }}
    >
      <View
        style={{
          height: 2,
          borderRadius: 999,
          backgroundColor: color,
          marginBottom: 4,
        }}
      />
      <View
        style={{
          height: 2,
          borderRadius: 999,
          backgroundColor: color,
          marginBottom: 4,
        }}
      />
      <View
        style={{
          height: 2,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

type HomeTestimonial = {
  id: string;
  name: string;
  role?: string | null;
  quote: string;
  rating?: number | null;
};

type HomeContentPayload = {
  headline?: string | null;
  description?: string | null;
  welcome?: string | null;
  introVideoUrl?: string | null;
  heroImageUrl?: string | null;
  testimonials?: HomeTestimonial[] | null;
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
  const [isMoreVisible, setIsMoreVisible] = useState(false);
  const [athletes, setAthletes] = useState<
    { id: number; name?: string | null; userId?: number | null; profilePicture?: string | null }[]
  >([]);
  const [activeAthleteId, setActiveAthleteId] = useState<number | null>(null);
  const [isAthleteSwitcherVisible, setIsAthleteSwitcherVisible] = useState(false);
  const shouldShowSwitchAthlete = role !== "Guardian" && athletes.length > 1;
  const lastLoadAtRef = useRef(0);
  const drawerProgress = useSharedValue(0);
  const drawerWidth = useMemo(() => {
    const rawWidth = width * 0.8;
    return Math.round(rawWidth / 4) * 4;
  }, [width]);

  if (isSectionHidden("dashboard")) {
    return <AgeGate title="Dashboard locked" message="Dashboard content is restricted for this age." />;
  }

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const loadAthleteName = React.useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ athlete: { name?: string; profilePicture?: string | null } | null }>("/onboarding", {
        token,
        suppressStatusCodes: [401],
      });
      setAthleteName(data.athlete?.name ?? null);
      setAthleteAvatar(data.athlete?.profilePicture ?? null);
    } catch {
      setAthleteName(null);
      setAthleteAvatar(null);
    }
  }, [token]);

  const loadAthleteList = React.useCallback(async () => {
    if (!token || role !== "Athlete") {
      setAthletes([]);
      setActiveAthleteId(null);
      return;
    }
    try {
      const data = await apiRequest<{
        guardian?: { activeAthleteId?: number | null } | null;
        athletes?: { id: number; name?: string | null; userId?: number | null; profilePicture?: string | null }[];
      }>("/onboarding/athletes", { token, suppressStatusCodes: [401] });
      setAthletes(data.athletes ?? []);
      setActiveAthleteId(data.guardian?.activeAthleteId ?? null);
    } catch {
      setAthletes([]);
      setActiveAthleteId(null);
    }
  }, [role, token]);

  const loadHomeContent = React.useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ items?: any[] }>("/content/home", { token });
      const item = (data.items ?? [])[0];
      if (!item) {
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
      setHomeContent({
        headline: body.headline ?? item.content ?? item.title ?? null,
        description: body.description ?? null,
        welcome: body.welcome ?? null,
        introVideoUrl: body.introVideoUrl ?? null,
        heroImageUrl: body.heroImageUrl ?? null,
        testimonials: body.testimonials ?? null,
      });
      setHomeContentError(null);
    } catch (err: any) {
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

  const openMore = React.useCallback(() => {
    setIsMoreVisible(true);
    drawerProgress.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [drawerProgress]);

  const closeMore = React.useCallback(() => {
    drawerProgress.value = withTiming(
      0,
      {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsMoreVisible)(false);
        }
      },
    );
  }, [drawerProgress]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drawerProgress.value, [0, 1], [0, 0.45]),
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: (1 - drawerProgress.value) * -drawerWidth,
      },
    ],
  }));

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
      <View className="mb-4 flex-row items-center">
        <Pressable
          onPress={openMore}
          className="h-12 w-12 rounded-2xl bg-input border border-app items-center justify-center"
          style={({ pressed }) => ({
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <MenuGlyph color={colors.accent} />
        </Pressable>
      </View>
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
              <Text className="text-secondary font-outfit text-sm mt-3 max-w-[240px]">
                {homeContent?.welcome || "Focus on consistency. Small wins stack into big progress."}
              </Text>
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

          <View className="mt-6 flex-row gap-3">
            <View
              className="flex-1 rounded-2xl p-4 border"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              }}
            >
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[2px]">
                Sessions
              </Text>
              <Text className="text-2xl font-clash text-app mt-1">2</Text>
            </View>
            <View
              className="flex-1 rounded-2xl p-4 border"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              }}
            >
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[2px]">
                Streak
              </Text>
              <Text className="text-2xl font-clash text-app mt-1">7d</Text>
            </View>
          </View>

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

      {/* Bento Quick Actions */}
      <View className="mb-10">
        <View className="flex-row justify-between items-center mb-4 px-1">
          <View className="flex-row items-center gap-3">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text className="text-xl font-bold font-clash text-app">
              Quick Actions
            </Text>
          </View>
          <Text className="text-xs font-outfit text-secondary uppercase tracking-[2px]">
            Bento
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.navigate("/(tabs)/programs")}
            className="w-[48%] bg-input border border-app rounded-3xl p-4 h-28 justify-between"
          >
            <View className="h-10 w-10 bg-secondary rounded-2xl items-center justify-center">
              <Feather name="play-circle" size={20} className="text-app" />
            </View>
            <View>
              <Text className="text-sm font-outfit text-secondary uppercase tracking-[2px]">
                Session
              </Text>
              <Text className="text-lg font-clash text-app">Start Now</Text>
            </View>
          </TouchableOpacity>

          {role === "Guardian" ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/programs/plus?tab=Submit%20Diary")}
              className="w-[48%] bg-input border border-app rounded-3xl p-4 h-28 justify-between"
            >
              <View className="h-10 w-10 bg-secondary rounded-2xl items-center justify-center">
                <Feather name="book-open" size={20} className="text-app" />
              </View>
              <View>
                <Text className="text-sm font-outfit text-secondary uppercase tracking-[2px]">
                  Diary
                </Text>
                <Text className="text-lg font-clash text-app">Submit</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.navigate("/(tabs)/schedule")}
            className="w-[48%] bg-input border border-app rounded-3xl p-4 h-28 justify-between"
          >
            <View className="h-10 w-10 bg-secondary rounded-2xl items-center justify-center">
              <Feather name="calendar" size={20} className="text-app" />
            </View>
            <View>
              <Text className="text-sm font-outfit text-secondary uppercase tracking-[2px]">
                Schedule
              </Text>
              <Text className="text-lg font-clash text-app">View Plan</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.navigate("/(tabs)/messages")}
            className="w-full bg-input border border-app rounded-3xl p-4 h-20 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 bg-secondary rounded-2xl items-center justify-center">
                <Feather name="message-circle" size={20} className="text-app" />
              </View>
              <View>
                <Text className="text-sm font-outfit text-secondary uppercase tracking-[2px]">
                  Messages
                </Text>
                <Text className="text-lg font-clash text-app">
                  Talk To Coach
                </Text>
              </View>
            </View>
            <Feather name="arrow-right" size={18} className="text-secondary" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Shared Marketing & Trust Sections (Spec Section 5) */}
      <View className="mt-12 gap-12">
        <View>
          <CoachSection
            headline={homeContent?.headline}
            description={homeContent?.description}
            heroImageUrl={homeContent?.heroImageUrl}
            introVideoUrl={homeContent?.introVideoUrl}
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
      <Modal
        visible={isMoreVisible}
        transparent
        animationType="none"
        onRequestClose={closeMore}
      >
        <View style={{ flex: 1 }}>
          <Pressable style={{ flex: 1 }} onPress={closeMore}>
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: "#0B1118",
                },
                overlayStyle,
              ]}
            />
          </Pressable>
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: drawerWidth,
                backgroundColor: colors.background,
                borderRightWidth: 1,
                borderColor: colors.border,
                shadowColor: "#0F172A",
                shadowOpacity: 0.18,
                shadowRadius: 18,
                shadowOffset: { width: 6, height: 0 },
                elevation: 12,
              },
              drawerStyle,
            ]}
          >
            <MoreScreen />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
