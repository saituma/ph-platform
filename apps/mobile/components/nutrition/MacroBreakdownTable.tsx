import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";

type MacroRow = {
  label: string;
  grams: number;
  kcal: number;
};

type MacroBreakdownTableProps = {
  rows: MacroRow[];
  totalGrams: number;
  totalKcal: number;
};

export function MacroBreakdownTable({ rows, totalGrams, totalKcal }: MacroBreakdownTableProps) {
  const p = useAdminPastel();

  return (
    <View style={{ borderRadius: 22, backgroundColor: p.cardSage, padding: 16 }}>
      {rows.map((row, idx) => (
        <View key={row.label}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textPrimary, flex: 1 }}>
              {row.label}
            </Text>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted, width: 60, textAlign: "right" }}>
              {row.grams}g
            </Text>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary, width: 70, textAlign: "right" }}>
              {row.kcal} kcal
            </Text>
          </View>
          {idx < rows.length - 1 ? (
            <View style={{ height: 1, backgroundColor: p.divider }} />
          ) : null}
        </View>
      ))}

      <View style={{ height: 1, backgroundColor: p.accent, marginVertical: 4 }} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 10,
        }}
      >
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary, flex: 1 }}>
          Total
        </Text>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textMuted, width: 60, textAlign: "right" }}>
          {totalGrams} g
        </Text>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary, width: 70, textAlign: "right" }}>
          {totalKcal} kcal
        </Text>
      </View>
    </View>
  );
}
