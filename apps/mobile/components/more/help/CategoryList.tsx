import React from "react";
import { Pressable, View } from "react-native";
import { LayoutGrid, User, Activity, Shield } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { HELP_CATEGORIES } from "./constants";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  grid: LayoutGrid,
  user: User,
  activity: Activity,
  shield: Shield,
};

interface CategoryListProps {
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

export function CategoryList({ selectedCategory, onSelectCategory }: CategoryListProps) {
  const p = useAdminPastel();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 24 }}>
      {HELP_CATEGORIES.map((category) => {
        const isSelected = selectedCategory === category.id;
        const Icon = ICON_MAP[category.icon] || LayoutGrid;
        return (
          <Pressable
            key={category.id}
            onPress={() => onSelectCategory(category.id)}
            style={({ pressed }) => ({
              marginBottom: 12,
              width: "48%",
              borderRadius: 22,
              padding: 16,
              backgroundColor: isSelected ? p.accentSoft : p.cardSage,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View
              style={{
                marginBottom: 12,
                height: 48,
                width: 48,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                backgroundColor: isSelected ? p.cardWhite : p.cardMint,
              }}
            >
              <Icon size={22} color={p.accent} />
            </View>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary, marginBottom: 4 }}>
              {category.label}
            </Text>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, lineHeight: 18 }}>
              {category.description}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
