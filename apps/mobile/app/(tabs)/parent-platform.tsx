import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, InteractionManager, Modal, Pressable, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import { useRole } from "@/context/RoleContext";
import { setParentContentCache } from "@/lib/parentContentCache";
import { canAccessTier, tierRank } from "@/lib/planAccess";
import { Text } from "@/components/ScaledText";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { setAthleteUserId, setManagedAthletes } from "@/store/slices/userSlice";

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
  const dispatch = useAppDispatch();
  const { token, programTier, athleteUserId, managedAthletes } = useAppSelector((state) => state.user);
  const router = useRouter();
  const { isSectionHidden } = useAgeExperience();
  const [items, setItems] = useState<ParentCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const isAthlete = role === "Athlete";
  const platformTitle = isAthlete ? "Athlete Platform" : "Parent Education Platform";
  const platformSubtitle = isAthlete
    ? "Personalized lessons, recovery tips, and training guidance built for your age and plan."
    : "Understand your athlete's training with our educational module for parents.";
  const lockedTitle = isAthlete ? "Athlete platform locked" : "Parent platform locked";
  const lockedMessage = isAthlete
    ? "Athlete education content is restricted for this age."
    : "Parent education content is restricted for this age.";

  if (isSectionHidden("parentPlatform")) {
    return <AgeGate title={lockedTitle} message={lockedMessage} />;
  }

  const fetchCourses = useCallback(async (options?: { refreshing?: boolean }) => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const headers =
        !isAthlete && athleteUserId
          ? { "X-Acting-User-Id": String(athleteUserId) }
          : undefined;
      const data = await apiRequest<{ items: ParentCourseItem[] }>("/content/parent-courses", {
        token,
        headers,
      });
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
  }, [athleteUserId, isAthlete, token]);

  const fetchManagedAthletes = useCallback(async () => {
    if (!token || role !== "Guardian") return;
    try {
      const data = await apiRequest<{
        guardian?: { activeAthleteId?: number | null } | null;
        athletes?: ManagedAthlete[];
      }>("/onboarding/athletes", { token });
      const athleteList = data.athletes ?? [];
      dispatch(setManagedAthletes(athleteList));
      const activeAthlete =
        athleteList.find((item) => item.id === data.guardian?.activeAthleteId) ??
        athleteList[0] ??
        null;
      if (activeAthlete?.id) {
        dispatch(setAthleteUserId(activeAthlete.id));
      }
    } catch {
      dispatch(setManagedAthletes([]));
      dispatch(setAthleteUserId(null));
    }
  }, [dispatch, role, token]);

  useEffect(() => {
    let mounted = true;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!mounted) return;
      if (role === "Guardian") {
        fetchManagedAthletes();
      }
      fetchCourses();
    });
    return () => {
      mounted = false;
      task?.cancel?.();
    };
  }, [fetchCourses, fetchManagedAthletes, role]);

  const grouped = useMemo(() => {
    return CATEGORIES.map((category) => ({
      ...category,
      items: items.filter((item) => item.category === category.title),
    }));
  }, [items]);
  const hasParentProgramAccess = tierRank(programTier) >= tierRank("PHP_Plus");
  const hasPremiumAccess = tierRank(programTier) >= tierRank("PHP_Premium");
  const selectedAthlete =
    athleteUserId != null
      ? managedAthletes.find((athlete) => athlete.id === athleteUserId) ?? null
      : null;
  const sortedAthletes = useMemo(() => {
    if (!managedAthletes.length) return [];
    if (!selectedAthlete) return managedAthletes;
    return [
      selectedAthlete,
      ...managedAthletes.filter((athlete) => athlete.id !== selectedAthlete.id),
    ];
  }, [managedAthletes, selectedAthlete]);
  const visibleGroups = isAthlete ? [] : grouped.filter((cat) => cat.items.length > 0);
  const visibleItems = isAthlete ? items : [];

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
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-4xl font-clash text-app mb-2">
                {platformTitle}
              </Text>
              <Text className="text-base font-outfit text-secondary leading-relaxed">
                {platformSubtitle}
              </Text>
            </View>
            {role === "Guardian" ? (
              <TouchableOpacity
                onPress={() => setIsPickerOpen(true)}
                className="h-11 w-11 rounded-2xl bg-secondary/10 border border-app/10 items-center justify-center"
              >
                <Feather name="menu" size={18} className="text-secondary" />
              </TouchableOpacity>
            ) : null}
          </View>
          {isAthlete ? (
            <View className="mt-4 rounded-2xl border border-app/10 bg-secondary/10 px-4 py-3">
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.4px]">
                Age-Based Content
              </Text>
              <Text className="text-sm font-outfit text-secondary mt-1">
                Content updates automatically as you grow, so next year&apos;s training
                guidance will unlock when your age increases.
              </Text>
            </View>
          ) : selectedAthlete ? (
            <View className="mt-4 rounded-2xl border border-app/10 bg-secondary/10 px-4 py-3 flex-row items-center gap-3">
              {selectedAthlete.profilePicture ? (
                <Image
                  source={{ uri: selectedAthlete.profilePicture }}
                  style={{ width: 44, height: 44, borderRadius: 12 }}
                />
              ) : (
                <View className="h-11 w-11 rounded-xl bg-secondary/20 items-center justify-center">
                  <Feather name="user" size={18} className="text-secondary" />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-sm font-outfit text-secondary uppercase tracking-[1.2px]">
                  Viewing Athlete
                </Text>
                <Text className="text-base font-clash text-app mt-0.5">
                  {selectedAthlete.name ?? "Athlete"}
                </Text>
              </View>
            </View>
          ) : null}
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
              Upgrade to unlock {isAthlete ? "Athlete" : "Parent"} Program
            </Text>
            <Text className="text-sm font-outfit text-secondary leading-relaxed">
              {isAthlete
                ? "Athlete education is available on PHP Plus and PHP Premium plans."
                : "Parent education is available on PHP Plus and PHP Premium plans."}
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
            {isAthlete ? (
              <View className="gap-3">
                {visibleItems.map((item) => {
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
                            "Athlete education is included with PHP Plus and Premium plans.",
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
                })}
              </View>
            ) : (
              visibleGroups.map((cat) => (
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
              ))
            )}
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

      {role === "Guardian" ? (
        <Modal transparent visible={isPickerOpen} animationType="fade" onRequestClose={() => setIsPickerOpen(false)}>
          <Pressable className="flex-1 bg-black/40" onPress={() => setIsPickerOpen(false)}>
            <Pressable
              onPress={() => {}}
              className="absolute right-6 top-24 w-72 rounded-3xl bg-app border border-app/10 p-4"
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm font-outfit text-secondary uppercase tracking-[1.4px]">
                  Switch Athlete
                </Text>
                <TouchableOpacity
                  onPress={() => setIsPickerOpen(false)}
                  className="h-8 w-8 rounded-full bg-secondary/20 items-center justify-center"
                >
                  <Feather name="x" size={14} className="text-secondary" />
                </TouchableOpacity>
              </View>
              {managedAthletes.length ? (
                <View className="gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      dispatch(setAthleteUserId(null));
                      setIsPickerOpen(false);
                    }}
                    className={`rounded-2xl border px-3 py-3 ${
                      athleteUserId == null
                        ? "bg-[#2F8F57]/10 border-[#2F8F57]/30"
                        : "bg-input border-gray-100 dark:border-gray-800"
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="h-11 w-11 rounded-xl bg-secondary/20 items-center justify-center">
                        <Feather name="users" size={18} className="text-secondary" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-clash text-app">
                          Parent (my courses)
                        </Text>
                        <Text className="text-xs font-outfit text-secondary mt-0.5">
                          View guardian content
                        </Text>
                      </View>
                      {athleteUserId == null ? (
                        <View className="h-2.5 w-2.5 rounded-full bg-[#2F8F57]" />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                  {sortedAthletes.map((athlete) => {
                    const isActive = selectedAthlete?.id === athlete.id;
                    return (
                      <TouchableOpacity
                        key={athlete.id ?? athlete.name ?? Math.random()}
                        onPress={() => {
                          if (athlete.id) {
                            dispatch(setAthleteUserId(athlete.id));
                          }
                          setIsPickerOpen(false);
                        }}
                        className={`rounded-2xl border px-3 py-3 ${
                          isActive
                            ? "bg-[#2F8F57]/10 border-[#2F8F57]/30"
                            : "bg-input border-gray-100 dark:border-gray-800"
                        }`}
                      >
                        <View className="flex-row items-center gap-3">
                          {athlete.profilePicture ? (
                            <Image
                              source={{ uri: athlete.profilePicture }}
                              style={{ width: 44, height: 44, borderRadius: 12 }}
                            />
                          ) : (
                            <View className="h-11 w-11 rounded-xl bg-secondary/20 items-center justify-center">
                              <Feather name="user" size={18} className="text-secondary" />
                            </View>
                          )}
                          <View className="flex-1">
                            <Text className="text-sm font-clash text-app">
                              {athlete.name ?? "Athlete"}
                            </Text>
                            <Text className="text-xs font-outfit text-secondary mt-0.5">
                              {athlete.team ?? "Team not set"} • {athlete.age ?? "—"} yrs
                            </Text>
                          </View>
                          {isActive ? (
                            <View className="h-2.5 w-2.5 rounded-full bg-[#2F8F57]" />
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {hasPremiumAccess ? (
                    <TouchableOpacity
                      onPress={() => {
                        setIsPickerOpen(false);
                        router.push("/parent-platform/stats");
                      }}
                      className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-input px-3 py-3"
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="h-11 w-11 rounded-xl bg-[#2F8F57]/15 items-center justify-center">
                          <Feather name="bar-chart-2" size={18} color="#2F8F57" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-clash text-app">
                            Athlete Stats
                          </Text>
                          <Text className="text-xs font-outfit text-secondary mt-0.5">
                            Premium analytics dashboard
                          </Text>
                        </View>
                        <View className="px-2 py-1 rounded-full bg-[#2F8F57]/10">
                          <Text className="text-[10px] font-outfit text-[#2F8F57]">
                            Premium
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <Text className="text-sm font-outfit text-secondary">
                  No athlete profiles found for this account.
                </Text>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}
