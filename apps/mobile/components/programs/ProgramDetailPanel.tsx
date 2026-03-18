import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { Modal, Pressable, TouchableOpacity, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { ProgramTabBar } from "@/components/programs/ProgramTabBar";
import { Text } from "@/components/ScaledText";
import {
  BookingsPanel,
  FoodDiaryPanel,
  PhysioReferralPanel,
} from "@/components/programs/ProgramPanels";
import { Shadows } from "@/constants/theme";
import {
  PROGRAM_TABS,
  TRAINING_TABS,
  getSessionTypesForTab,
  ProgramId,
} from "@/constants/program-details";
import { PROGRAM_TIERS } from "@/constants/Programs";
import { useAppSelector } from "@/store/hooks";
import { useRole } from "@/context/RoleContext";
import {
  canAccessTier,
  normalizeProgramTier,
  programIdToTier,
} from "@/lib/planAccess";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { apiRequest } from "@/lib/api";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { Transition } from "@/components/navigation/TransitionStack";

const PROGRAM_TITLES: Record<ProgramId, string> = {
  php: "PHP Program",
  plus: "PHP Plus",
  premium: "PHP Premium",
};

type ProgramDetailPanelProps = {
  programId: ProgramId;
  showBack?: boolean;
  onBack?: () => void;
  onNavigate?: (path: string) => void;
  planDetails?: any;
  pricing?: any;
  onApply?: (tierId: any, interval?: any) => Promise<void>;
  latestSubscriptionRequest?: any;
  sharedBoundTag?: string;
};

type ExerciseMetadata = {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  cues?: string | null;
  progression?: string | null;
  regression?: string | null;
  category?: string | null;
  equipment?: string | null;
};

type ProgramSectionContent = {
  id: number;
  sectionType: string;
  title: string;
  body: string;
  videoUrl?: string | null;
  allowVideoUpload?: boolean | null;
  metadata?: ExerciseMetadata | null;
  order?: number | null;
  updatedAt?: string | null;
};

export function ProgramDetailPanel({
  programId,
  showBack = false,
  onBack,
  onNavigate,
  planDetails,
  pricing,
  latestSubscriptionRequest,
  sharedBoundTag,
}: ProgramDetailPanelProps) {
  const { programTier, token, athleteUserId, managedAthletes, latestSubscriptionRequest: latestRequestFromStore } = useAppSelector(
    (state) => state.user,
  );
  const { colors, isDark } = useAppTheme();
  const { role } = useRole();
  const { isSectionHidden } = useAgeExperience();
  const [phpPlusTabs, setPhpPlusTabs] = useState<string[] | null>(null);
  const currentAthlete = useMemo(() => {
    if (!managedAthletes.length) return null;
    return (
      managedAthletes.find(
        (athlete) => athlete.id === athleteUserId || athlete.userId === athleteUserId,
      ) ?? managedAthletes[0]
    );
  }, [athleteUserId, managedAthletes]);
  const activeAthleteAge = useMemo(() => {
    if (!managedAthletes.length) return null;
    const selected =
      managedAthletes.find(
        (athlete) =>
          athlete.id === athleteUserId || athlete.userId === athleteUserId,
      ) ??
      managedAthletes[0];
    return selected?.age ?? null;
  }, [managedAthletes, athleteUserId]);
  const tabs = useMemo(() => {
    if (programId === "plus") {
      return phpPlusTabs ?? [];
    }
    let base = PROGRAM_TABS[programId];
    if (role === "Athlete") {
      base = base.filter(
        (tab) =>
          tab !== "Parent Education" &&
          tab !== "Nutrition & Food Diaries" &&
          tab !== "Submit Diary",
      );
    }
    if (role === "Guardian") {
      base = base.filter((tab) => tab !== "Video Upload");
    }
    if (isSectionHidden("videoFeedback")) {
      base = base.filter((tab) => tab !== "Video Upload");
    }
    if (isSectionHidden("foodDiary")) {
      base = base.filter(
        (tab) => tab !== "Nutrition & Food Diaries" && tab !== "Submit Diary",
      );
    }
    if (isSectionHidden("physioReferrals")) {
      base = base.filter(
        (tab) => tab !== "Physio Referral" && tab !== "Physio Referrals",
      );
    }
    return base;
  }, [programId, role, isSectionHidden, phpPlusTabs]);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionContent, setSectionContent] = useState<ProgramSectionContent[]>(
    [],
  );
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<Set<number>>(new Set());
  const surfaceColor = isDark ? colors.cardElevated : "#F7FFF9";
  const mutedSurface = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.84)";
  const accentSurface = isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const headerAthleteName = currentAthlete?.name ?? (role === "Athlete" ? "You" : "Assigned athlete");
  const athleteMeta = [
    activeAthleteAge ? `${activeAthleteAge} yrs` : null,
    currentAthlete?.level || null,
    currentAthlete?.team || null,
    currentAthlete?.trainingPerWeek ? `${currentAthlete.trainingPerWeek}x weekly` : null,
  ].filter(Boolean);
  const currentTierLabel = normalizeProgramTier(programTier)?.replace("PHP_", "").replace("_", " ") || "Starter";
  const requiredTier = programIdToTier(programId);
  const latestRequest = latestSubscriptionRequest ?? latestRequestFromStore ?? null;
  const requestStatus = String(latestRequest?.status ?? "");
  const isPendingApproval =
    latestRequest?.planTier === requiredTier &&
    requestStatus === "pending_approval";
  const planSubtitle = planDetails?.description ?? PROGRAM_TIERS.find((item) => item.id === programId)?.description;
  const priceHighlights = pricing?.entries?.slice(0, 2) ?? [];
  const lastBackAtRef = useRef(0);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      if (offsetY < -60 && showBack && onBack) {
        const now = Date.now();
        if (now - lastBackAtRef.current < 1000) return;
        lastBackAtRef.current = now;
        onBack();
      }
    },
    [onBack, showBack]
  );


  const toggleContent = useCallback((id: number) => {
    setExpandedContent((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const loadPhpPlusTabs = useCallback(async () => {
    if (programId !== "plus") return;
    try {
      const response = await apiRequest<{ tabs?: string[] }>(
        `/onboarding/php-plus-tabs?ts=${Date.now()}`,
        { method: "GET", suppressLog: true },
      );
      if (Array.isArray(response.tabs)) {
        setPhpPlusTabs(response.tabs.map((tab) => String(tab)));
      }
    } catch {
      setPhpPlusTabs(null);
    }
  }, [programId]);

  useEffect(() => {
    void loadPhpPlusTabs();
  }, [loadPhpPlusTabs]);

  useEffect(() => {
    setActiveTab(tabs[0]);
  }, [tabs]);

  const filteredSectionContent = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sectionContent;
    return sectionContent.filter((item) => {
      const fields = [item.title, item.body];
      return fields.some((field) =>
        String(field ?? "").toLowerCase().includes(query),
      );
    });
  }, [searchQuery, sectionContent]);

  const searchSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const tabByType = new Map<string, string>();
    tabs.forEach((tab) => {
      getSessionTypesForTab(tab).forEach((type) => {
        tabByType.set(String(type), tab);
      });
    });

    const results: {
      id: string;
      title: string;
      subtitle: string;
      tab: string;
    }[] = [];

    tabs.forEach((tab) => {
      if (tab.toLowerCase().includes(query)) {
        results.push({
          id: `tab-${tab}`,
          title: tab,
          subtitle: "Section",
          tab,
        });
      }
    });

    sectionContent.forEach((item) => {
      const tab = tabByType.get(String(item.sectionType ?? ""));
      if (!tab) return;
      const contentTitle = String(item.title ?? "");
      const contentBody = String(item.body ?? "");
      if (
        contentTitle.toLowerCase().includes(query) ||
        contentBody.toLowerCase().includes(query)
      ) {
        results.push({
          id: `content-${item.id}`,
          title: contentTitle || "Program content",
          subtitle: `Content • ${tab}`,
          tab,
        });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery, tabs, sectionContent]);

  const loadSectionContent = useCallback(
    async (tab: string) => {
      if (!token) {
        setSectionContent([]);
        return;
      }
      const types = getSessionTypesForTab(tab);
      if (types.length === 0) {
        setSectionContent([]);
        return;
      }
      setIsLoadingContent(true);
      setContentError(null);
      try {
        const responses = await Promise.all(
          types.map((type) =>
            apiRequest<{ items: ProgramSectionContent[] }>(
              `/program-section-content?sectionType=${encodeURIComponent(
                String(type),
              )}${activeAthleteAge !== null ? `&age=${encodeURIComponent(String(activeAthleteAge))}` : ""}`,
              { token },
            ),
          ),
        );
        const merged = responses
          .flatMap((res) => res.items ?? [])
          .filter((item) => item && item.id);
        merged.sort((a, b) => {
          const orderA = Number.isFinite(a.order) ? (a.order as number) : 9999;
          const orderB = Number.isFinite(b.order) ? (b.order as number) : 9999;
          if (orderA !== orderB) return orderA - orderB;
          return String(b.updatedAt ?? "").localeCompare(
            String(a.updatedAt ?? ""),
          );
        });
        setSectionContent(merged);
      } catch (err) {
        setContentError(
          err instanceof Error
            ? err.message
            : "Failed to load program content.",
        );
      } finally {
        setIsLoadingContent(false);
      }
    },
    [token, activeAthleteAge],
  );

  useEffect(() => {
    void loadSectionContent(activeTab);
  }, [activeTab, loadSectionContent]);

  const handlePageRefresh = async () => {
    await Promise.all([loadSectionContent(activeTab), loadPhpPlusTabs()]);
    setRefreshToken((prev) => prev + 1);
  };

  const handleVideoPress = (url: string) => {
    setActiveVideoUrl(url);
  };

  const handleTabDetail = (tab: string) => {
    // Intentionally left blank to avoid redirecting the whole page
  };

  const renderTrainingContent = () => {
    const visibleContent = searchQuery.trim()
      ? filteredSectionContent
      : sectionContent;
    const showContentLoading = isLoadingContent;
    const showContentError = contentError;

    if (visibleContent.length === 0) {
      return (
        <View 
          className="rounded-3xl bg-card px-6 py-5"
          style={isDark ? Shadows.none : Shadows.md}
        >
          <Text className="text-sm font-outfit text-secondary text-center">
            {searchQuery.trim()
              ? "No matching content found."
              : "No content configured for this section yet. Ask your coach/admin to add content in Web Admin."}
          </Text>
        </View>
      );
    }
    return (
      <View className="gap-4">
        {showContentLoading ? (
          <View 
            className="rounded-3xl bg-card px-6 py-5"
            style={isDark ? Shadows.none : Shadows.md}
          >
            <Text className="text-sm font-outfit text-secondary text-center">
              Loading section content...
            </Text>
          </View>
        ) : null}
        {showContentError ? (
          <View 
            className="rounded-3xl bg-card px-6 py-5"
            style={isDark ? Shadows.none : Shadows.md}
          >
            <Text className="text-sm font-outfit text-secondary text-center">
              {showContentError}
            </Text>
          </View>
        ) : null}
        {visibleContent.map((item) => {
          const meta = (item.metadata ?? {}) as ExerciseMetadata;
          const hasExercise = !!(meta.sets || meta.reps || meta.duration || meta.restSeconds);
          const isExpanded = expandedContent.has(item.id);
          return (
            <View
              key={`content-${item.id}`}
              className="rounded-3xl bg-[#2F8F57] overflow-hidden"
              style={isDark ? Shadows.none : Shadows.md}
            >
              <Pressable
                onPress={() => toggleContent(item.id)}
                className="px-6 py-5 gap-3"
              >
                <Text className="text-lg font-clash text-white font-bold">{item.title}</Text>
                {hasExercise && (
                  <View className="flex-row flex-wrap gap-2">
                    {meta.sets != null && (
                      <View className="rounded-full bg-white/15 px-3 py-1">
                        <Text className="text-[11px] font-outfit text-white">{meta.sets} sets</Text>
                      </View>
                    )}
                    {meta.reps != null && (
                      <View className="rounded-full bg-white/15 px-3 py-1">
                        <Text className="text-[11px] font-outfit text-white">{meta.reps} reps</Text>
                      </View>
                    )}
                    {meta.duration != null && (
                      <View className="rounded-full bg-white/15 px-3 py-1">
                        <Text className="text-[11px] font-outfit text-white">{meta.duration}s</Text>
                      </View>
                    )}
                    {meta.restSeconds != null && (
                      <View className="rounded-full bg-white/15 px-3 py-1">
                        <Text className="text-[11px] font-outfit text-white">{meta.restSeconds}s rest</Text>
                      </View>
                    )}
                    {meta.category && (
                      <View className="rounded-full bg-white/25 px-3 py-1">
                        <Text className="text-[11px] font-outfit text-white font-semibold">{meta.category}</Text>
                      </View>
                    )}
                  </View>
                )}
                <View className="flex-row items-center justify-between mt-1">
                  <Text className="text-xs font-outfit text-white/80 uppercase tracking-[1.2px]">
                    {isExpanded ? "Hide details" : "View inline"}
                  </Text>
                  <View className="h-7 w-7 rounded-full bg-white/15 items-center justify-center">
                    <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color="#FFFFFF" />
                  </View>
                </View>

                <Transition.Pressable
                  sharedBoundTag={`program-content-${item.id}`}
                  onPress={() => onNavigate?.(`/programs/content/${item.id}?sharedBoundTag=${encodeURIComponent(`program-content-${item.id}`)}`)}
                  className="flex-row items-center justify-between mt-3 pt-3 border-t border-white/10"
                >
                  <Text className="text-xs font-outfit text-white/80 uppercase tracking-[1.2px]">
                    Open full page
                  </Text>
                  <View className="h-7 w-7 rounded-full bg-white/15 items-center justify-center">
                    <Feather name="arrow-right" size={14} color="#FFFFFF" />
                  </View>
                </Transition.Pressable>
              </Pressable>

              {isExpanded && (
                <View className="px-6 pb-6 pt-2 gap-4 border-t border-white/10 mt-1">
                  {item.body ? (
                    <MarkdownText
                      text={item.body}
                      baseStyle={{ fontSize: 15, lineHeight: 24, color: "#FFFFFF" }}
                      headingStyle={{ fontSize: 18, lineHeight: 26, color: "#FFFFFF", fontWeight: "700" }}
                      subheadingStyle={{ fontSize: 16, lineHeight: 24, color: "#FFFFFF", fontWeight: "700" }}
                      listItemStyle={{ paddingLeft: 6 }}
                    />
                  ) : null}

                  {meta.cues ? (
                     <View className="rounded-2xl bg-white/10 border border-white/10 p-4 gap-3">
                       <View className="flex-row items-center gap-2">
                         <View className="h-6 w-6 rounded-full bg-white/20 items-center justify-center">
                           <Feather name="message-circle" size={12} color="#FFFFFF" />
                         </View>
                         <Text className="text-[10px] font-outfit text-white uppercase tracking-[1.5px] font-bold">
                           Coaching Cues
                         </Text>
                       </View>
                       <Text className="text-[14px] font-outfit text-white leading-[22px]">{meta.cues}</Text>
                     </View>
                  ) : null}

                  {(meta.progression || meta.regression) ? (
                    <View className="flex-row gap-3">
                      {meta.progression ? (
                        <View className="flex-1 rounded-2xl bg-white/10 border border-white/10 p-4 gap-3">
                          <View className="flex-row items-center gap-2">
                            <View className="h-6 w-6 rounded-full bg-[#22C55E] items-center justify-center">
                              <Feather name="trending-up" size={12} color="#FFFFFF" />
                            </View>
                            <Text className="text-[10px] font-outfit text-white uppercase tracking-[1.5px] font-bold">
                              Progression
                            </Text>
                          </View>
                          <Text className="text-sm font-outfit text-white leading-relaxed">{meta.progression}</Text>
                        </View>
                      ) : null}
                      {meta.regression ? (
                        <View className="flex-1 rounded-2xl bg-white/10 border border-white/10 p-4 gap-3">
                          <View className="flex-row items-center gap-2">
                            <View className="h-6 w-6 rounded-full bg-[#F97316] items-center justify-center">
                              <Feather name="trending-down" size={12} color="#FFFFFF" />
                            </View>
                            <Text className="text-[10px] font-outfit text-white uppercase tracking-[1.5px] font-bold">
                              Regression
                            </Text>
                          </View>
                          <Text className="text-sm font-outfit text-white leading-relaxed">{meta.regression}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {item.videoUrl ? (
                    <Pressable
                      onPress={() => handleVideoPress(item.videoUrl!)}
                      className="rounded-2xl px-5 py-4 flex-row items-center gap-3 mt-1"
                      style={{ backgroundColor: mutedSurface }}
                    >
                      <View className="h-10 w-10 rounded-full bg-white/20 items-center justify-center">
                        <Feather name="play" size={16} color="#FFFFFF" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-outfit text-white font-semibold">Watch Video</Text>
                        <Text className="text-[11px] font-outfit text-white/70 mt-0.5" numberOfLines={1}>{item.videoUrl}</Text>
                      </View>
                      <Feather name="external-link" size={16} color="#FFFFFF" />
                    </Pressable>
                  ) : null}


                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderTab = () => {
    const hasAccess = canAccessTier(programTier, programIdToTier(programId));
    const normalizedTier = normalizeProgramTier(programTier);
    if (!hasAccess) {
      const title = isPendingApproval
        ? "Plan approval pending"
        : normalizedTier
          ? "Program locked"
          : "Complete onboarding to unlock programs";
      const body = isPendingApproval
        ? "Your plan request is waiting for admin approval. We’ll notify you once it’s approved."
        : normalizedTier
          ? "This program is available on a higher tier."
          : "Once your plan is active, your full program will appear here.";
      return (
        <View 
          className="rounded-3xl bg-card px-6 py-5 gap-3"
          style={isDark ? Shadows.none : Shadows.md}
        >
          <View className="flex-row items-center gap-2">
            <Feather name={isPendingApproval ? "clock" : "lock"} size={16} color={colors.accent} />
            <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
              {isPendingApproval ? "Approval Waiting" : "Pending Access"}
            </Text>
          </View>
          <Text className="text-lg font-clash text-app font-bold">{title}</Text>
          <Text className="text-sm font-outfit text-secondary leading-relaxed">{body}</Text>
        </View>
      );
    }
    if (activeTab === "Program") {
      const tier = PROGRAM_TIERS.find((item) => item.id === programId);
      return (
        <View className="gap-4">

          <View 
            className="rounded-[28px] px-6 py-5 gap-3"
            style={{ backgroundColor: surfaceColor, ...(isDark ? Shadows.none : Shadows.md) }}
          >
            <View className="self-start rounded-full px-3 py-1.5" style={{ backgroundColor: accentSurface }}>
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]" style={{ color: colors.accent }}>
                Program features
              </Text>
            </View>
            <Text className="text-lg font-clash text-app font-bold">Program Features</Text>
            {tier?.features?.map((feature, index) => (
              <View
                key={`${tier.id}-feature-${index}`}
                className="flex-row items-center gap-3"
              >
                <View className="h-5 w-5 rounded-full items-center justify-center" style={{ backgroundColor: accentSurface }}>
                  <Feather name="check" size={10} color={colors.accent} />
                </View>
                <Text className="text-sm font-outfit text-app flex-1">
                  {feature}
                </Text>
              </View>
            ))}
          </View>
          {renderTrainingContent()}
        </View>
      );
    }

    if (TRAINING_TABS.has(activeTab)) {
      return renderTrainingContent();
    }

    if (activeTab === "Book In" || activeTab === "Bookings") {
      return <BookingsPanel onOpen={() => onNavigate?.("/(tabs)/schedule")} />;
    }

    if (activeTab === "Physio Referral" || activeTab === "Physio Referrals") {
      return (
        <PhysioReferralPanel discount={programId === "plus" ? "10%" : undefined} />
      );
    }

    if (activeTab === "Nutrition & Food Diaries" || activeTab === "Submit Diary") {
      if (role !== "Guardian") {
        return (
          <View 
            className="rounded-3xl bg-card px-6 py-5"
            style={isDark ? Shadows.none : Shadows.md}
          >
            <Text className="text-sm font-outfit text-secondary text-center">
              Food diaries are managed by guardians.
            </Text>
          </View>
        );
      }
      return <FoodDiaryPanel />;
    }

    return (
      <View 
        className="rounded-3xl bg-card px-6 py-5"
        style={isDark ? Shadows.none : Shadows.md}
      >
        <Text className="text-sm font-outfit text-secondary text-center">
          Content coming soon.
        </Text>
      </View>
    );
  };

  return (
    <>
      <ThemedScrollView
        onRefresh={handlePageRefresh}
        contentContainerStyle={{ paddingBottom: 40 }}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
      >
        <View className="px-6 pt-6">
          <Transition.View
            sharedBoundTag={sharedBoundTag}
            className="overflow-hidden rounded-[30px] border px-5 py-5 mb-6"
            style={{
              backgroundColor: surfaceColor,
              borderColor: borderSoft,
              ...(isDark ? Shadows.none : Shadows.md),
            }}
          >
            <View className="absolute -right-10 -top-8 h-28 w-28 rounded-full" style={{ backgroundColor: accentSurface }} />
            <View className="absolute -bottom-10 left-10 h-24 w-24 rounded-full" style={{ backgroundColor: mutedSurface }} />

            <View className="flex-row items-center justify-between mb-4">
              {showBack ? (
                <TouchableOpacity
                  onPress={() => (onBack ? onBack() : undefined)}
                  className="h-11 w-11 items-center justify-center rounded-[18px]"
                  style={{ backgroundColor: mutedSurface }}
                >
                  <Feather name="arrow-left" size={20} color={colors.accent} />
                </TouchableOpacity>
              ) : (
                <View className="w-11" />
              )}
              <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: mutedSurface }}>
                <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]" style={{ color: colors.accent }}>
                  {currentTierLabel}
                </Text>
              </View>
              <View className="w-11" />
            </View>

            <Text className="text-3xl font-telma-bold text-app font-bold">
              {PROGRAM_TITLES[programId]}
            </Text>
            {planSubtitle ? (
              <Text className="text-base font-outfit text-secondary mt-2 leading-6">
                {planSubtitle}
              </Text>
            ) : null}

            <View className="mt-4 flex-row flex-wrap gap-2">
              <View className="rounded-full px-3 py-2" style={{ backgroundColor: accentSurface }}>
                <Text className="text-[11px] font-outfit font-semibold uppercase tracking-[1.2px]" style={{ color: colors.accent }}>
                  Athlete detail: {headerAthleteName}
                </Text>
              </View>
              {athleteMeta.map((item) => (
                <View key={item} className="rounded-full px-3 py-2" style={{ backgroundColor: mutedSurface }}>
                  <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>

            {priceHighlights.length ? (
              <View className="mt-4 flex-row gap-3">
                {priceHighlights.map((entry: any) => (
                  <View key={entry.label} className="flex-1 rounded-[22px] px-4 py-4" style={{ backgroundColor: mutedSurface }}>
                    <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px] text-secondary">
                      {entry.label}
                    </Text>
                    <Text className="mt-2 text-lg font-clash text-app" numberOfLines={1}>
                      {entry.discounted ?? entry.original}
                    </Text>
                    {entry.discounted ? (
                      <Text className="text-xs font-outfit text-secondary mt-1 line-through">
                        {entry.original}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </Transition.View>
        </View>

        <ProgramTabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onTabPress={handleTabDetail}
        />

        {searchQuery.trim().length > 0 ? (
          <View className="px-6 mb-6">
            <View 
              className="rounded-[28px] px-4 py-4"
              style={{ backgroundColor: surfaceColor, ...(isDark ? Shadows.none : Shadows.md) }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs font-outfit uppercase tracking-[1.6px] text-secondary">
                  Suggestions
                </Text>
                <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: accentSurface }}>
                  <Text className="text-[10px] font-outfit" style={{ color: colors.accent }}>
                    {searchSuggestions.length} result
                    {searchSuggestions.length === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>
              {searchSuggestions.length === 0 ? (
                <View className="rounded-2xl border border-dashed px-3 py-3" style={{ borderColor: borderSoft, backgroundColor: mutedSurface }}>
                  <Text className="text-sm font-outfit text-secondary">
                    No matching sections found.
                  </Text>
                  <Text className="text-xs font-outfit text-secondary mt-1">
                    Try a different keyword or browse the tabs below.
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {searchSuggestions.map((item) => {
                    const isSection = item.subtitle === "Section";
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          if (item.id.startsWith("content-")) {
                            setActiveTab(item.tab);
                            setSearchQuery("");
                            const contentId = parseInt(item.id.replace("content-", ""), 10);
                            setExpandedContent((prev) => new Set(prev).add(contentId));
                          } else {
                            setActiveTab(item.tab);
                            setSearchQuery("");
                          }
                        }}
                        className="rounded-2xl border px-3 py-3"
                        style={{ borderColor: borderSoft, backgroundColor: mutedSurface }}
                      >
                        <View className="flex-row items-center gap-3">
                          <View
                            className={`h-9 w-9 rounded-xl items-center justify-center ${
                              isSection ? "bg-[#2F8F57]" : "bg-[#2F8F57]/15"
                            }`}
                          >
                            <Feather
                              name={isSection ? "layers" : "file-text"}
                              size={16}
                              color={isSection ? "white" : "#2F8F57"}
                            />
                          </View>
                          <View className="flex-1">
                            <Text className="text-base font-outfit text-app">
                              {item.title}
                            </Text>
                            <Text className="text-xs font-outfit text-secondary mt-1">
                              {item.subtitle}
                            </Text>
                          </View>
                          <View className="px-2.5 py-1 rounded-full bg-secondary/10">
                            <Text className="text-[10px] font-outfit text-secondary">
                              {item.tab}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        ) : null}

        <View className="px-6">{renderTab()}</View>
      </ThemedScrollView>

      <Modal
        visible={Boolean(activeVideoUrl)}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveVideoUrl(null)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.18)" : "rgba(15,23,42,0.18)" }}>
          <View className="rounded-t-3xl p-4 pb-8" style={{ backgroundColor: surfaceColor }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-clash text-app font-bold">
                Exercise Video
              </Text>
              <TouchableOpacity
                onPress={() => setActiveVideoUrl(null)}
                className="h-10 w-10 rounded-full items-center justify-center"
                style={{ backgroundColor: mutedSurface }}
              >
                <Feather name="x" size={20} color={colors.accent} />
              </TouchableOpacity>
            </View>
            {activeVideoUrl ? <VideoPlayer uri={activeVideoUrl} useVideoResolution /> : null}
          </View>
        </View>
      </Modal>

    </>
  );
}
