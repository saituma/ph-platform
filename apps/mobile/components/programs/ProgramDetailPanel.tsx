import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownText } from "@/components/ui/MarkdownText";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { ProgramTabBar } from "@/components/programs/ProgramTabBar";
import { Text } from "@/components/ScaledText";
import {
  BookingsPanel,
  FoodDiaryPanel,
  PhysioReferralPanel,
  ParentEducationPanel,
  VideoUploadPanel,
} from "@/components/programs/ProgramPanels";
import { AchievementsStrip, type TrainingAchievement } from "@/components/programs/AchievementsStrip";
import { ProgramSessionPanel } from "@/components/programs/ProgramSessionPanel";
import { Shadows } from "@/constants/theme";
import {
  PROGRAM_TABS,
  TRAINING_TABS,
  getSessionTypesForTab,
  normalizeProgramTabLabel,
  pickTrainingFlowSteps,
  ProgramId,
} from "@/constants/program-details";
import { PROGRAM_TIERS } from "@/constants/Programs";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMessagingAccessTiers, setProgramTier } from "@/store/slices/userSlice";
import { canUseCoachMessaging } from "@/lib/messagingAccess";
import {
  canAccessTier,
  normalizeProgramTier,
  programIdToTier,
} from "@/lib/planAccess";
import { sessionsFromSectionContentForTab } from "@/lib/sessionsFromSectionContent";
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
  steps?: string | null;
  cues?: string | null;
  progression?: string | null;
  regression?: string | null;
  category?: string | null;
  equipment?: string | null;
  weekNumber?: number | null;
  sessionNumber?: number | null;
  sessionLabel?: string | null;
};

type ProgramSectionContent = {
  id: number;
  sectionType: string;
  title: string;
  body: string;
  videoUrl?: string | null;
  completed?: boolean | null;
  allowVideoUpload?: boolean | null;
  metadata?: ExerciseMetadata | null;
  order?: number | null;
  updatedAt?: string | null;
};

type PlanExercise = {
  id: number;
  order: number;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  coachingNotes?: string | null;
  completed?: boolean;
  linkedProgramSectionContentId?: number | null;
  linkedProgramSectionContent?: {
    id: number;
    title?: string | null;
    allowVideoUpload?: boolean | null;
    videoUrl?: string | null;
  } | null;
  exercise?: {
    id: number;
    name: string;
    videoUrl?: string | null;
    sets?: number | null;
    reps?: number | null;
    duration?: number | null;
    restSeconds?: number | null;
    cues?: string | null;
  } | null;
};

