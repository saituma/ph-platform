import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useColorScheme } from "nativewind";
import { Text, TextInput } from "@/components/ScaledText";

export function ProgramTabBar({
  tabs,
  activeTab,
  onTabChange,
  searchValue,
  onSearchChange,
  onTabPress,
  hint,
  showSectionHeader = true,
}: {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onTabPress?: (tab: string) => void;
  hint?: string;
  /** When false, hides the “Sections” label row for a cleaner layout. */
  showSectionHeader?: boolean;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View style={styles.container}>
      {showSectionHeader ? (
        <View style={styles.headerRow}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Plan</Text>
        </View>
      ) : null}
      {hint ? (
        <Text
          style={[styles.hint, isDark && styles.hintDark]}
          numberOfLines={3}
        >
          {hint}
        </Text>
      ) : null}
      {onSearchChange ? (
        <View style={styles.searchRow}>
          <View style={[styles.searchField, isDark && styles.searchFieldDark]}>
            <TextInput
              value={searchValue}
              onChangeText={onSearchChange}
              placeholder="Search…"
              placeholderTextColor={isDark ? "#E2E8F0" : "#94A3B8"}
              style={[styles.searchInput, isDark && styles.searchInputDark]}
            />
          </View>
          {searchValue?.length ? (
            <TouchableOpacity
              onPress={() => onSearchChange("")}
              style={[styles.clearButton, isDark && styles.clearButtonDark]}
              activeOpacity={0.85}
            >
              <Text style={[styles.clearText, isDark && styles.clearTextDark]}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled
          bounces
          alwaysBounceHorizontal
          nestedScrollEnabled
          directionalLockEnabled
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
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                activeOpacity={0.85}
              >
                <View style={styles.tabInner}>
                  <Text
                    style={[
                      styles.tabText,
                      isActive ? styles.tabTextActive : styles.tabTextIdle,
                      isDark && (isActive ? styles.tabTextActiveDark : styles.tabTextIdleDark),
                    ]}
                  >
                    {tab}
                  </Text>
                  <View
                    style={[
                      styles.activeDot,
                      isActive ? styles.activeDotOn : styles.activeDotOff,
                      isDark && (isActive ? styles.activeDotOnDark : styles.activeDotOffDark),
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  card: {
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    backgroundColor: "rgba(16, 24, 16, 0.04)",
  },
  cardDark: {
    borderColor: "rgba(226, 232, 240, 0.12)",
    backgroundColor: "#162018",
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#94A3B8",
  },
  labelDark: {
    color: "#A8B8A8",
  },
  hint: {
    fontSize: 11,
    letterSpacing: 0.2,
    color: "#94A3B8",
    marginBottom: 10,
    lineHeight: 16,
  },
  hintDark: {
    color: "#A8B8A8",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  searchField: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchFieldDark: {
    borderColor: "rgba(226, 232, 240, 0.16)",
    backgroundColor: "#1B261D",
  },
  searchInput: {
    fontSize: 14,
    color: "#1D2A22",
  },
  searchInputDark: {
    color: "#F8FAFC",
  },
  clearButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    backgroundColor: "rgba(148, 163, 184, 0.08)",
  },
  clearButtonDark: {
    borderColor: "rgba(226, 232, 240, 0.16)",
    backgroundColor: "rgba(34, 197, 94, 0.14)",
  },
  clearText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  clearTextDark: {
    color: "#CBD5E1",
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexGrow: 0,
  },
  tab: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    flexShrink: 0,
  },
  tabActive: {
    backgroundColor: "#2F8F57",
    borderColor: "#2F8F57",
  },
  tabActiveDark: {
    backgroundColor: "#3AA56B",
    borderColor: "#3AA56B",
  },
  tabIdle: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(148, 163, 184, 0.16)",
  },
  tabIdleDark: {
    backgroundColor: "#1B261D",
    borderColor: "rgba(226, 232, 240, 0.12)",
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#F7FBF7",
  },
  tabTextActiveDark: {
    color: "#F4FBF6",
  },
  tabTextIdle: {
    color: "#1D2A22",
  },
  tabTextIdleDark: {
    color: "#E2EFE2",
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDotOn: {
    backgroundColor: "#F7FBF7",
  },
  activeDotOnDark: {
    backgroundColor: "#F4FBF6",
  },
  activeDotOff: {
    backgroundColor: "rgba(47, 143, 87, 0.2)",
  },
  activeDotOffDark: {
    backgroundColor: "rgba(58, 165, 107, 0.35)",
  },
});
