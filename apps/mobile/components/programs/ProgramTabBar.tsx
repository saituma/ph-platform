import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "@/components/ScaledText";

export function ProgramTabBar({
  tabs,
  activeTab,
  onTabChange,
  searchValue,
  onSearchChange,
}: {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Program Sections</Text>
      </View>
      {onSearchChange ? (
        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <TextInput
              value={searchValue}
              onChangeText={onSearchChange}
              placeholder="Search exercises or sessions"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
          </View>
          {searchValue?.length ? (
            <TouchableOpacity
              onPress={() => onSearchChange("")}
              style={styles.clearButton}
              activeOpacity={0.85}
            >
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      <View style={styles.card}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled
          bounces
          alwaysBounceHorizontal
        >
          {tabs.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => onTabChange(tab)}
                style={[styles.tab, isActive ? styles.tabActive : styles.tabIdle]}
                activeOpacity={0.85}
              >
                <View style={styles.tabInner}>
                  <Text
                    style={[
                      styles.tabText,
                      isActive ? styles.tabTextActive : styles.tabTextIdle,
                    ]}
                  >
                    {tab}
                  </Text>
                  <View
                    style={[
                      styles.activeDot,
                      isActive ? styles.activeDotOn : styles.activeDotOff,
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
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    backgroundColor: "rgba(16, 24, 16, 0.04)",
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#94A3B8",
  },
  hint: {
    fontSize: 11,
    letterSpacing: 0.2,
    color: "#94A3B8",
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
  searchInput: {
    fontSize: 14,
    color: "#1D2A22",
  },
  clearButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    backgroundColor: "rgba(148, 163, 184, 0.08)",
  },
  clearText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  scrollContent: {
    gap: 12,
    paddingHorizontal: 6,
  },
  tab: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#2F8F57",
    borderColor: "#2F8F57",
  },
  tabIdle: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(148, 163, 184, 0.16)",
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
  tabTextIdle: {
    color: "#1D2A22",
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDotOn: {
    backgroundColor: "#F7FBF7",
  },
  activeDotOff: {
    backgroundColor: "rgba(47, 143, 87, 0.2)",
  },
});
