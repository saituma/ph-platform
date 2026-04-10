import React from "react";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { ProgramTierUI, SubscriptionRequest } from "@/types/billing";
import { PlanPricing } from "@/lib/billing";
import { PlanPricingView } from "./PlanPricingView";

interface Props {
  tier: ProgramTierUI;
  isCurrent: boolean;
  pricing?: PlanPricing;
  latestRequest: SubscriptionRequest | null;
  onOpen: (id: any) => void;
  onApply: (id: any) => void;
  isProcessing: boolean;
}

export function ProgramTierCard({
  tier,
  isCurrent,
  pricing,
  latestRequest,
  onOpen,
  onApply,
  isProcessing,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  const isPending = latestRequest?.planTier === tier.id && latestRequest?.status === "pending_approval";

  return (
    <View
      className="mb-6 rounded-[32px] border overflow-hidden"
      style={{
        backgroundColor: colors.card,
        borderColor: isCurrent ? colors.accent : borderSoft,
        ...(isDark ? Shadows.none : Shadows.md),
      }}
    >
      <View className="p-6">
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-2xl font-clash font-bold text-app">{tier.name}</Text>
              {isCurrent && (
                <View className="bg-accent/10 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-outfit-bold text-accent uppercase">Current</Text>
                </View>
              )}
            </View>
            {tier.highlight && (
              <Text className="text-xs font-outfit-bold text-accent uppercase tracking-widest">{tier.highlight}</Text>
            )}
          </View>
          <View className="h-12 w-12 rounded-2xl items-center justify-center bg-accent/10">
            <Feather name={tier.icon as any} size={24} color={colors.accent} />
          </View>
        </View>

        <View className="mb-6">
          <PlanPricingView pricing={pricing} />
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
            className="flex-1 rounded-full py-4 items-center border"
            style={{ borderColor: borderSoft }}
          >
            <Text className="font-outfit-bold text-app uppercase">Details</Text>
          </Pressable>
          
          {!isCurrent && (
            <Pressable
              onPress={() => onApply(tier.id)}
              disabled={isProcessing || isPending}
              className="flex-1 rounded-full py-4 items-center bg-accent"
              style={{ opacity: isProcessing || isPending ? 0.7 : 1 }}
            >
              <Text className="font-outfit-bold text-white uppercase">
                {isPending ? "Pending" : "Upgrade"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
