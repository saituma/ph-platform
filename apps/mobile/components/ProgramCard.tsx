import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";

export type ProgramTier = {
  id: string;
  name: string;
  description: string;
  features: string[];
  color: string;
  icon: any;
  price?: string;
};

interface ProgramCardProps {
  tier: ProgramTier;
  onPress?: () => void;
  index?: number;
}

export function ProgramCard({ tier, onPress, index = 0 }: ProgramCardProps) {
  return (
    <Animated.View
      entering={FadeInRight.delay(index * 100).springify()}
      className="mb-4"
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        className="bg-input rounded-[32px] overflow-hidden border border-app shadow-sm"
      >
        <View
          className={`${tier.color} p-6 flex-row items-center justify-between`}
        >
          <View className="flex-1 mr-4">
            <Text className="text-white text-2xl font-clash font-bold mb-1">
              {tier.name}
            </Text>
            <Text className="text-white/80 font-outfit text-sm leading-tight">
              {tier.description}
            </Text>
          </View>
          <View className="h-14 w-14 bg-white/20 rounded-2xl items-center justify-center border border-white/30">
            <Feather name={tier.icon} size={28} color="white" />
          </View>
        </View>

        <View className="p-6">
          <View className="gap-3 mb-6">
            {tier.features.map((feature, i) => (
              <View key={i} className="flex-row items-center">
                <View className="h-5 w-5 bg-green-500/10 rounded-full items-center justify-center mr-3">
                  <Feather name="check" size={12} className="text-green-500" />
                </View>
                <Text className="flex-1 text-app font-outfit text-[15px]">
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <View
            className={`h-14 rounded-2xl items-center justify-center ${tier.color}`}
          >
            <Text className="text-white font-bold font-clash text-lg">
              {tier.id === "premium" ? "Apply Now" : "Select Plan"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
