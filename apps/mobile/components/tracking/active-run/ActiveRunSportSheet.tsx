import React, { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";

// ─────────────────────────────────────────────
// Sports data
// ─────────────────────────────────────────────

export type SportId =
  | "run"
  | "trail_run"
  | "walk"
  | "hike"
  | "virtual_run"
  | "treadmill"
  | "ride"
  | "virtual_ride"
  | "e_bike"
  | "mountain_bike"
  | "swim"
  | "open_water_swim";

type Sport = { id: SportId; label: string; icon: string };

const TOP_SPORTS: Sport[] = [
  { id: "run", label: "Run", icon: "shoe-sneaker" },
  { id: "walk", label: "Walk", icon: "shoe-sneaker" },
  { id: "hike", label: "Hike", icon: "hiking" },
];

const SPORT_CATEGORIES: { category: string; sports: Sport[] }[] = [
  {
    category: "Foot Sports",
    sports: [
      { id: "run", label: "Run", icon: "shoe-sneaker" },
      { id: "trail_run", label: "Trail Run", icon: "pine-tree" },
      { id: "walk", label: "Walk", icon: "walk" },
      { id: "hike", label: "Hike", icon: "hiking" },
      { id: "virtual_run", label: "Virtual Run", icon: "run" },
      { id: "treadmill", label: "Treadmill", icon: "run-fast" },
    ],
  },
  {
    category: "Cycle Sports",
    sports: [
      { id: "ride", label: "Ride", icon: "bike" },
      { id: "virtual_ride", label: "Virtual Ride", icon: "bike-fast" },
      { id: "e_bike", label: "E-Bike Ride", icon: "bicycle-electric" },
      { id: "mountain_bike", label: "Mountain Bike Ride", icon: "bike" },
    ],
  },
  {
    category: "Water Sports",
    sports: [
      { id: "swim", label: "Swim", icon: "swim" },
      { id: "open_water_swim", label: "Open Water Swim", icon: "swim" },
    ],
  },
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

const SHEET_BG = "hsl(0, 0%, 11%)";
const DIVIDER = "rgba(255,255,255,0.10)";
const ACCENT = "#FF6600"; // replaced at runtime with colors.accent

export function ActiveRunSportSheet({
  open,
  selectedSport,
  onSelect,
  onClose,
  colors,
}: {
  open: boolean;
  selectedSport: SportId;
  onSelect: (sport: SportId) => void;
  onClose: () => void;
  colors: Record<string, string>;
}) {
  const snapPoints = useMemo(() => ["85%"] as const, []);
  const [query, setQuery] = useState("");

  const accent = colors.accent ?? ACCENT;

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return SPORT_CATEGORIES;
    const q = query.toLowerCase();
    return SPORT_CATEGORIES.map((c) => ({
      ...c,
      sports: c.sports.filter((s) => s.label.toLowerCase().includes(q)),
    })).filter((c) => c.sports.length > 0);
  }, [query]);

  return (
    <BottomSheet
      index={open ? 0 : -1}
      snapPoints={snapPoints as any}
      onChange={(i) => { if (i === -1) onClose(); }}
      enablePanDownToClose
      enableOverDrag={false}
      enableDynamicSizing={false}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.55}
          pressBehavior="close"
        />
      )}
      backgroundStyle={{
        backgroundColor: SHEET_BG,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
      }}
      handleIndicatorStyle={{
        backgroundColor: "rgba(255,255,255,0.22)",
        width: 36,
        height: 4,
        borderRadius: 2,
      }}
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.accentBold,
              fontSize: 20,
              color: "#FFF",
              flex: 1,
            }}
          >
            Filter by Sport
          </Text>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>

        <View style={{ height: 1, backgroundColor: DIVIDER, marginHorizontal: 0 }} />

        {/* ── Search ── */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.09)",
              borderRadius: 28,
              paddingHorizontal: 16,
              paddingVertical: 12,
              gap: 10,
            }}
          >
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={{
                flex: 1,
                fontFamily: fonts.bodyMedium,
                fontSize: 16,
                color: "#FFF",
                padding: 0,
              }}
            />
          </View>
        </View>

        {/* ── Your Top Sports ── */}
        {!query.trim() && (
          <>
            <Text
              style={{
                fontFamily: fonts.accentBold,
                fontSize: 18,
                color: "#FFF",
                paddingHorizontal: 20,
                marginBottom: 20,
              }}
            >
              Your Top Sports
            </Text>

            <View
              style={{
                flexDirection: "row",
                paddingHorizontal: 20,
                gap: 24,
                marginBottom: 24,
              }}
            >
              {TOP_SPORTS.map((sport) => {
                const selected = selectedSport === sport.id;
                return (
                  <Pressable
                    key={sport.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onSelect(sport.id);
                    }}
                    style={{ alignItems: "center", gap: 10 }}
                  >
                    {/* Circle */}
                    <View style={{ position: "relative" }}>
                      <View
                        style={{
                          width: 86,
                          height: 86,
                          borderRadius: 43,
                          backgroundColor: selected
                            ? "rgba(180,60,0,0.55)"
                            : "rgba(255,255,255,0.10)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MaterialCommunityIcons
                          name={sport.icon as any}
                          size={38}
                          color={selected ? accent : "#FFF"}
                        />
                      </View>
                      {/* Badge */}
                      {selected && (
                        <View
                          style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            backgroundColor: accent,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 2,
                            borderColor: SHEET_BG,
                          }}
                        >
                          <Ionicons name="checkmark" size={14} color="#FFF" />
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        fontFamily: fonts.bodyMedium,
                        fontSize: 14,
                        color: selected ? accent : "#FFF",
                      }}
                    >
                      {sport.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: 1, backgroundColor: DIVIDER }} />
          </>
        )}

        {/* ── Categorized list ── */}
        {filteredCategories.map((cat) => (
          <View key={cat.category}>
            <Text
              style={{
                fontFamily: fonts.accentBold,
                fontSize: 18,
                color: "#FFF",
                paddingHorizontal: 20,
                paddingTop: 24,
                paddingBottom: 8,
              }}
            >
              {cat.category}
            </Text>

            {cat.sports.map((sport) => {
              const selected = selectedSport === sport.id;
              return (
                <Pressable
                  key={sport.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelect(sport.id);
                  }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 20,
                      paddingVertical: 16,
                    }}
                  >
                    <View style={{ width: 36, alignItems: "center" }}>
                      <MaterialCommunityIcons
                        name={sport.icon as any}
                        size={26}
                        color={selected ? accent : "rgba(255,255,255,0.85)"}
                      />
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: fonts.bodyMedium,
                        fontSize: 17,
                        color: selected ? accent : "#FFF",
                        marginLeft: 14,
                      }}
                    >
                      {sport.label}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark" size={22} color={accent} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
