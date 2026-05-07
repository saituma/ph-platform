import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import type { MealItem } from "./types";

type MealFoodRowProps = {
  item: MealItem;
};

export function MealFoodRow({ item }: MealFoodRowProps) {
  const p = useAdminPastel();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 14,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: p.accentSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 100,
            backgroundColor: p.accent,
          }}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary }}>
          {item.name}
        </Text>
        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted, marginTop: 2 }}>
          {item.calories} kcal
          {item.weightGrams > 0 ? `  ${item.weightGrams}${item.unit || "g"}` : ""}
        </Text>
      </View>
    </View>
  );
}
