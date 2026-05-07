import React from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { ProgramTabBar } from "@/components/programs/ProgramTabBar";
import { AgeBasedTrainingPanel } from "@/components/programs/AgeBasedTrainingPanel";
import { TrainingContentV2Workspace } from "@/types/programs";
import { useAdminPastel } from "@/components/admin/AdminUI";

interface Props {
  workspace: TrainingContentV2Workspace | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenModule: (id: number) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  focusName: string;
  focusInfo: string[];
}

export function TeamProgramView({
  workspace,
  activeTab,
  onTabChange,
  onOpenModule,
  isRefreshing,
  onRefresh,
  focusName,
  focusInfo,
}: Props) {
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: p.pageBg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <View style={{ backgroundColor: p.cardWhite, paddingTop: insets.top }}>
        <View className="px-6 pt-4 pb-4">
          <View
            className="rounded-[30px] border p-5"
            style={{
              backgroundColor: p.cardWhite,
              borderColor: p.divider,
            }}
          >
            <Text className="text-sm font-outfit text-accent font-bold uppercase tracking-widest">
              Team Program
            </Text>
            <Text className="text-3xl font-clash font-bold text-app mt-1">
              Hi, {focusName}
            </Text>
            <Text className="text-sm font-outfit text-secondary mt-1">
              {focusInfo.join(" • ")}
            </Text>
          </View>
        </View>
      </View>

      <ProgramTabBar
        tabs={workspace?.tabs ?? ["Modules"]}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      <View className="px-6 mt-4">
        <AgeBasedTrainingPanel
          workspace={workspace}
          activeTab={activeTab}
          onOpenModule={onOpenModule}
        />
      </View>
    </ScrollView>
  );
}
