import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useColorScheme } from "nativewind";
import { Text } from "@/components/ScaledText";

export function ProgramTabBar({
  tabs,
  activeTab,
  onTabChange,
  onTabPress,
  showSectionHeader = true,
}: {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onTabPress?: (tab: string) => void;
  showSectionHeader?: boolean;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                onTabChange(tab);
                onTabPress?.(tab);
              }}
              style={[
                styles.tab,
                isActive ? styles.tabActive : styles.tabIdle,
                isDark && (isActive ? styles.tabActiveDark : styles.tabIdleDark),
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive ? styles.tabTextActive : styles.tabTextIdle,
                  isDark && (isActive ? styles.tabTextActiveDark : styles.tabTextIdleDark),
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
  },
  tabActive: {
    backgroundColor: "#22C55E",
  },
  tabActiveDark: {
    backgroundColor: "#22C55E",
  },
  tabIdle: {
    backgroundColor: "transparent",
  },
  tabIdleDark: {
    backgroundColor: "transparent",
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabTextActiveDark: {
    color: "#FFFFFF",
  },
  tabTextIdle: {
    color: "#64748B",
  },
  tabTextIdleDark: {
    color: "#94A3B8",
  },
});
