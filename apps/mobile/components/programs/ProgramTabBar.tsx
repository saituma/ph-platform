import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";

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
  const p = useAdminPastel();

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
                {
                  backgroundColor: isActive ? p.accent : p.accentSoft,
                  borderColor: isActive ? p.accent : p.divider,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? "#FFFFFF" : p.textSecondary },
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
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Outfit-ExtraBold",
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
