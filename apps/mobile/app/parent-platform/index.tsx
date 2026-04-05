import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { AgeGate } from "@/components/AgeGate";
import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { Text, TextInput } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAgeExperience } from "@/context/AgeExperienceContext";

import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { setParentContentCache } from "@/lib/parentContentCache";
import { canAccessTier, hasPaidProgramTier, tierRank } from "@/lib/planAccess";
import { useAppSelector } from "@/store/hooks";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, TouchableOpacity, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CATEGORIES = [
  { id: "growth", title: "Growth and maturation", icon: "book-open", color: "bg-emerald-500" },
  { id: "injury", title: "Injury prevention", icon: "shield", color: "bg-emerald-600" },
  { id: "sleep", title: "Sleep and recovery", icon: "battery-charging", color: "bg-emerald-700" },
  { id: "nutrition", title: "Nutrition for young athletes", icon: "coffee", color: "bg-emerald-800" },
  { id: "load", title: "Training load management", icon: "activity", color: "bg-emerald-600" },
  { id: "mindset", title: "Mindset and confidence", icon: "heart", color: "bg-emerald-500" },
];

type ParentCourseModule = {
  id: string;
  title: string;
  type: "article" | "video" | "pdf" | "faq";
  content?: string;
  mediaUrl?: string;
  order: number;
  preview?: boolean;
};

type ParentCourseItem = {
  id: number;
  title: string;
  summary: string;
  description?: string | null;
  coverImage?: string | null;
  category?: string | null;
  programTier?: string | null;
  modules: ParentCourseModule[];
  isPreview?: boolean;
};

