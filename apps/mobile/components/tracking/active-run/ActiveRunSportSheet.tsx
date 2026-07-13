import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
// Raw @gorhom/bottom-sheet, NOT the heroui BottomSheet wrapper.
//
// heroui's wrapper renders children inside a gorhom BottomSheetView (content-sized), which makes
// the sheet pan as a whole instead of scrolling its contents — no prop combination made the inner
// list scroll on device. BottomSheetModal + BottomSheetScrollView is the pattern that already
// scrolls elsewhere in this app (tracking/summary.tsx, AdminDmSection). The BottomSheetModalProvider
// it needs is mounted at the app root (app/_layout.tsx).
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";

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

const SHEET_BG = "hsl(0, 0%, 11%)";
const DIVIDER = "rgba(255,255,255,0.10)";
const ACCENT = "#FF6600";

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
  const [query, setQuery] = useState("");
  const accent = colors.accent ?? ACCENT;
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["85%"], []);

  // Drive the modal from the `open` prop the caller already passes.
  useEffect(() => {
    if (open) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [open]);

  const renderBackdrop = useMemo(
    () =>
      function Backdrop(props: BottomSheetBackdropProps) {
        return (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={0.55}
            pressBehavior="close"
          />
        );
      },
    [],
  );

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return SPORT_CATEGORIES;
    const q = query.toLowerCase();
    return SPORT_CATEGORIES.map((c) => ({
      ...c,
      sports: c.sports.filter((s) => s.label.toLowerCase().includes(q)),
    })).filter((c) => c.sports.length > 0);
  }, [query]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      // Fixed height (not content-sized), so BottomSheetScrollView bounds to the sheet and its
      // content scrolls INSIDE it instead of the whole sheet panning.
      enableDynamicSizing={false}
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
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
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 56 }}
          >
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
    </BottomSheetModal>
  );
}