type PlanSession = {
  id: number;
  weekNumber: number;
  sessionNumber: number;
  title?: string | null;
  notes?: string | null;
  exercises: PlanExercise[];
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
  const dispatch = useAppDispatch();
  const {
    programTier,
    token,
    athleteUserId,
    managedAthletes,
    messagingAccessTiers,
    latestSubscriptionRequest: latestRequestFromStore,
  } = useAppSelector((state) => state.user);
  const { colors, isDark } = useAppTheme();
  const { isSectionHidden } = useAgeExperience();
  const [phpPlusTabs, setPhpPlusTabs] = useState<string[] | null>(null);
  
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
      return phpPlusTabs ?? PROGRAM_TABS.plus;
    }
    let base = PROGRAM_TABS[programId];
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
  }, [programId, isSectionHidden, phpPlusTabs]);

  const [activeTab, setActiveTab] = useState<string>("Program");
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [uploadPickerOpen, setUploadPickerOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [sectionContent, setSectionContent] = useState<ProgramSectionContent[]>(
    [],
  );
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [trainingProgress, setTrainingProgress] = useState<{
    stats: { exerciseCompletions: number; sessionRuns: number; trainingDays: number };
    achievements: TrainingAchievement[];
  } | null>(null);
  const [expandedContent, setExpandedContent] = useState<Set<number>>(new Set());
  
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const mutedSurface = isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9";
  
  const currentTierLabel = normalizeProgramTier(programTier)?.replace("PHP_", "").replace("_", " ") || "Starter";
  const requiredTier = programIdToTier(programId);
  const latestRequest = latestSubscriptionRequest ?? latestRequestFromStore ?? null;
  const requestStatus = String(latestRequest?.status ?? "");
  const isPendingApproval =
    latestRequest?.planTier === requiredTier &&
    requestStatus === "pending_approval";

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
        setPhpPlusTabs(response.tabs.map((tab) => normalizeProgramTabLabel(String(tab))));
      }
    } catch {
      setPhpPlusTabs(null);
    }
  }, [programId]);

  useEffect(() => {
    void loadPhpPlusTabs();
  }, [loadPhpPlusTabs]);

  const loadTrainingProgress = useCallback(async () => {
    if (!token) {
      setTrainingProgress(null);
      return;
    }
    try {
      const data = await apiRequest<{
        stats: { exerciseCompletions: number; sessionRuns: number; trainingDays: number };
        achievements: TrainingAchievement[];
      }>("/training-progress", { token, forceRefresh: true });
      setTrainingProgress({ stats: data.stats, achievements: data.achievements });
    } catch {
      setTrainingProgress(null);
    }
  }, [token]);

  useEffect(() => {
    void loadTrainingProgress();
  }, [loadTrainingProgress]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const status = await apiRequest<{
          currentProgramTier?: string | null;
          messagingAccessTiers?: string[] | null;
        }>("/billing/status", { token, suppressStatusCodes: [401, 403, 404], skipCache: true });
        if (cancelled) return;
        dispatch(setProgramTier(status?.currentProgramTier ?? null));
        dispatch(
          setMessagingAccessTiers(
            Array.isArray(status?.messagingAccessTiers)
              ? status!.messagingAccessTiers!
              : ["PHP", "PHP_Plus", "PHP_Premium"],
          ),
        );
      } catch {
        // no-op
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, token]);

  useEffect(() => {
    if (!tabs.length) return;
    setActiveTab((prev) => (tabs.includes(prev) ? prev : tabs[0]!));
  }, [tabs]);

  const canMessageCoach = useMemo(
    () => canUseCoachMessaging(programTier, messagingAccessTiers),
    [messagingAccessTiers, programTier],
  );

  const openCoachMessage = useCallback(
    async (draftBody: string) => {
      if (!canMessageCoach) {
        Alert.alert("Messaging", "Not included on your current plan.");
        return;
      }
      if (!token || !onNavigate) return;
      try {
        const data = await apiRequest<{
          coach?: { id: number };
          coaches?: { id: number; isAi?: boolean }[];
        }>("/messages", { token, skipCache: true });
        const human = (data.coaches ?? []).find((c) => !c.isAi);
        const coachId = human?.id ?? data.coach?.id;
        if (!coachId) {
          Alert.alert("Messaging", "No coach linked yet.");
          return;
        }
        const q = encodeURIComponent(draftBody.slice(0, 1200));
        onNavigate(`/messages/${coachId}?draft=${q}`);
      } catch {
        Alert.alert("Messaging", "Couldn’t open messages.");
      }
    },
    [canMessageCoach, onNavigate, token],
  );

  const loadSectionContent = useCallback(
    async (tab: string, options?: { force?: boolean }) => {
      if (!token) {
        setSectionContent([]);
        return;
      }
      const types = getSessionTypesForTab(tab);
      if (types.length === 0) {
        setSectionContent([]);
        return;
      }
      const tier = programIdToTier(programId);
      const ageQ =
        activeAthleteAge !== null
          ? `&age=${encodeURIComponent(String(activeAthleteAge))}`
          : "";
      const force = options?.force ?? false;
      setIsLoadingContent(true);
      setContentError(null);
      try {
        const responses = await Promise.all(
          types.map((type) =>
            apiRequest<{ items: ProgramSectionContent[] }>(
              `/program-section-content?sectionType=${encodeURIComponent(String(type))}&programTier=${encodeURIComponent(tier)}${ageQ}`,
              { token, forceRefresh: force },
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
    [token, activeAthleteAge, programId],
  );

  useEffect(() => {
    void loadSectionContent(activeTab);
  }, [activeTab, loadSectionContent]);

  const handlePageRefresh = async () => {
    await Promise.all([
      loadSectionContent(activeTab, { force: true }),
      loadPhpPlusTabs(),
      loadTrainingProgress(),
    ]);
    setRefreshToken((prev) => prev + 1);
  };

  const handleVideoPress = (url: string) => {
    setActiveVideoUrl(url);
  };

  const uploadEnabledContent = useMemo(
    () => sectionContent.filter((item) => Boolean(item.allowVideoUpload)),
    [sectionContent],
  );

  const openUploadFlow = useCallback((content: ProgramSectionContent) => {
    setUploadPickerOpen(false);
    onNavigate?.(
      `/video-upload?sectionContentId=${content.id}&sectionTitle=${encodeURIComponent(
        content.title,
      )}&refreshToken=${refreshToken}`,
    );
  }, [onNavigate, refreshToken]);

  const openFloatingUpload = useCallback(() => {
    if (uploadEnabledContent.length === 1) {
      openUploadFlow(uploadEnabledContent[0]!);
      return;
    }
    setUploadPickerOpen(true);
  }, [openUploadFlow, uploadEnabledContent]);

  const renderTrainingContent = () => {
    const visibleContent = sectionContent;
    const showContentLoading = isLoadingContent;
    const showContentError = contentError;

    if (visibleContent.length === 0) {
      return (
        <View className="py-10 items-center justify-center">
          <Text className="text-sm font-outfit text-secondary text-center">
            No training content available for this section.
          </Text>
        </View>
      );
    }
    return (
      <View className="gap-3">
        {showContentLoading ? (
          <View className="py-5 items-center justify-center">
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : null}
        {showContentError ? (
          <View className="rounded-2xl bg-red-500/10 px-5 py-4">
            <Text className="text-sm font-outfit text-red-500 text-center">
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
              className="rounded-[24px] overflow-hidden border"
              style={{
                backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                borderColor: borderSoft,
                ...(isDark ? Shadows.none : Shadows.sm),
              }}
            >
              <Pressable
                onPress={() => toggleContent(item.id)}
                className="px-5 py-4"
              >
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[17px] font-clash font-bold" style={{ color: colors.text }}>
                      {item.title}
                    </Text>
                    {meta.category && (
                      <Text className="text-[12px] font-outfit text-secondary mt-0.5">
                        {meta.category}
                      </Text>
                    )}
                  </View>
                  <View className="h-8 w-8 rounded-full items-center justify-center" style={{ backgroundColor: mutedSurface }}>
                    <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                  </View>
                </View>

                {hasExercise && (
                  <View className="flex-row flex-wrap gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: borderSoft }}>
                    {[
                      meta.sets != null ? `${meta.sets} sets` : null,
                      meta.reps != null ? `${meta.reps} reps` : null,
                      meta.duration != null ? `${meta.duration}s` : null,
                      meta.restSeconds != null ? `${meta.restSeconds}s rest` : null,
                    ].filter(Boolean).map((stat, i) => (
                      <View key={i} className="rounded-md px-2 py-1" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)" }}>
                        <Text className="text-[11px] font-outfit font-medium" style={{ color: colors.textSecondary }}>{stat}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>

              {isExpanded && (
                <View className="px-5 pb-5 gap-5 border-t" style={{ borderColor: borderSoft, backgroundColor: isDark ? "rgba(0,0,0,0.1)" : "#F8FAFC" }}>
                  {item.body ? (
                    <View className="pt-4">
                      <MarkdownText
                        text={item.body}
                        baseStyle={{ fontSize: 14, lineHeight: 22, color: colors.text }}
                        headingStyle={{ fontSize: 16, lineHeight: 24, color: colors.text, fontWeight: "600", marginBottom: 8 }}
                        subheadingStyle={{ fontSize: 15, lineHeight: 22, color: colors.text, fontWeight: "600", marginBottom: 6 }}
                        listItemStyle={{ paddingLeft: 4, marginBottom: 4 }}
                      />
                    </View>
                  ) : <View className="pt-2" />}

                  {meta.cues ? (
                     <View className="rounded-2xl p-4 gap-2 border" style={{ backgroundColor: colors.background, borderColor: borderSoft }}>
                       <View className="flex-row items-center gap-1.5">
                         <Feather name="info" size={14} color={colors.accent} />
                         <Text className="text-[11px] font-outfit uppercase tracking-[1px] font-bold" style={{ color: colors.accent }}>
                           Coaching Cues
                         </Text>
                       </View>
                       <Text className="text-[14px] font-outfit" style={{ color: colors.text }}>{meta.cues}</Text>
                     </View>
                  ) : null}

                  {(meta.progression || meta.regression) ? (
                    <View className="flex-row gap-3">
                      {meta.progression ? (
                        <View className="flex-1 rounded-2xl p-3 gap-2 border" style={{ backgroundColor: colors.background, borderColor: borderSoft }}>
                          <View className="flex-row items-center gap-1.5">
                            <Feather name="trending-up" size={14} color="#10B981" />
                            <Text className="text-[10px] font-outfit uppercase tracking-[1px] font-bold" style={{ color: "#10B981" }}>
                              Make harder
                            </Text>
                          </View>
                          <Text className="text-[13px] font-outfit" style={{ color: colors.text }}>{meta.progression}</Text>
                        </View>
                      ) : null}
                      {meta.regression ? (
                        <View className="flex-1 rounded-2xl p-3 gap-2 border" style={{ backgroundColor: colors.background, borderColor: borderSoft }}>
                          <View className="flex-row items-center gap-1.5">
                            <Feather name="trending-down" size={14} color="#F59E0B" />
                            <Text className="text-[10px] font-outfit uppercase tracking-[1px] font-bold" style={{ color: "#F59E0B" }}>
                              Make easier
                            </Text>
                          </View>
                          <Text className="text-[13px] font-outfit" style={{ color: colors.text }}>{meta.regression}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <View className="flex-row gap-2 mt-1">
                    {item.videoUrl ? (
                      <Pressable
                        onPress={() => handleVideoPress(item.videoUrl!)}
                        className="flex-1 rounded-2xl py-3 flex-row items-center justify-center gap-2"
                        style={{ backgroundColor: colors.accent }}
                      >
                        <Feather name="play-circle" size={16} color="#FFFFFF" />
                        <Text className="text-sm font-outfit font-bold text-white">Watch</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() =>
                        void openCoachMessage(
                          `Program: ${PROGRAM_TITLES[programId]}\nSection: ${activeTab}\nDrill: ${item.title}\n\nHi coach, quick question:\n`,
                        )
                      }
                      className="flex-1 rounded-2xl py-3 flex-row items-center justify-center gap-2 border"
                      style={{ borderColor: borderSoft, backgroundColor: colors.background }}
                    >
                      <Feather name="message-circle" size={16} color={colors.text} />
                      <Text className="text-sm font-outfit font-semibold" style={{ color: colors.text }}>Ask coach</Text>
                    </Pressable>
                    {item.allowVideoUpload ? (
                      <Pressable
                        onPress={() => openUploadFlow(item)}
                        className="flex-1 rounded-2xl py-3 flex-row items-center justify-center gap-2 border"
                        style={{ borderColor: colors.accent, backgroundColor: isDark ? "rgba(34,197,94,0.08)" : "#F0FDF4" }}
                      >
                        <Feather name="video" size={16} color={colors.accent} />
                        <Text className="text-sm font-outfit font-semibold" style={{ color: colors.accent }}>
                          Send video
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  
                  <Transition.Pressable
                    sharedBoundTag={`program-content-${item.id}`}
                    onPress={() => onNavigate?.(`/programs/content/${item.id}?sharedBoundTag=${encodeURIComponent(`program-content-${item.id}`)}`)}
                    className="py-2 items-center"
                  >
                    <Text className="text-xs font-outfit font-semibold" style={{ color: colors.accent }}>
                      Open full page
                    </Text>
                  </Transition.Pressable>
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
      const tierCard = PROGRAM_TIERS.find((t) => t.id === programId);
      const previewFeatures = (tierCard?.features ?? []).slice(0, 4);
      const title = isPendingApproval
        ? "Plan approval pending"
        : normalizedTier
          ? `${PROGRAM_TITLES[programId]} is locked`
          : "Complete onboarding to unlock programs";
      const body = isPendingApproval
        ? "Payment received — a coach will review and activate your plan shortly."
        : normalizedTier
          ? `Your current plan doesn't include everything in ${PROGRAM_TITLES[programId]}.`
          : "Finish setting up your athlete profile and choose a plan to unlock content.";
      return (
        <View
          className="rounded-[32px] bg-card px-6 py-8 gap-5 border"
          style={{ backgroundColor: colors.card, borderColor: borderSoft, ...(isDark ? Shadows.none : Shadows.md) }}
        >
          <View className="h-14 w-14 rounded-2xl items-center justify-center" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.15)" : "#F0FDF4" }}>
            <Feather name={isPendingApproval ? "clock" : "lock"} size={28} color={colors.accent} />
          </View>
          <View>
            <Text className="text-2xl font-clash text-app font-bold">{title}</Text>
            <Text className="text-sm font-outfit text-secondary mt-2 leading-relaxed">{body}</Text>
          </View>
          {previewFeatures.length ? (
            <View className="gap-3 pt-2">
              {previewFeatures.map((line) => (
                <View key={line} className="flex-row items-start gap-2">
                  <Feather name="check-circle" size={16} color={colors.accent} style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-sm font-outfit text-app leading-5">{line}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {onNavigate ? (
            <Pressable
              onPress={() => onNavigate("/(tabs)/programs")}
              className="mt-2 rounded-full bg-accent px-5 py-4 flex-row items-center justify-center gap-2"
            >
              <Text className="text-sm font-outfit text-white font-bold uppercase tracking-[1.2px]">
                View plans & pricing
              </Text>
            </Pressable>
          ) : null}
        </View>
      );
    }
    if (activeTab === "Program") {
      const flowSteps = pickTrainingFlowSteps(tabs);
      return (
        <View className="gap-5">
          {programId === "premium" ? (
            <PremiumPlanPanel
              token={token}
              accent={colors.accent}
              isDark={isDark}
              surfaceColor={colors.card}
              mutedSurface={mutedSurface}
              accentSurface={isDark ? "rgba(34,197,94,0.1)" : "#F0FDF4"}
              borderSoft={borderSoft}
              onNavigate={onNavigate}
              onMessageCoach={openCoachMessage}
              canMessageCoach={canMessageCoach}
            />
          ) : null}

          {flowSteps.length > 0 ? (
            <View
              className="rounded-[24px] px-5 py-4 gap-3 border"
              style={{
                backgroundColor: isDark ? "rgba(34,197,94,0.05)" : "#F0FDF4",
                borderColor: borderSoft,
              }}
            >
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px] text-secondary">
                Training Order
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {flowSteps.map((step, i) => (
                  <Pressable
                    key={step}
                    onPress={() => setActiveTab(step)}
                    className="rounded-full px-4 py-2 border"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: step === activeTab ? colors.accent : borderSoft,
                    }}
                  >
                    <Text
                      className="text-xs font-outfit font-semibold"
                      style={{ color: step === activeTab ? colors.accent : colors.text }}
                    >
                      {i + 1}. {step}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          {(() => {
            const structured = sessionsFromSectionContentForTab(sectionContent, activeTab);
            if (structured?.length) {
              return (
                <ProgramSessionPanel
                  programId={programId}
                  sessions={structured}
                  onNavigate={onNavigate}
                />
              );
            }
            return renderTrainingContent();
          })()}
        </View>
      );
    }

    if (TRAINING_TABS.has(activeTab)) {
      const structured = sessionsFromSectionContentForTab(sectionContent, activeTab);
      if (structured?.length) {
        return (
          <ProgramSessionPanel
            programId={programId}
            sessions={structured}
            onNavigate={onNavigate}
          />
        );
      }
      return renderTrainingContent();
    }

    if (activeTab === "Book In" || activeTab === "Bookings") {
      return <BookingsPanel onOpen={() => onNavigate?.("/(tabs)/schedule")} />;
    }

    if (activeTab === "Physio Referral" || activeTab === "Physio Referrals") {
      return <PhysioReferralPanel />;
    }

    if (activeTab === "Nutrition & Food Diaries" || activeTab === "Submit Diary") {
      return <FoodDiaryPanel />;
    }

    if (activeTab === "Video Upload") {
      return <VideoUploadPanel sectionContentId={null} />;
    }

    if (activeTab === "Education" || activeTab === "Parent Education") {
      return <ParentEducationPanel onOpen={() => onNavigate?.("/parent-platform")} />;
    }

      return (
      <View 
        className="py-10 items-center justify-center"
      >
        <Text className="text-sm font-outfit text-secondary text-center">Coming soon.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <View 
        style={{ 
          backgroundColor: colors.card,
          zIndex: 10,
          ...(isDark ? Shadows.none : Shadows.sm)
        }}
      >
        <View 
          className="px-4 py-3 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            {showBack && (
              <TouchableOpacity
                onPress={() => (onBack ? onBack() : undefined)}
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.03)" }}
              >
                <Feather name="chevron-left" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
            <View>
              <Text className="text-lg font-clash font-bold" style={{ color: colors.text }}>
                {PROGRAM_TITLES[programId]}
              </Text>
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1px]" style={{ color: colors.accent }}>
                {currentTierLabel}
              </Text>
            </View>
          </View>
          
          <View className="flex-row items-center gap-2">
            {trainingProgress && (
              <View className="rounded-full bg-accent/10 px-3 py-1.5">
                <Text className="text-[10px] font-outfit font-bold text-accent">
                  {trainingProgress.stats.sessionRuns} sessions
                </Text>
              </View>
            )}
          </View>
        </View>

        <ProgramTabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showSectionHeader={false}
        />
      </View>

      <ThemedScrollView
        onRefresh={handlePageRefresh}
        contentContainerStyle={{ paddingBottom: uploadEnabledContent.length ? 120 : 40, paddingTop: 20 }}
        nestedScrollEnabled
      >
        {trainingProgress && activeTab === "Program" ? (
          <View className="px-5 mb-6">
            <AchievementsStrip stats={trainingProgress.stats} achievements={trainingProgress.achievements} />
          </View>
        ) : null}

        <View className="px-5">{renderTab()}</View>
      </ThemedScrollView>

      {uploadEnabledContent.length > 0 ? (
        <TouchableOpacity
          onPress={openFloatingUpload}
          className="absolute bottom-6 right-5 h-16 w-16 items-center justify-center rounded-full"
          style={{
            backgroundColor: colors.accent,
            ...(isDark ? Shadows.none : Shadows.lg),
          }}
        >
          <Feather name="video" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}

      <Modal
        visible={Boolean(activeVideoUrl)}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveVideoUrl(null)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <View className="rounded-t-[32px] p-5 pb-8" style={{ backgroundColor: colors.card }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-clash text-app font-bold">Exercise Video</Text>
              <TouchableOpacity
                onPress={() => setActiveVideoUrl(null)}
                className="h-10 w-10 rounded-full items-center justify-center bg-secondary/10"
              >
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            {activeVideoUrl ? <VideoPlayer uri={activeVideoUrl} useVideoResolution /> : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={uploadPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setUploadPickerOpen(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View className="rounded-t-[32px] p-5 pb-8" style={{ backgroundColor: colors.card }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-clash text-app font-bold">Choose upload target</Text>
              <TouchableOpacity
                onPress={() => setUploadPickerOpen(false)}
                className="h-10 w-10 rounded-full items-center justify-center bg-secondary/10"
              >
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View className="mt-5 gap-3">
              {uploadEnabledContent.map((item) => (
                <TouchableOpacity
                  key={`upload-target-${item.id}`}
                  onPress={() => openUploadFlow(item)}
                  className="rounded-3xl border px-4 py-4"
                  style={{ borderColor: borderSoft, backgroundColor: colors.background }}
                >
                  <Text className="text-base font-clash text-app">{item.title}</Text>
                  <Text className="mt-1 text-xs font-outfit text-secondary">
                    Open video upload for this section item.
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const checkinModalStyles = StyleSheet.create({
  root: { flex: 1 },
});

function PremiumPlanPanel({
  token,
  accent,
  isDark,
  surfaceColor,
  mutedSurface,
  accentSurface,
  borderSoft,
  onNavigate,
  onMessageCoach,
  canMessageCoach,
}: {
  token: string | null;
  accent: string;
  isDark: boolean;
  surfaceColor: string;
  mutedSurface: string;
  accentSurface: string;
  borderSoft: string;
  onNavigate?: (path: string) => void;
  onMessageCoach?: (text: string) => void | Promise<void>;
  canMessageCoach?: boolean;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<PlanSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWeek, setActiveWeek] = useState<number | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinSession, setCheckinSession] = useState<PlanSession | null>(null);
  const [rpe, setRpe] = useState("");
  const [soreness, setSoreness] = useState("");
  const [fatigue, setFatigue] = useState("");
  const [notes, setNotes] = useState("");
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ items: PlanSession[] }>("/premium-plan", {
        token,
        forceRefresh: true,
        skipCache: true,
      });
      const list = (data.items ?? []).filter((s) => s && s.id);
      setItems(list);
      const weeks = Array.from(new Set(list.map((s) => Number(s.weekNumber)).filter((v) => Number.isFinite(v)))).sort(
        (a, b) => a - b,
      );
      if (weeks.length) {
        setActiveWeek((prev) => (prev != null && weeks.includes(prev) ? prev : weeks[0]));
      } else {
        setActiveWeek(null);
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to load plan.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const weeks = useMemo(() => {
    const values = Array.from(
      new Set(items.map((s) => Number(s.weekNumber)).filter((v) => Number.isFinite(v))),
    ).sort((a, b) => a - b);
    return values;
  }, [items]);

  const visibleSessions = useMemo(() => {
    if (activeWeek == null) return [];
    return items
      .filter((s) => Number(s.weekNumber) === Number(activeWeek))
      .slice()
      .sort((a, b) => Number(a.sessionNumber) - Number(b.sessionNumber));
  }, [activeWeek, items]);

  const weekStats = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const s of visibleSessions) {
      for (const ex of s.exercises ?? []) {
        total += 1;
        if (ex.completed) done += 1;
      }
    }
    return { total, done };
  }, [visibleSessions]);

  const nextSession = useMemo(() => {
    const incomplete = visibleSessions.find((s) => (s.exercises ?? []).some((e) => !e.completed));
    return incomplete ?? visibleSessions[0] ?? null;
  }, [visibleSessions]);

  const openSessionExercise = useCallback(
    (session: PlanSession, requestedIndex?: number) => {
      if (!onNavigate) return;
      const exercises = session.exercises ?? [];
      if (!exercises.length) return;
      const incompleteIndex = exercises.findIndex((exercise) => !exercise.completed);
      const targetIndex =
        requestedIndex != null && requestedIndex >= 0 && requestedIndex < exercises.length
          ? requestedIndex
          : incompleteIndex >= 0
            ? incompleteIndex
            : 0;
      const target = exercises[targetIndex];
      if (!target) return;
      const sessionIds = exercises.map((exercise) => String(exercise.id)).join(",");
      onNavigate(
        `/programs/exercise/${target.id}?sessionIds=${encodeURIComponent(sessionIds)}&index=${targetIndex}`,
      );
    },
    [onNavigate],
  );

  const openCheckin = (session: PlanSession) => {
    setCheckinSession(session);
    setRpe("");
    setSoreness("");
    setFatigue("");
    setNotes("");
    setCheckinError(null);
    setCheckinOpen(true);
  };

  const submitCheckin = useCallback(async () => {
    if (!token || !checkinSession) return;
    const parseBoundedInt = (value: string, min: number, max: number) => {
      if (!value.trim()) return null;
      const num = Math.round(Number(value));
      if (!Number.isFinite(num) || num < min || num > max) return "invalid";
      return num;
    };
    const parsedRpe = parseBoundedInt(rpe, 1, 10);
    const parsedSoreness = parseBoundedInt(soreness, 0, 10);
    const parsedFatigue = parseBoundedInt(fatigue, 0, 10);
    if (parsedRpe === "invalid" || parsedSoreness === "invalid" || parsedFatigue === "invalid") {
      setCheckinError("Enter valid numbers (RPE 1–10, soreness/fatigue 0–10).");
      return;
    }
    setIsSubmitting(true);
    setCheckinError(null);
    try {
      await apiRequest(`/premium-plan/sessions/${checkinSession.id}/complete`, {
        method: "POST",
        token,
        body: {
          rpe: parsedRpe,
          soreness: parsedSoreness,
          fatigue: parsedFatigue,
          notes: notes.trim() || null,
        },
      });
      setCheckinOpen(false);
    } catch (err: any) {
      setCheckinError(err?.message ?? "Failed to save check-in.");
    } finally {
      setIsSubmitting(false);
    }
  }, [checkinSession, fatigue, notes, rpe, soreness, token]);

  if (!token || (!isLoading && items.length === 0)) {
    return null;
  }

  return (
    <View className="gap-5">
      <View className="rounded-[24px] px-5 py-5 gap-3 border" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.08)" : "#ECFDF5", borderColor: isDark ? "rgba(34,197,94,0.2)" : "#A7F3D0", ...(isDark ? Shadows.none : Shadows.sm) }}>
        <View className="flex-row items-center gap-2">
          <Feather name="star" size={16} color={accent} />
          <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]" style={{ color: accent }}>
            Your Personalized Plan
          </Text>
        </View>
        <Text className="text-xl font-clash text-app font-bold">This week&apos;s plan</Text>
        {weekStats.total > 0 && activeWeek != null ? (
          <View className="mt-2 rounded-2xl px-4 py-3 border" style={{ borderColor: borderSoft, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#F8FAFC" }}>
            <Text className="text-sm font-outfit text-app font-semibold">
              Week {activeWeek}: {weekStats.done}/{weekStats.total} exercises done
            </Text>
            {nextSession ? (
              <Text className="text-xs font-outfit text-secondary mt-1">Up next: Session {nextSession.sessionNumber}</Text>
            ) : null}
          </View>
        ) : (
          <Text className="text-sm font-outfit text-secondary">
            Tap an exercise when you&apos;re done. Use Complete to log a session.
          </Text>
        )}
      </View>

      {weeks.length ? (
        <View className="flex-row flex-wrap gap-2">
          {weeks.map((week) => {
            const active = activeWeek === week;
            return (
              <Pressable
                key={week}
                onPress={() => setActiveWeek(week)}
                className="px-4 py-2 rounded-full border"
                style={{
                  backgroundColor: active ? colors.text : "transparent",
                  borderColor: active ? colors.text : borderSoft,
                }}
              >
                <Text className={`text-[11px] font-outfit font-bold uppercase tracking-[1.4px] ${active ? "text-app" : "text-secondary"}`} style={{ color: active ? colors.background : colors.textSecondary }}>
                  Week {week}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {isLoading ? (
        <View className="py-10 items-center justify-center">
          <ActivityIndicator color={accent} />
          <Text className="text-sm font-outfit text-secondary mt-3">Loading your plan…</Text>
        </View>
      ) : error ? (
        <View className="py-10 items-center justify-center">
          <Text className="text-sm font-outfit text-red-500 text-center">{error}</Text>
        </View>
      ) : visibleSessions.length === 0 ? null : (
        visibleSessions.map((session) => (
          <View key={session.id} className="rounded-[24px] px-5 py-5 gap-4 border" style={{ backgroundColor: colors.card, borderColor: borderSoft, ...(isDark ? Shadows.none : Shadows.sm) }}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-lg font-clash text-app font-bold">
                  Session {session.sessionNumber}
                  {session.title ? ` • ${session.title}` : ""}
                </Text>
                {session.notes ? (
                  <Text className="text-sm font-outfit text-secondary mt-1">{session.notes}</Text>
                ) : null}
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => openSessionExercise(session)}
                  className="px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: accent }}
                >
                  <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.5px] text-white">
                    Start Session
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => openCheckin(session)}
                  className="px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: isDark ? "rgba(34,197,94,0.1)" : "#F0FDF4" }}
                >
                  <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.5px]" style={{ color: accent }}>
                    Check-in
                  </Text>
                </Pressable>
              </View>
            </View>

            <View className="gap-2.5">
              {(session.exercises ?? []).map((ex) => {
                const base = ex.exercise ?? null;
                return (
                  <View
                    key={ex.id}
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: ex.completed ? (isDark ? "rgba(34,197,94,0.1)" : "#F0FDF4") : "transparent",
                      borderColor: ex.completed ? (isDark ? "rgba(34,197,94,0.3)" : "#86EFAC") : borderSoft,
                    }}
                  >
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1 gap-2">
                        <Text className="text-sm font-outfit text-app font-semibold">
                          {base?.name ?? "Exercise"}
                        </Text>
                        <View
                          className="self-start rounded-full px-3 py-1.5"
                          style={{
                            backgroundColor: ex.completed
                              ? (isDark ? "rgba(34,197,94,0.16)" : "#ECFDF5")
                              : mutedSurface,
                          }}
                        >
                          <Text
                            className="text-[10px] font-outfit font-semibold uppercase tracking-[1px]"
                            style={{ color: ex.completed ? accent : colors.textSecondary }}
                          >
                            {ex.completed ? "Completed" : "Not completed"}
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => {
                          const exerciseIndex = (session.exercises ?? []).findIndex((item) => item.id === ex.id);
                          openSessionExercise(session, exerciseIndex >= 0 ? exerciseIndex : 0);
                        }}
                        className="rounded-full px-4 py-2"
                        style={{ backgroundColor: accent }}
                      >
                        <Text className="text-[11px] font-outfit font-bold uppercase tracking-[1.1px] text-white">
                          View Detail
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))
      )}

      <Modal visible={checkinOpen} transparent animationType="slide" onRequestClose={() => (isSubmitting ? null : setCheckinOpen(false))}>
        <KeyboardAvoidingView
          style={checkinModalStyles.root}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View
            className="flex-1 justify-end"
            style={{ backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)" }}
          >
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => {
                if (isSubmitting) return;
                Keyboard.dismiss();
                setCheckinOpen(false);
              }}
              accessibilityLabel="Dismiss check-in"
            />
            <View
              className="rounded-t-[32px]"
              style={{
                backgroundColor: colors.card,
                maxHeight: "88%",
              }}
            >
              <KeyboardAwareScrollView
                enableOnAndroid
                extraHeight={Platform.OS === "ios" ? 120 : 160}
                extraScrollHeight={Platform.OS === "ios" ? 40 : 96}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                bounces={Platform.OS === "ios"}
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: Math.max(insets.bottom, 12) + 20,
                }}
              >
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-xl font-clash text-app font-bold">Session Check-in</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (isSubmitting) return;
                      Keyboard.dismiss();
                      setCheckinOpen(false);
                    }}
                    className="h-10 w-10 rounded-full items-center justify-center bg-secondary/10"
                  >
                    <Feather name="x" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View className="gap-4">
                  {[
                    { label: "RPE (1–10)", value: rpe, onChange: setRpe, placeholder: "How hard was it?" },
                    { label: "Soreness (0–10)", value: soreness, onChange: setSoreness, placeholder: "Muscle soreness?" },
                    { label: "Fatigue (0–10)", value: fatigue, onChange: setFatigue, placeholder: "Overall tiredness?" },
                  ].map((field) => (
                    <View
                      key={field.label}
                      className="rounded-2xl border px-4 py-2"
                      style={{
                        borderColor: borderSoft,
                        backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#F8FAFC",
                      }}
                    >
                      <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.5px] font-bold mt-1">
                        {field.label}
                      </Text>
                      <TextInput
                        value={field.value}
                        onChangeText={field.onChange}
                        placeholder={field.placeholder}
                        placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.3)"}
                        keyboardType="number-pad"
                        style={{
                          paddingVertical: 8,
                          color: colors.text,
                          fontSize: 16,
                          fontFamily: "Outfit_500Medium",
                        }}
                      />
                    </View>
                  ))}

                  <View
                    className="rounded-2xl border px-4 py-2"
                    style={{
                      borderColor: borderSoft,
                      backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#F8FAFC",
                    }}
                  >
                    <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.5px] font-bold mt-1">
                      Notes (optional)
                    </Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Anything your coach should know…"
                      placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.3)"}
                      multiline
                      textAlignVertical="top"
                      style={{
                        paddingVertical: 8,
                        color: colors.text,
                        fontSize: 16,
                        fontFamily: "Outfit_400Regular",
                        minHeight: 60,
                      }}
                    />
                  </View>

                  {checkinError ? (
                    <Text className="text-sm font-outfit text-center text-red-500 mt-2">{checkinError}</Text>
                  ) : null}

                  <Pressable
                    onPress={submitCheckin}
                    disabled={isSubmitting}
                    className="mt-4 rounded-full px-4 py-4 flex-row items-center justify-center gap-2"
                    style={{ backgroundColor: colors.accent, opacity: isSubmitting ? 0.7 : 1 }}
                  >
                    {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : null}
                    <Text className="font-outfit font-bold text-[15px]" style={{ color: "#FFFFFF" }}>
                      {isSubmitting ? "Saving Check-in…" : "Submit Check-in"}
                    </Text>
                  </Pressable>
                </View>
              </KeyboardAwareScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
