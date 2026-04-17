import React from "react";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";

interface Props {
  tier: {
    id: string;
    name: string;
    icon: string;
    highlight?: string;
    features: string[];
  };
  onOpen: (id: string) => void;
}

export function ProgramTierCard({
  tier,
  onOpen,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  return (
    <View
      className="mb-6 rounded-[32px] border overflow-hidden"
      style={{
        backgroundColor: colors.card,
        borderColor: borderSoft,
        ...(isDark ? Shadows.none : Shadows.md),
      }}
    >
      <View className="p-6">
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-2xl font-clash font-bold text-app">{tier.name}</Text>
            </View>
            {tier.highlight && (
              <Text className="text-xs font-outfit-bold text-accent uppercase tracking-widest">{tier.highlight}</Text>
            )}
          </View>
          <View className="h-12 w-12 rounded-2xl items-center justify-center bg-accent/10">
            <Feather name={tier.icon as any} size={24} color={colors.accent} />
          </View>
        </View>

        <View className="gap-3 mb-6">
          {tier.features.slice(0, 4).map((f) => (
            <View key={f} className="flex-row items-center gap-2">
              <Feather name="check" size={14} color={colors.accent} />
              <Text className="text-sm font-outfit text-secondary">{f}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row gap-3">
          <Pressable
            onPress={() => onOpen(tier.id)}
            className="flex-1 rounded-full py-4 items-center bg-accent"
          >
            <Text className="font-outfit-bold text-white uppercase">View Details</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
