import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, InteractionManager, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import { useRole } from "@/context/RoleContext";
import { setParentContentCache } from "@/lib/parentContentCache";
import { canAccessTier, tierRank } from "@/lib/planAccess";
import { Text } from "@/components/ScaledText";

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
  const { role } = useRole();
  const { token, programTier } = useAppSelector((state) => state.user);
  const router = useRouter();
  const [items, setItems] = useState<ParentCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCourses = useCallback(async (options?: { refreshing?: boolean }) => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ items: ParentCourseItem[] }>("/content/parent-courses", { token });
      setItems(data.items ?? []);
    } catch {
      if (!options?.refreshing) {
        setItems([]);
      }
    } finally {
      if (options?.refreshing) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    if (role !== "Guardian") {
      setIsLoading(false);
      return;
    }
    let mounted = true;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!mounted) return;
      fetchCourses();
    });
    return () => {
      mounted = false;
      task?.cancel?.();
    };
  }, [fetchCourses, role]);

  const grouped = useMemo(() => {
    return CATEGORIES.map((category) => ({
      ...category,
      items: items.filter((item) => item.category === category.title),
    }));
  }, [items]);
  const hasParentProgramAccess = tierRank(programTier) >= tierRank("PHP_Plus");

  if (role !== "Guardian") {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <ThemedScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
          }}
        >
          <View className="mb-8">
            <Text className="text-4xl font-clash text-app mb-2">Parent Platform</Text>
            <Text className="text-base font-outfit text-secondary leading-relaxed">
              This area is for parents and guardians managing the athlete account.
            </Text>
          </View>
          <View className="rounded-3xl border border-app/10 bg-secondary/10 p-5">
            <View className="flex-row items-center gap-2 mb-2">
              <Feather name="lock" size={16} className="text-secondary" />
              <Text className="text-sm font-outfit text-secondary uppercase tracking-[1.4px]">
                Guardian Access Only
              </Text>
            </View>
            <Text className="text-lg font-clash text-app mb-2">
              Ask your parent or guardian
            </Text>
            <Text className="text-sm font-outfit text-secondary leading-relaxed">
              Parent education, nutrition, and onboarding tools live here.
            </Text>
          </View>
        </ThemedScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView
        onRefresh={async () => {
          if (!token || isRefreshing) return;
          setIsRefreshing(true);
          await fetchCourses({ refreshing: true });
        }}
        refreshing={isRefreshing}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        <View className="mb-8">
          <Text className="text-4xl font-clash text-app mb-2">
            Parent Education Platform
          </Text>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Understand your athlete&apos;s training with our educational module for parents.
          </Text>
        </View>

        {!hasParentProgramAccess ? (
          <View className="rounded-3xl border border-app/10 bg-secondary/10 p-5">
            <View className="flex-row items-center gap-2 mb-2">
              <Feather name="lock" size={16} className="text-secondary" />
              <Text className="text-sm font-outfit text-secondary uppercase tracking-[1.4px]">
                Locked
              </Text>
            </View>
            <Text className="text-xl font-clash text-app mb-2">
              Upgrade to unlock Parent Program
            </Text>
            <Text className="text-sm font-outfit text-secondary leading-relaxed">
              Parent education is available on PHP Plus and PHP Premium plans.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/plans")}
              className="mt-4 rounded-full bg-accent px-4 py-3"
            >
              <Text className="text-white text-sm font-outfit text-center">View Plans</Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <View className="gap-3">
            {[1, 2, 3].map((item) => (
              <View key={item} className="rounded-3xl border border-app/10 bg-input px-4 py-3">
                <View className="h-4 w-32 rounded-full bg-secondary/20" />
                <View className="h-3 w-full rounded-full bg-secondary/20 mt-2" />
                <View className="h-3 w-2/3 rounded-full bg-secondary/20 mt-2" />
              </View>
            ))}
          </View>
        ) : (
          <View className="gap-6">
            {grouped.filter((cat) => cat.items.length > 0).map((cat) => (
              <View key={cat.id}>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className={`${cat.color} h-9 w-9 rounded-2xl items-center justify-center`}>
                      <Feather name={cat.icon as any} size={18} color="white" />
                    </View>
                    <Text className="font-clash text-app text-lg">{cat.title}</Text>
                  </View>
                  <Text className="text-xs font-outfit text-secondary">{cat.items.length} items</Text>
                </View>

                <View className="gap-3">
                  {cat.items.length ? (
                    cat.items.map((item) => {
                      const canAccess = canAccessTier(programTier, item.programTier ?? null);
                      const isPreview = Boolean(item.isPreview);
                      const isLocked = !canAccess && !isPreview;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (isLocked) {
                              Alert.alert(
                                "Upgrade required",
                                "Parent education is included with PHP Plus and Premium plans.",
                                [
                                  { text: "View Plans", onPress: () => router.push("/plans") },
                                  { text: "Not now", style: "cancel" },
                                ]
                              );
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
                          }}
                          className={`bg-input border border-app rounded-[24px] p-5 shadow-sm ${
                            isLocked ? "opacity-60" : ""
                          }`}
                        >
                          <View className="flex-row items-center justify-between">
                            <Text className="font-outfit font-bold text-app text-base">{item.title}</Text>
                            {isLocked ? (
                              <View className="px-2 py-1 rounded-full bg-secondary/10 border border-app/10">
                                <Text className="text-[0.625rem] font-outfit text-secondary uppercase tracking-[1.2px]">
                                  Locked
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text className="text-xs font-outfit text-secondary mt-1 uppercase">
                            {item.modules?.length ?? 0} modules{item.isPreview ? " • Preview" : ""}
                          </Text>
                          <Text className="text-sm font-outfit text-secondary mt-3" numberOfLines={3}>
                            {item.summary}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

        <View className="mt-8 bg-accent/10 rounded-3xl p-6 border border-accent/20">
          <View className="flex-row items-center mb-2">
            <Feather name="info" size={20} className="text-accent mr-2" />
            <Text className="text-accent font-bold font-clash text-lg">
              Full Access
            </Text>
          </View>
          <Text className="text-app font-outfit text-sm leading-relaxed">
            PHP Plus and Premium members receive exclusive articles and video
            guides in every category.
          </Text>
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}
