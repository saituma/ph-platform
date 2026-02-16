import { CoachSection } from "@/components/home/CoachSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { Feather } from "@/components/ui/theme-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useRole } from "@/context/RoleContext";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import React, { useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();
  const { profile, token } = useAppSelector((state) => state.user);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [athleteName, setAthleteName] = useState<string | null>(null);
  const [homeContent, setHomeContent] = useState<HomeContentPayload | null>(null);
  const [homeContentError, setHomeContentError] = useState<string | null>(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const loadAthleteName = React.useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ athlete: { name?: string } | null }>("/onboarding", {
        token,
        suppressStatusCodes: [401],
      });
      setAthleteName(data.athlete?.name ?? null);
    } catch {
      setAthleteName(null);
    }
  }, [token]);

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

  useEffect(() => {
    loadAthleteName();
    loadHomeContent();
  }, [loadAthleteName, loadHomeContent]);

  useFocusEffect(
    React.useCallback(() => {
      loadAthleteName();
      loadHomeContent();
    }, [loadAthleteName, loadHomeContent])
  );

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
              <Text className="text-secondary font-outfit text-sm mt-3 max-w-[240px]">
                {homeContent?.welcome || "Focus on consistency. Small wins stack into big progress."}
              </Text>
            </View>

            <View className="h-14 w-14 bg-secondary rounded-[22px] border-2 border-app shadow-lg items-center justify-center relative">
              <Feather name="user" size={24} className="text-app" />
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

          <TouchableOpacity
            activeOpacity={0.9}
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
    </ScrollView>
  );
}
