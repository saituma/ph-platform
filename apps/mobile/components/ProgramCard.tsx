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
  priceEntries?: {
    label: string;
    original: string;
    discounted?: string;
    discountLabel?: string;
  }[];
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

const TierBadge = ({ text, opacity = "15" }: { text: string; opacity?: string }) => (
  <View className={`px-3 py-1 rounded-full bg-[#F2F6F2]/${opacity}`}>
    <Text
      className="text-[10px] font-bold uppercase tracking-[1.6px]"
      style={{ color: "#F2F6F2" }}
    >
      {text}
    </Text>
  </View>
);

const PriceSection = ({ tier }: { tier: ProgramTier }) => {
  if (tier.priceEntries && tier.priceEntries.length > 0) {
    return (
      <View className="mb-4">
        {tier.priceEntries.map((entry) => (
          <View key={`${entry.label}-${entry.original}`} className="mb-2">
            <Text className="text-[10px] font-outfit text-[#1D2A22] dark:text-[#D8E6D8] uppercase tracking-[1px]">
              {entry.label}
            </Text>
            {entry.discounted ? (
              <View className="mt-1">
                {entry.discountLabel && (
                  <Text className="text-[10px] font-outfit text-red-500 mb-1">
                    {entry.discountLabel}
                  </Text>
                )}
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs font-outfit text-red-500 line-through">
                    {entry.original}
                  </Text>
                  <Text className="text-sm font-outfit font-semibold text-[#2F8F57]">
                    {entry.discounted}
                  </Text>
                </View>
              </View>
            ) : (
              <Text className="text-sm font-outfit text-[#0E1510] dark:text-[#F2F6F2]">
                {entry.original}
              </Text>
            )}
          </View>
        ))}
        {tier.discountNote && (
          <Text className="text-xs font-outfit text-[#1D2A22] dark:text-[#D8E6D8] mt-1">
            {tier.discountNote}
          </Text>
        )}
      </View>
    );
  }

  if (tier.priceLines && tier.priceLines.length > 0) {
    return (
      <View className="mb-4">
        {tier.priceLines.map((line, i) => (
          <Text key={i} className="text-sm font-outfit text-[#0E1510] dark:text-[#F2F6F2]">
            {line}
          </Text>
        ))}
        {tier.discountNote && (
          <Text className="text-xs font-outfit text-[#1D2A22] dark:text-[#D8E6D8] mt-1">
            {tier.discountNote}
          </Text>
        )}
      </View>
    );
  }

  return null;
};

const FeatureItem = ({ feature }: { feature: string }) => (
  <View className="flex-row items-center">
    <View className="h-5 w-5 bg-[#2F8F57]/15 rounded-full items-center justify-center mr-3">
      <Feather name="check" size={12} color="#2F8F57" />
    </View>
    <Text className="flex-1 text-[#0E1510] dark:text-[#F2F6F2] font-outfit text-base">
      {feature}
    </Text>
  </View>
);

export function ProgramCard({
  tier,
  onPress,
  primaryLabel,
  secondaryLabel,
  onPrimaryPress,
  onSecondaryPress,
  helperNote,
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
        <View className={`${tier.color} p-5 rounded-b-[24px]`}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4 min-w-0">
              <View className="flex-row flex-wrap items-center gap-2 mb-2 max-w-full">
                {tier.highlight && <TierBadge text={tier.highlight} opacity="20" />}
                {tier.price && <TierBadge text={tier.price} />}
                {tier.priceBadge && <TierBadge text={tier.priceBadge} />}
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
          <PriceSection tier={tier} />
          
          <View className="gap-3 mb-6">
            {tier.features.map((feature, i) => (
              <FeatureItem key={i} feature={feature} />
            ))}
          </View>

          {helperNote && (
            <Text className="text-xs font-outfit text-[#1D2A22] dark:text-[#D8E6D8] mb-4">
              {helperNote}
            </Text>
          )}

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
