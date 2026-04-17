import React from "react";
import { TouchableOpacity, View, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { POPULAR_SEARCHES } from "./constants";

interface SearchHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function SearchHeader({ searchQuery, setSearchQuery }: SearchHeaderProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View
      className="mb-8 overflow-hidden rounded-[30px] border p-5"
      style={{
        backgroundColor: isDark ? colors.cardElevated : "#F7FFF9",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        ...(isDark ? Shadows.none : Shadows.md),
      }}
    >
      <View
        className="absolute -right-10 -top-8 h-24 w-24 rounded-full"
        style={{ backgroundColor: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.12)" }}
      />
      <View
        className="absolute -bottom-8 left-8 h-20 w-20 rounded-full"
        style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)" }}
      />

      <View className="mb-5">
        <Text className="text-3xl font-telma-bold text-app mb-2">How can we help?</Text>
        <Text className="text-base font-outfit text-secondary leading-relaxed">
          Find quick answers, learn the best next step, and get the right details ready before you contact the team.
        </Text>
      </View>

      <View className="flex-row items-center bg-input border border-app rounded-2xl px-4 py-3">
        <Feather name="search" size={18} color={colors.textSecondary} style={{ marginRight: 12 }} />
        <TextInput
          placeholder="Search help topics, schedules, notifications..."
          className="flex-1 font-outfit text-app"
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            className="ml-3 h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)" }}
          >
            <Feather name="x" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        {POPULAR_SEARCHES.map((term) => (
          <TouchableOpacity
            key={term}
            onPress={() => setSearchQuery(term)}
            className="rounded-full border px-3 py-2"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.82)",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            }}
          >
            <Text className="font-outfit text-xs font-bold uppercase tracking-[1.2px]" style={{ color: colors.textSecondary }}>
              {term}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
