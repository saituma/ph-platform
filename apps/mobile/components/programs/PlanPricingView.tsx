import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ScaledText";
import { PlanPricing } from "@/lib/billing";

interface Props {
  pricing?: PlanPricing;
}

export function PlanPricingView({ pricing }: Props) {
  if (!pricing) return null;

  if (!pricing.entries?.length) {
    return (
      <>
        {pricing.lines.map((line) => (
          <Text key={line} className="text-[11px] font-outfit text-secondary">
            {line}
          </Text>
        ))}
      </>
    );
  }

  return (
    <>
      {pricing.entries.map((entry) => (
        <View key={`${entry.label}-${entry.original}`} className="mb-2">
          <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1px]">
            {entry.label}
          </Text>
          {entry.discounted ? (
            <View className="mt-1">
              {entry.discountLabel && (
                <Text className="text-[10px] font-outfit text-red-400 mb-1">
                  {entry.discountLabel}
                </Text>
              )}
              <View className="flex-row items-center gap-2">
                <Text className="text-xs font-outfit text-red-400 line-through">
                  {entry.original}
                </Text>
                <Text className="text-sm font-outfit text-[#2F8F57] font-semibold">
                  {entry.discounted}
                </Text>
              </View>
            </View>
          ) : (
            <Text className="text-xs font-outfit text-app">{entry.original}</Text>
          )}
        </View>
      ))}
    </>
  );
}
