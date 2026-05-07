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
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}>
          <View
            style={{
              borderRadius: 30,
              borderWidth: 1,
              borderColor: p.divider,
              padding: 20,
              backgroundColor: p.cardWhite,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Outfit-Bold",
                color: p.accent,
                textTransform: "uppercase",
                letterSpacing: 1.2,
              }}
            >
              Team Program
            </Text>
            <Text
              style={{
                fontSize: 28,
                fontFamily: "Outfit-Bold",
                color: p.textPrimary,
                marginTop: 4,
                letterSpacing: -0.4,
              }}
            >
              Hi, {focusName}
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Outfit-Regular",
                color: p.textSecondary,
                marginTop: 4,
              }}
            >
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

      <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
        <AgeBasedTrainingPanel
          workspace={workspace}
          activeTab={activeTab}
          onOpenModule={onOpenModule}
        />
      </View>
    </ScrollView>
  );
}
