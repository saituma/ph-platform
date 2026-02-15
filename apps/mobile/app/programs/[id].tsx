import React, { useMemo, useState } from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { ProgramTabBar } from "@/components/programs/ProgramTabBar";
import { ProgramSessionPanel } from "@/components/programs/ProgramSessionPanel";
import {
  BookingsPanel,
  FoodDiaryPanel,
  ParentEducationPanel,
  PhysioReferralPanel,
  VideoUploadPanel,
} from "@/components/programs/ProgramPanels";
import { PROGRAM_TABS, TRAINING_TABS, getSessionsForTab, ProgramId } from "@/constants/program-details";
import { PROGRAM_TIERS } from "@/constants/Programs";

const PROGRAM_TITLES: Record<ProgramId, string> = {
  php: "PHP Program",
  plus: "PHP Plus",
  premium: "PHP Premium",
};

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: ProgramId }>();
  const programId = id && ["php", "plus", "premium"].includes(id) ? (id as ProgramId) : "php";
  const router = useRouter();
  const tabs = PROGRAM_TABS[programId];
  const [activeTab, setActiveTab] = useState(tabs[0]);

  const sessions = useMemo(() => getSessionsForTab(programId, activeTab), [programId, activeTab]);

  const handleVideoPress = (url: string) => {
    Linking.openURL(url).catch(() => undefined);
  };

  const renderTab = () => {
    if (activeTab === "Program") {
      const tier = PROGRAM_TIERS.find((item) => item.id === programId);
      return (
        <View className="rounded-3xl border border-app/10 bg-input px-6 py-5 gap-3">
          <Text className="text-lg font-clash text-app">Program Features</Text>
          {tier?.features?.map((feature, index) => (
            <View key={`${tier.id}-feature-${index}`} className="flex-row items-center gap-3">
              <View className="h-6 w-6 rounded-full bg-success-soft items-center justify-center">
                <Feather name="check" size={12} color="#16A34A" />
              </View>
              <Text className="text-sm font-outfit text-app flex-1">{feature}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (TRAINING_TABS.has(activeTab)) {
      return <ProgramSessionPanel sessions={sessions} onVideoPress={handleVideoPress} />;
    }

    if (activeTab === "Book In" || activeTab === "Bookings") {
      return <BookingsPanel onOpen={() => router.push("/(tabs)/schedule")} />;
    }

    if (activeTab === "Physio Referral" || activeTab === "Physio Referrals") {
      return <PhysioReferralPanel discount={programId === "plus" ? "10%" : undefined} />;
    }

    if (activeTab === "Parent Education" || activeTab === "Education") {
      return <ParentEducationPanel onOpen={() => router.push("/(tabs)/parent-platform")} />;
    }

    if (activeTab === "Nutrition & Food Diaries") {
      return <FoodDiaryPanel />;
    }

    if (activeTab === "Video Upload") {
      return <VideoUploadPanel />;
    }

    return (
      <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
        <Text className="text-sm font-outfit text-secondary">Content coming soon.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center bg-secondary rounded-full"
            >
              <Feather name="arrow-left" size={20} color="#94A3B8" />
            </TouchableOpacity>
            <Text className="text-xl font-clash text-app font-bold">{PROGRAM_TITLES[programId]}</Text>
            <View className="w-10" />
          </View>

          <Text className="text-sm font-outfit text-secondary mb-4">
            Select a tab to view your program sessions and resources.
          </Text>
        </View>

        <ProgramTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <View className="px-6">
          {renderTab()}
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}
