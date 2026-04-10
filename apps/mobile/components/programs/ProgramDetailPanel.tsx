import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, SafeAreaView, Pressable, Modal, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { ProgramTabBar } from "@/components/programs/ProgramTabBar";
import { Text } from "@/components/ScaledText";
import { AchievementsStrip } from "@/components/programs/AchievementsStrip";
import { Shadows } from "@/constants/theme";
import { 
  PROGRAM_TABS, 
  pickTrainingFlowSteps, 
  ProgramId, 
  normalizeProgramTabLabel 
} from "@/constants/program-details";
import { PROGRAM_TIERS } from "@/constants/Programs";
import { useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { Image as ExpoImage } from "expo-image";

import { ProgramDetailPanelProps, ProgramSectionContent } from "@/types/programs";
import { useProgramAccess } from "@/hooks/programs/useProgramAccess";
import { useProgramContent } from "@/hooks/programs/useProgramContent";
import { useProgramStats } from "@/hooks/programs/useProgramStats";
import { AdminProgramTabs } from "./AdminProgramTabs";
import { PremiumPlanPanel } from "./PremiumPlanPanel";

const PROGRAM_TITLES: Record<ProgramId, string> = {
  php: "PHP Program",
  plus: "PHP Premium Plus",
  premium: "PHP Premium",
};

export function ProgramDetailPanel({
  programId,
  showBack = false,
  onBack,
  onNavigate,
}: ProgramDetailPanelProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { token, athleteUserId, managedAthletes, appRole } = useAppSelector((state) => state.user);
  const { isSectionHidden } = useAgeExperience();

  const isYouthAthleteRole = ["youth_athlete_guardian_only", "youth_athlete_team_guardian"].includes(appRole ?? "");

  const activeAthleteAge = useMemo(() => {
    if (!managedAthletes.length) return null;
    const selected = managedAthletes.find(a => a.id === athleteUserId || a.userId === athleteUserId) ?? managedAthletes[0];
    return selected?.age ?? null;
  }, [managedAthletes, athleteUserId]);

  const { hasAccess, isPendingApproval, programTier, canMessageCoach, refreshBillingStatus } = useProgramAccess(token, programId);
  const { progress, loadProgress } = useProgramStats(token);
  const { sectionContent, isLoading, error, trainingContentV2, phpPlusTabs, loadPhpPlusTabs, loadSectionContent, setTrainingContentV2 } = useProgramContent(token, programId, activeAthleteAge, hasAccess);

  const [activeTab, setActiveTab] = useState<string>("Program");
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<Set<number>>(new Set());
  const [uploadPickerOpen, setUploadPickerOpen] = useState(false);

  const tabs = useMemo(() => {
    if (trainingContentV2?.tabs?.length) return trainingContentV2.tabs;
    if (programId === "plus") return phpPlusTabs ?? PROGRAM_TABS.plus;
    
    let base = [...PROGRAM_TABS[programId]];
    if (isSectionHidden("videoFeedback")) base = base.filter(t => t !== "Video Upload");
    if (isSectionHidden("foodDiary")) base = base.filter(t => !["Nutrition & Food Diaries", "Submit Diary"].includes(t));
    if (isSectionHidden("physioReferrals")) base = base.filter(t => !["Physio Referral", "Physio Referrals", "Referrals"].includes(t));
    return base;
  }, [programId, isSectionHidden, phpPlusTabs, trainingContentV2]);

  useEffect(() => {
    if (isFocused) {
      loadPhpPlusTabs();
      loadProgress();
      refreshBillingStatus();
    }
  }, [isFocused]);

  useEffect(() => {
    loadSectionContent(activeTab);
  }, [activeTab, loadSectionContent]);

  const toggleContent = (id: number) => {
    setExpandedContent(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRefresh = async () => {
    await Promise.all([
      loadSectionContent(activeTab, true),
      loadPhpPlusTabs(),
      loadProgress(),
      refreshBillingStatus(),
    ]);
  };

  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  const renderLockedPlan = () => {
    const tierCard = PROGRAM_TIERS.find((t) => t.id === programId);
    return (
      <View className="rounded-[32px] bg-card px-6 py-8 gap-5 border" style={{ backgroundColor: colors.card, borderColor: borderSoft, ...(isDark ? Shadows.none : Shadows.md) }}>
        <View className="h-14 w-14 rounded-2xl items-center justify-center" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.15)" : "#F0FDF4" }}>
          <Feather name={isPendingApproval ? "clock" : "lock"} size={28} color={colors.accent} />
        </View>
        <Text className="text-2xl font-clash font-bold text-app">{isPendingApproval ? "Approval Pending" : "Plan Locked"}</Text>
        <Text className="text-sm font-outfit text-secondary leading-relaxed">
          {isPendingApproval ? "Coach will review your plan shortly." : `Your current plan doesn't include ${PROGRAM_TITLES[programId]}.`}
        </Text>
        {onNavigate && (
          <Pressable onPress={() => onNavigate("/(tabs)/programs")} className="mt-2 rounded-full bg-accent py-4 items-center">
            <Text className="text-sm font-outfit text-white font-bold uppercase">View Plans</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const uploadEnabledContent = sectionContent.filter(item => !!item.allowVideoUpload);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.card, zIndex: 10, ...(isDark ? Shadows.none : Shadows.sm) }}>
        <View className="px-4 py-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            {showBack && (
              <TouchableOpacity onPress={onBack} className="h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                <Feather name="chevron-left" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
            <View>
              <Text className="text-lg font-clash font-bold text-app">{PROGRAM_TITLES[programId]}</Text>
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1px]" style={{ color: colors.accent }}>{programTier ?? "Starter"}</Text>
            </View>
          </View>
          {progress && (
            <View className="rounded-full bg-accent/10 px-3 py-1.5">
              <Text className="text-[10px] font-outfit font-bold text-accent">{progress.stats.sessionRuns} sessions</Text>
            </View>
          )}
        </View>
        <ProgramTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} showSectionHeader={false} />
      </View>

      <ThemedScrollView onRefresh={handleRefresh} contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}>
        {!hasAccess ? (
          <View className="px-5">{renderLockedPlan()}</View>
        ) : (
          <View className="px-5 gap-5">
            {activeTab === "Program" && programId === "premium" && (
              <PremiumPlanPanel token={token} onNavigate={onNavigate} canMessageCoach={canMessageCoach} />
            )}
            
            {activeTab === "Program" && progress && (
              <AchievementsStrip stats={progress.stats} achievements={progress.achievements} />
            )}

            <AdminProgramTabs
              activeTab={activeTab}
              programId={programId}
              programTitle={PROGRAM_TITLES[programId]}
              sectionContent={sectionContent}
              isLoading={isLoading}
              error={error}
              expandedIds={expandedContent}
              onToggle={toggleContent}
              onVideoPress={setActiveVideoUrl}
              onMessageCoach={(draft) => onNavigate?.(`/messages?draft=${encodeURIComponent(draft)}`)}
              onUploadPress={(item) => onNavigate?.(`/video-upload?sectionContentId=${item.id}`)}
              onNavigate={onNavigate}
              trainingContentV2={trainingContentV2}
              isTeamPlanBoundaryReached={false}
              renderTeamPlanLockedCard={() => null}
            />
          </View>
        )}
      </ThemedScrollView>

      <Modal visible={!!activeVideoUrl} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card rounded-t-[32px] p-5 pb-8" style={{ backgroundColor: colors.card }}>
            <View className="flex-row justify-between mb-4">
              <Text className="text-xl font-clash font-bold text-app">Exercise Video</Text>
              <TouchableOpacity onPress={() => setActiveVideoUrl(null)}><Feather name="x" size={24} color={colors.text} /></TouchableOpacity>
            </View>
            {activeVideoUrl && <VideoPlayer uri={activeVideoUrl} useVideoResolution />}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
