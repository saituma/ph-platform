import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { HELP_CATEGORIES } from "./constants";

interface CategoryListProps {
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

export function CategoryList({ selectedCategory, onSelectCategory }: CategoryListProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View className="flex-row flex-wrap justify-between mb-8">
      {HELP_CATEGORIES.map((category) => (
        <TouchableOpacity
          key={category.id}
          onPress={() => onSelectCategory(category.id)}
          className="mb-4 w-[48%] rounded-[28px] border p-4"
          style={{
            backgroundColor: selectedCategory === category.id ? (isDark ? "rgba(34,197,94,0.16)" : "#F0FDF4") : colors.card,
            borderColor: selectedCategory === category.id ? colors.accent : isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.sm),
          }}
          activeOpacity={0.9}
        >
          <View
            className="mb-3 h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: selectedCategory === category.id ? colors.accentLight : isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)" }}
          >
            <Feather name={category.icon} size={22} color={colors.accent} />
          </View>
          <Text className="font-clash text-lg font-bold text-app mb-1">{category.label}</Text>
          <Text className="font-outfit text-sm text-secondary leading-5">{category.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
