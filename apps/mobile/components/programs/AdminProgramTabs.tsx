import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ScaledText";
import { ProgramId, TRAINING_TABS } from "@/constants/program-details";
import { ProgramSectionContent, TrainingContentV2Workspace } from "@/types/programs";
import { AdminProgramContentList } from "./AdminProgramContentList";
import { AgeBasedTrainingPanel } from "@/components/programs/AgeBasedTrainingPanel";
import { ProgramSessionPanel } from "@/components/programs/ProgramSessionPanel";
import { sessionsFromSectionContentForTab } from "@/lib/sessionsFromSectionContent";
import { 
  BookingsPanel, 
  FoodDiaryPanel, 
  PhysioReferralPanel, 
  ParentEducationPanel, 
  VideoUploadPanel 
} from "@/components/programs/ProgramPanels";

interface Props {
  activeTab: string;
  programId: ProgramId;
  programTitle: string;
  sectionContent: ProgramSectionContent[];
  isLoading: boolean;
  error: string | null;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onVideoPress: (url: string) => void;
  onMessageCoach: (draft: string) => void;
  onUploadPress: (item: ProgramSectionContent) => void;
  onNavigate?: (path: string) => void;
  trainingContentV2: TrainingContentV2Workspace | null;
  isTeamPlanBoundaryReached: boolean;
  renderTeamPlanLockedCard: () => React.ReactNode;
}

export function AdminProgramTabs({
  activeTab,
  programId,
  programTitle,
  sectionContent,
  isLoading,
  error,
  expandedIds,
  onToggle,
  onVideoPress,
  onMessageCoach,
  onUploadPress,
  onNavigate,
  trainingContentV2,
  isTeamPlanBoundaryReached,
  renderTeamPlanLockedCard,
}: Props) {
  
  if (trainingContentV2?.tabs?.includes(activeTab)) {
    if (activeTab !== "Modules" && isTeamPlanBoundaryReached) {
      return <>{renderTeamPlanLockedCard()}</>;
    }
    return (
      <AgeBasedTrainingPanel
        workspace={trainingContentV2}
        activeTab={activeTab}
        onOpenModule={(moduleId) => {
          onNavigate?.(`/programs/module/${encodeURIComponent(String(moduleId))}?programId=${encodeURIComponent(programId)}`);
        }}
      />
    );
  }

  if (activeTab === "Program" || TRAINING_TABS.has(activeTab)) {
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
    return (
      <AdminProgramContentList
        content={sectionContent}
        isLoading={isLoading}
        error={error}
        expandedIds={expandedIds}
        onToggle={onToggle}
        onVideoPress={onVideoPress}
        onMessageCoach={onMessageCoach}
        onUploadPress={onUploadPress}
        onNavigate={onNavigate}
        activeTab={activeTab}
        programTitle={programTitle}
      />
    );
  }

  if (activeTab === "Book In" || activeTab === "Bookings") {
    return <BookingsPanel onOpen={() => onNavigate?.("/(tabs)/schedule")} />;
  }

  if (["Physio Referral", "Physio Referrals", "Referrals"].includes(activeTab)) {
    return <PhysioReferralPanel />;
  }

  if (["Nutrition & Food Diaries", "Submit Diary"].includes(activeTab)) {
    return <FoodDiaryPanel />;
  }

  if (activeTab === "Video Upload") {
    return <VideoUploadPanel sectionContentId={null} />;
  }

  if (["Education", "Parent Education"].includes(activeTab)) {
    return <ParentEducationPanel onOpen={() => onNavigate?.("/parent-platform")} />;
  }

  return (
    <View className="py-10 items-center justify-center">
      <Text className="text-sm font-outfit text-secondary text-center">Coming soon.</Text>
    </View>
  );
}
