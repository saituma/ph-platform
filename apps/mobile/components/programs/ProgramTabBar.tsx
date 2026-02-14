import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export function ProgramTabBar({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  return (
    <View className="mb-6">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}>
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => onTabChange(tab)}
              className={`px-4 py-2 rounded-full border ${
                isActive ? "bg-accent border-accent" : "bg-input border-app"
              }`}
            >
              <Text className={`${isActive ? "text-white" : "text-app"} text-xs font-outfit uppercase`}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
