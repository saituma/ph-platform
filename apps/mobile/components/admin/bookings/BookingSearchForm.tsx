import React from "react";
import { View, TextInput } from "react-native";
import { Text } from "@/components/ScaledText";
import { SmallAction } from "../AdminShared";

interface BookingSearchFormProps {
  query: string;
  setQuery: (v: string) => void;
  limit: string;
  setLimit: (v: string) => void;
  onRun: () => void;
  onReset: () => void;
  isLoading: boolean;
  colors: any;
  isDark: boolean;
}

export function BookingSearchForm({
  query,
  setQuery,
  limit,
  setLimit,
  onRun,
  onReset,
  isLoading,
  colors,
  isDark,
}: BookingSearchFormProps) {
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)";
  const inputBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  return (
    <View className="gap-3">
      <Text className="text-[13px] font-outfit-semibold text-app">Search</Text>
      
      <View className="gap-2">
        <Text className="text-[12px] font-outfit text-secondary">
          Query (matches service, athlete, status, id)
        </Text>
        <View
          className="rounded-2xl border px-4 py-3"
          style={{ backgroundColor: inputBg, borderColor: inputBorder }}
        >
          <TextInput
            className="text-[14px] font-outfit text-app"
            value={query}
            onChangeText={setQuery}
            placeholder="e.g. pending, role_model, 123"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-[12px] font-outfit text-secondary">Limit (1–200)</Text>
        <View
          className="rounded-2xl border px-4 py-3"
          style={{ backgroundColor: inputBg, borderColor: inputBorder }}
        >
          <TextInput
            className="text-[14px] font-outfit text-app"
            value={limit}
            onChangeText={setLimit}
            placeholder="50"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <View className="flex-row gap-2">
        <SmallAction
          label="Run"
          tone="success"
          onPress={onRun}
          disabled={isLoading}
        />
        <SmallAction
          label="Reset"
          tone="neutral"
          onPress={onReset}
          disabled={isLoading}
        />
      </View>
    </View>
  );
}
