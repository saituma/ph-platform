import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";
import type { SportId } from "./ActiveRunSportSheet";

// ─────────────────────────────────────────────
// Sports shown in the start picker
// ─────────────────────────────────────────────

type Sport = { id: SportId; label: string; icon: string };

const SPORTS: Sport[] = [
  { id: "run",           label: "Run",            icon: "shoe-sneaker"         },
  { id: "trail_run",     label: "Trail Run",       icon: "pine-tree"            },
  { id: "walk",          label: "Walk",            icon: "walk"                 },
  { id: "hike",          label: "Hike",            icon: "hiking"               },
  { id: "virtual_run",   label: "Virtual Run",     icon: "run"                  },
  { id: "treadmill",     label: "Treadmill",       icon: "run-fast"             },
  { id: "ride",          label: "Ride",            icon: "bike"                 },
  { id: "swim",          label: "Swim",            icon: "swim"                 },
];

const SHEET_BG = "hsl(0, 0%, 11%)";
const DIVIDER  = "rgba(255,255,255,0.10)";

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function ActiveRunStartSheet({
  open,
  onSelect,
  onClose,
  colors,
}: {
  open: boolean;
  onSelect: (sport: SportId) => void;
  onClose: () => void;
  colors: Record<string, string>;
}) {
  const snapPoints = useMemo(() => ["60%"] as const, []);
  const accent = colors.accent;

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
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
          <Text style={{ fontFamily: fonts.accentBold, fontSize: 22, color: "#FFF" }}>
            Select Activity
          </Text>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
            Choose what you're doing today
          </Text>
        </View>

        <View style={{ height: 1, backgroundColor: DIVIDER }} />

        {/* Sport grid — 2 columns */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            paddingHorizontal: 16,
            paddingTop: 20,
            gap: 12,
          }}
        >
          {SPORTS.map((sport) => (
            <Pressable
              key={sport.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSelect(sport.id);
              }}
              style={({ pressed }) => ({
                width: "47%",
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                backgroundColor: pressed
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.07)",
                borderRadius: 18,
                paddingHorizontal: 18,
                paddingVertical: 18,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: `${accent}18`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons
                  name={sport.icon as any}
                  size={24}
                  color={accent}
                />
              </View>
              <Text
                style={{
                  fontFamily: fonts.bodyBold,
                  fontSize: 15,
                  color: "#FFF",
                  flexShrink: 1,
                }}
              >
                {sport.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