export default function ParentPlatformScreen() {

  const { token, programTier } = useAppSelector((state) => state.user);
  const router = useRouter();
  const { isSectionHidden } = useAgeExperience();
  const { colors, isDark } = useAppTheme();
  const [items, setItems] = useState<ParentCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const platformTitle = "Parent Education Platform";
  const platformSubtitle = "Understand your athlete's training with our educational module for parents.";
  const lockedTitle = "Parent platform locked";
  const lockedMessage = "Parent education content is restricted for this age.";

  const fetchCourses = useCallback(async (options?: { refreshing?: boolean }) => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ items: ParentCourseItem[] }>("/content/parent-courses", {
        token,
      });
      setItems(data.items ?? []);
    } catch {
      if (!options?.refreshing) {
        setItems([]);
      }
    } finally {
      if (!options?.refreshing) {
        setIsLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const haystack = [
        item.title,
        item.summary,
        item.description ?? "",
        item.category ?? "",
        item.programTier ?? "",
        item.modules?.map((module) => module.title).join(" ") ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [items, searchQuery]);

  const grouped = useMemo(() => {
    return CATEGORIES.map((category) => ({
      ...category,
      items: filteredItems.filter((item) => item.category === category.title),
    }));
  }, [filteredItems]);

  const hasParentProgramAccess = tierRank(programTier) >= tierRank("PHP_Premium_Plus");
  const hasPremiumAccess = tierRank(programTier) >= tierRank("PHP_Premium");
  const visibleGroups = grouped.filter((cat) => cat.items.length > 0);
  const visibleItems: ParentCourseItem[] = [];
  const previewCount = filteredItems.filter((item) => item.isPreview).length;
  const lockedCount = filteredItems.filter((item) => !canAccessTier(programTier, item.programTier ?? null) && !item.isPreview).length;
  const featuredItems = filteredItems.slice(0, 3);

  const openCourse = (item: ParentCourseItem, upgradeMessage: string) => {
    const canAccess = canAccessTier(programTier, item.programTier ?? null);
    const isPreview = Boolean(item.isPreview);
    const isLocked = !canAccess && !isPreview;

    if (isLocked) {
      Alert.alert("Upgrade required", upgradeMessage, [
        { text: "View Plans", onPress: () => router.push("/plans") },
        { text: "Not now", style: "cancel" },
      ]);
      return;
    }

    setParentContentCache({
      id: Number(item.id),
      title: item.title,
      summary: item.summary,
      description: item.description ?? null,
      coverImage: item.coverImage ?? null,
      category: item.category ?? null,
      programTier: item.programTier ?? null,
      modules: item.modules ?? [],
      isPreview: item.isPreview ?? false,
    });
    router.push(`/parent-platform/${item.id}`);
  };

  if (isSectionHidden("parentPlatform")) {
    return <AgeGate title={lockedTitle} message={lockedMessage} />;
  }

  if (!hasPaidProgramTier(programTier)) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <MoreStackHeader
          title={platformTitle}
          subtitle="Support your athlete with practical education and planning insight."
          badge="Parents"
        />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-2xl font-clash font-bold text-app text-center mb-3">Parent education</Text>
          <Text className="text-base font-outfit text-secondary text-center max-w-[300px]">
            Choose a training plan in the Programs tab to unlock parent platform content.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/programs")}
            className="mt-8 rounded-full px-8 py-3 bg-accent"
          >
            <Text className="text-sm font-outfit font-semibold text-white">Open Programs</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <MoreStackHeader
        title={platformTitle}
        subtitle="Support your athlete with practical education, planning insight, and expert parent guidance."
        badge="Parents"
      />

      <ThemedScrollView
        onRefresh={async () => {
          if (!token) return;
          await fetchCourses({ refreshing: true });
        }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 56,
        }}
      >
        <View
          className="mb-8 overflow-hidden rounded-[30px] border p-5"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#F7FFF9",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          <View className="absolute -right-10 -top-8 h-24 w-24 rounded-full" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.10)" }} />
          <View className="absolute -bottom-10 left-10 h-24 w-24 rounded-full" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)" }} />

          <View className="mb-5">
            <View className="self-start rounded-full px-3 py-1.5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.82)" }}>
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.4px]" style={{ color: colors.accent }}>
                {"Family support library"}
              </Text>
            </View>
            <Text className="mt-3 text-3xl font-telma-bold text-app">
              {"Give your athlete better support at home"}
            </Text>
            <Text className="mt-3 text-base font-outfit text-secondary leading-relaxed">
              {platformSubtitle}
            </Text>
          </View>

          <View className="flex-row items-center rounded-2xl border border-app bg-input px-4 py-3">
            <Feather name="search" size={18} color={colors.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search nutrition, recovery, mindset..."
              placeholderTextColor={colors.placeholder}
              className="ml-3 flex-1 font-outfit text-base text-app"
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                className="h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)" }}
              >
                <Feather name="x" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="mt-5 flex-row gap-3">
            <MetricCard title="Courses" value={String(filteredItems.length)} caption="Available to browse now" isDark={isDark} />
            <MetricCard title="Previews" value={String(previewCount)} caption="Open without upgrading" isDark={isDark} />
          </View>


        </View>

        {featuredItems.length > 0 && hasParentProgramAccess ? (
          <>
            <SectionLabel label="Recommended now" />
            <View className="mb-8 gap-3">
              {featuredItems.map((item) => {
                const canAccess = canAccessTier(programTier, item.programTier ?? null);
                const isPreview = Boolean(item.isPreview);
                const isLocked = !canAccess && !isPreview;

                return (
                  <FeatureCard
                    key={`featured-${item.id}`}
                    item={item}
                    isLocked={isLocked}
                    onPress={() => openCourse(item, `Parent education is included with PHP Premium Plus and Premium plans.`)}
                    colors={colors}
                    isDark={isDark}
                  />
                );
              })}
            </View>
          </>
        ) : null}

        {!hasParentProgramAccess ? (
          <View
            className="rounded-[30px] border p-5"
            style={{
              backgroundColor: isDark ? colors.card : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
              ...(isDark ? Shadows.none : Shadows.md),
            }}
          >
            <View className="mb-4 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.accentLight }}>
                <Feather name="lock" size={18} color={colors.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-outfit text-secondary uppercase tracking-[1.4px]">Locked library</Text>
                <Text className="text-lg font-clash text-app">Upgrade to unlock Parent education</Text>
              </View>
            </View>

            <Text className="text-base font-outfit text-secondary leading-relaxed">
              Parent education is available on PHP Premium Plus and PHP Premium plans.
            </Text>

            <View className="mt-4 gap-3">
              {[
                "Expert articles and guided learning modules",
                "Preview and full-course access across key topics",
                "More practical support for training, recovery, and confidence",
              ].map((benefit) => (
                <View key={benefit} className="flex-row items-start gap-3">
                  <View className="mt-1 h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.12)" }}>
                    <Feather name="check" size={12} color={colors.accent} />
                  </View>
                  <Text className="flex-1 text-sm font-outfit text-app leading-6">{benefit}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity onPress={() => router.push("/plans")} className="mt-5 rounded-2xl bg-accent px-4 py-4">
              <Text className="text-center text-sm font-outfit font-bold text-white">View Plans</Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <View className="gap-3">
            {[1, 2, 3].map((item) => (
              <View key={item} className="rounded-3xl border border-app/10 bg-input px-4 py-4">
                <View className="h-4 w-32 rounded-full bg-secondary/20" />
                <View className="mt-3 h-3 w-full rounded-full bg-secondary/20" />
                <View className="mt-3 h-3 w-2/3 rounded-full bg-secondary/20" />
              </View>
            ))}
          </View>
        ) : (
          <View className="gap-8">
            <>
              <SectionLabel label="Browse by topic" />
              <View className="flex-row flex-wrap justify-between gap-y-3">
                {grouped.map((category) => (
                  <View
                    key={category.id}
                    className="w-[48%] rounded-[24px] border p-4"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                      ...(isDark ? Shadows.none : Shadows.sm),
                    }}
                  >
                    <View className={`${category.color} mb-3 h-10 w-10 rounded-2xl items-center justify-center`}>
                      <Feather name={category.icon as any} size={18} color="white" />
                    </View>
                    <Text className="mb-1 font-clash text-base text-app">{category.title}</Text>
                    <Text className="text-sm font-outfit text-secondary">{category.items.length} item{category.items.length === 1 ? "" : "s"}</Text>
                  </View>
                ))}
              </View>
            </>

            {visibleGroups.map((cat) => (
              <View key={cat.id}>
                <View className="mb-3 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className={`${cat.color} h-9 w-9 rounded-2xl items-center justify-center`}>
                      <Feather name={cat.icon as any} size={18} color="white" />
                    </View>
                    <Text className="font-clash text-app text-lg">{cat.title}</Text>
                  </View>
                  <Text className="text-xs font-outfit text-secondary">{cat.items.length} items</Text>
                </View>

                <View className="gap-3">
                  {cat.items.map((item) => {
                    const canAccess = canAccessTier(programTier, item.programTier ?? null);
                    const isPreview = Boolean(item.isPreview);
                    const isLocked = !canAccess && !isPreview;
                    return (
                      <CourseCard
                        key={item.id}
                        item={item}
                        isLocked={isLocked}
                        onPress={() => openCourse(item, "Parent education is included with PHP Premium Plus and Premium plans.")}
                        colors={colors}
                        isDark={isDark}
                      />
                    );
                  })}
                </View>
              </View>
            ))}

            {filteredItems.length === 0 ? (
              <View className="rounded-[28px] border border-dashed border-app/20 p-5">
                <Text className="mb-2 font-clash text-xl text-app">No matching courses</Text>
                <Text className="text-base font-outfit leading-6 text-secondary">
                  Try a broader term like recovery, nutrition, sleep, growth, or confidence.
                </Text>
              </View>
            ) : null}
          </View>
        )}

        <View className="mt-8 rounded-[30px] border p-6" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.20)", ...(isDark ? Shadows.none : Shadows.sm) }}>
          <View className="mb-3 flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.82)" }}>
                <Feather name="info" size={20} color={colors.accent} />
              </View>
              <View>
                <Text className="font-clash text-lg font-bold text-accent">Full Access</Text>
              <Text className="text-base font-outfit text-secondary">More support across every topic</Text>
            </View>
          </View>
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.82)" }}>
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]" style={{ color: colors.accent }}>
                {hasPremiumAccess ? "Premium" : `${lockedCount} locked`}
              </Text>
            </View>
          </View>
          <Text className="text-base font-outfit leading-relaxed text-app">
            PHP Premium Plus and Premium members receive exclusive articles, video guides, and deeper education in every category.
          </Text>
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text className="mb-4 ml-2 text-[11px] font-outfit font-bold uppercase tracking-[1.6px] text-secondary">{label}</Text>;
}

