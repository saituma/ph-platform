import { Feather } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View, useColorScheme } from "react-native";
import { Text } from "@/components/ScaledText";

export type ProgramTier = {
  id: string;
  name: string;
  description: string;
  features: string[];
  color: string;
  icon: any;
  price?: string;
  priceBadge?: string;
  priceLines?: string[];
  discountNote?: string;
  highlight?: string;
};

interface ProgramCardProps {
  tier: ProgramTier;
  onPress?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  helperNote?: string;
  index?: number;
}

export function ProgramCard({
  tier,
  onPress,
  primaryLabel,
  secondaryLabel,
  onPrimaryPress,
  onSecondaryPress,
  helperNote,
  index = 0,
}: ProgramCardProps) {
  const primaryText = primaryLabel ?? (tier.id === "premium" ? "Apply Now" : "Select Plan");
  const secondaryText = secondaryLabel ?? "View Details";
  const handlePrimary = onPrimaryPress ?? onPress;
  const handleSecondary = onSecondaryPress ?? onPress;
  const colorScheme = useColorScheme();
  const secondaryTextColor = colorScheme === "dark" ? "#F2F6F2" : "#0E1510";

  return (
    <View className="mb-6">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        className="rounded-[28px] overflow-hidden bg-[#F4F8F4] dark:bg-[#0F1A12]"
      >
        <View
          className={`${tier.color} p-5 rounded-b-[24px]`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4 min-w-0">
              <View className="flex-row flex-wrap items-center gap-2 mb-2 max-w-full">
                {tier.highlight && (
                  <View className="px-3 py-1 rounded-full bg-[#F2F6F2]/20">
                    <Text
                      className="text-[10px] font-bold uppercase tracking-[1.6px]"
                      style={{ color: "#F2F6F2" }}
                    >
                      {tier.highlight}
                    </Text>
                  </View>
                )}
                {tier.price && (
                  <View className="px-3 py-1 rounded-full bg-[#F2F6F2]/15">
                    <Text
                      className="text-[10px] font-bold uppercase tracking-[1.6px]"
                      style={{ color: "#F2F6F2" }}
                    >
                      {tier.price}
                    </Text>
                  </View>
                )}
                {tier.priceBadge && (
                  <View className="px-3 py-1 rounded-full bg-[#F2F6F2]/15">
                    <Text
                      className="text-[10px] font-bold uppercase tracking-[1.6px]"
                      style={{ color: "#F2F6F2" }}
                    >
                      {tier.priceBadge}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                className="text-2xl leading-snug font-telma-bold font-bold mb-1"
                style={{ color: "#F2F6F2" }}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {tier.name}
              </Text>
              <Text
                className="font-outfit text-base leading-6"
                style={{ color: "#E6F2E6" }}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {tier.description}
              </Text>
            </View>
            <View className="h-12 w-12 bg-[#F2F6F2]/20 rounded-2xl items-center justify-center">
              <Feather name={tier.icon} size={24} color="#F2F6F2" />
            </View>
          </View>
        </View>

        <View className="p-6">
          {tier.priceLines && tier.priceLines.length > 0 ? (
            <View className="mb-4">
              {tier.priceLines.map((line, i) => (
                <Text key={i} className="text-sm font-outfit text-[#0E1510] dark:text-[#F2F6F2]">
                  {line}
                </Text>
              ))}
              {tier.discountNote ? (
                <Text className="text-xs font-outfit text-[#1D2A22] dark:text-[#D8E6D8] mt-1">
                  {tier.discountNote}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View className="gap-3 mb-6">
            {tier.features.map((feature, i) => (
              <View key={i} className="flex-row items-center">
                <View className="h-5 w-5 bg-[#2F8F57]/15 rounded-full items-center justify-center mr-3">
                  <Feather name="check" size={12} color="#2F8F57" />
                </View>
                <Text className="flex-1 text-[#0E1510] dark:text-[#F2F6F2] font-outfit text-base">
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {helperNote ? (
            <Text className="text-xs font-outfit text-[#1D2A22] dark:text-[#D8E6D8] mb-4">
              {helperNote}
            </Text>
          ) : null}

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleSecondary}
              activeOpacity={0.8}
              className="flex-1 h-12 rounded-2xl items-center justify-center border border-[#0E1510]/15 dark:border-[#E6F2E6]/25"
            >
              <Text className="font-bold font-outfit text-sm" style={{ color: secondaryTextColor }}>
                {secondaryText}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePrimary}
              activeOpacity={0.8}
              className="flex-1 h-12 rounded-2xl items-center justify-center bg-[#2F8F57]"
            >
              <Text
                className="font-bold font-clash text-base"
                style={{ color: "#F2F6F2" }}
              >
                {primaryText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
