import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { BottomSheet } from "heroui-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";
import type { SportId } from "./ActiveRunSportSheet";

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
  const accent = colors.accent;

  return (
    <BottomSheet isOpen={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay className="bg-black/55" />
        <BottomSheet.Content
          snapPoints={["60%"]}
          enablePanDownToClose
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
              <Text style={{ fontFamily: fonts.accentBold, fontSize: 22, color: "#FFF" }}>
                Select Activity
              </Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                Choose what you're doing today
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: DIVIDER }} />

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
          </ScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
