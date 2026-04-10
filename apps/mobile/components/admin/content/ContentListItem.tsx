import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ScaledText";
import { ProgramTemplate, ExerciseItem } from "../../../hooks/admin/controllers/useAdminContentController";

interface ContentListItemProps {
  item: ProgramTemplate | ExerciseItem;
  onPress: () => void;
  isDark: boolean;
  type: "program" | "exercise";
}

export function ContentListItem({ item, onPress, isDark, type }: ContentListItemProps) {
  const bg = isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)";
  const border = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  if (type === "program") {
    const p = item as ProgramTemplate;
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="rounded-2xl border px-4 py-3"
        style={{ backgroundColor: bg, borderColor: border }}
      >
        <Text className="text-[13px] font-clash font-bold text-app" numberOfLines={1}>
          {p.name ?? `Program ${p.id}`}
        </Text>
        <Text className="text-[12px] font-outfit text-secondary" numberOfLines={2}>
          {p.type ?? "—"}
          {p.description ? ` • ${p.description}` : ""}
        </Text>
      </Pressable>
    );
  }

  const e = item as ExerciseItem;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="rounded-2xl border px-4 py-3"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      <Text className="text-[13px] font-clash font-bold text-app" numberOfLines={1}>
        {e.name ?? `Exercise ${e.id}`}
      </Text>
      {e.notes ? (
        <Text className="text-[12px] font-outfit text-secondary" numberOfLines={2}>
          {e.notes}
        </Text>
      ) : null}
    </Pressable>
  );
}