function MetricCard({ title, value, caption, isDark }: { title: string; value: string; caption: string; isDark: boolean }) {
  return (
    <View className="flex-1 rounded-[22px] px-4 py-4" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.84)" }}>
      <Text className="mb-2 text-[10px] font-outfit font-bold uppercase tracking-[1.3px] text-secondary">{title}</Text>
      <Text className="mb-1 font-clash text-2xl text-app">{value}</Text>
      <Text className="text-base font-outfit text-secondary leading-5">{caption}</Text>
    </View>
  );
}

function FeatureCard({ item, isLocked, onPress, colors, isDark }: { item: ParentCourseItem; isLocked: boolean; onPress: () => void; colors: ReturnType<typeof useAppTheme>["colors"]; isDark: boolean; }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className={`overflow-hidden rounded-[28px] border p-5 ${isLocked ? "opacity-70" : ""}`}
      style={{
        backgroundColor: colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        ...(isDark ? Shadows.none : Shadows.sm),
      }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="mb-2 self-start rounded-full px-3 py-1.5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)" }}>
            <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]" style={{ color: colors.accent }}>
              {item.category ?? "Course"}
            </Text>
          </View>
          <Text className="mb-2 font-clash text-xl text-app">{item.title}</Text>
          <Text className="text-sm font-outfit text-secondary leading-6" numberOfLines={3}>{item.summary}</Text>
        </View>
        {item.coverImage ? <Image source={{ uri: item.coverImage }} className="h-20 w-20 rounded-[20px]" resizeMode="cover" /> : null}
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.1px]">
          {item.modules?.length ?? 0} modules{item.isPreview ? " • Preview" : ""}
        </Text>
        <View className="flex-row items-center gap-2">
          {isLocked ? (
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)" }}>
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.1px] text-secondary">Locked</Text>
            </View>
          ) : null}
          <Feather name="arrow-right" size={16} color={colors.accent} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CourseCard({ item, isLocked, onPress, colors, isDark }: { item: ParentCourseItem; isLocked: boolean; onPress: () => void; colors: ReturnType<typeof useAppTheme>["colors"]; isDark: boolean; }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className={`rounded-[26px] border p-5 ${isLocked ? "opacity-70" : ""}`}
      style={{
        backgroundColor: colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        ...(isDark ? Shadows.none : Shadows.sm),
      }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="font-outfit text-base font-bold text-app">{item.title}</Text>
          <Text className="mt-1 text-xs font-outfit uppercase tracking-[1.1px] text-secondary">
            {item.modules?.length ?? 0} modules{item.isPreview ? " • Preview" : ""}
          </Text>
        </View>
        {isLocked ? (
          <View className="rounded-full border border-app/10 bg-secondary/10 px-2 py-1">
            <Text className="text-[10px] font-outfit uppercase tracking-[1.2px] text-secondary">Locked</Text>
          </View>
        ) : (
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        )}
      </View>
      <Text className="mt-3 text-sm font-outfit text-secondary leading-6" numberOfLines={3}>{item.summary}</Text>
    </TouchableOpacity>
  );
}
