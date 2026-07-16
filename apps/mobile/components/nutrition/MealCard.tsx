import React from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Plus } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useNutritionTheme } from "@/components/nutrition/theme";
import type { MealSlotData } from "./types";

type MealCardProps = {
  slot: MealSlotData;
  onPressAdd?: (() => void) | undefined;
};

export const MealCard = React.memo(function MealCard({ slot, onPressAdd }: MealCardProps) {
  const p = useNutritionTheme();
  const totalEaten = slot.items.reduce((sum, item) => sum + item.calories, 0);
  const hasItems = slot.items.length > 0;

  return (
    <Pressable
      onPress={onPressAdd}
      disabled={!onPressAdd}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: "45%",
        borderRadius: 22,
        padding: 16,
        backgroundColor: p.cardWhite,
        opacity: !onPressAdd ? 1 : pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: hasItems ? 8 : 12 }}>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary }}>
          {slot.label}
        </Text>
        {onPressAdd ? (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 100,
              backgroundColor: p.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={16} color={p.accent} strokeWidth={2.5} />
          </View>
        ) : null}
      </View>

      {totalEaten > 0 ? (
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.accent, marginBottom: 4 }}>
          {totalEaten} kcal
        </Text>
      ) : null}

      {slot.photos.length > 0 ? (
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
          {slot.photos.slice(0, 3).map((url) => (
            <Image
              key={url}
              source={{ uri: url }}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: p.inputBg }}
              contentFit="cover"
              transition={120}
            />
          ))}
          {slot.photos.length > 3 ? (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: p.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.accent }}>
                +{slot.photos.length - 3}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {hasItems ? (
        <Text
          numberOfLines={2}
          style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted, lineHeight: 16 }}
        >
          {slot.items.map((i) => i.name).join(", ")}
        </Text>
      ) : (
        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted }}>
          {onPressAdd ? "Tap + to log" : "No items logged"}{"\n"}{slot.recommendedMin}-{slot.recommendedMax} kcal
        </Text>
      )}
    </Pressable>
  );
});
