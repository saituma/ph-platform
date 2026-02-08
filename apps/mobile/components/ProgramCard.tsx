import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export type ProgramTier = {
  id: string;
  name: string;
  description: string;
  features: string[];
  color: string;
  icon: any;
  price?: string;
  highlight?: string;
};

interface ProgramCardProps {
  tier: ProgramTier;
  onPress?: () => void;
  index?: number;
}

export function ProgramCard({ tier, onPress, index = 0 }: ProgramCardProps) {
  return (
    <View className="mb-6">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        className="bg-input rounded-[32px] overflow-hidden border border-app"
      >
        <View
          className={`${tier.color} p-5 rounded-b-[28px]`}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.2)",
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center gap-2 mb-2">
                {tier.highlight && (
                  <View className="px-3 py-1 rounded-full bg-white/20 border border-white/30">
                    <Text className="text-white text-[10px] font-bold uppercase tracking-[2px]">
                      {tier.highlight}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-white text-2xl font-clash font-bold mb-1">
                {tier.name}
              </Text>
              <Text className="text-white/80 font-outfit text-sm leading-tight">
                {tier.description}
              </Text>
            </View>
            <View className="h-12 w-12 bg-white/20 rounded-2xl items-center justify-center border border-white/30">
              <Feather name={tier.icon} size={24} color="white" />
            </View>
          </View>
        </View>

        <View className="p-6">
          <View className="gap-3 mb-6">
            {tier.features.map((feature, i) => (
              <View key={i} className="flex-row items-center">
                <View className="h-5 w-5 bg-success-soft rounded-full items-center justify-center mr-3">
                  <Feather name="check" size={12} className="text-success" />
                </View>
                <Text className="flex-1 text-app font-outfit text-[15px]">
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 h-12 rounded-2xl items-center justify-center border border-app">
              <Text className="text-app font-bold font-outfit text-sm">
                View Details
              </Text>
            </View>
            <View
              className={`flex-1 h-12 rounded-2xl items-center justify-center ${tier.color}`}
            >
              <Text className="text-white font-bold font-clash text-base">
                {tier.id === "premium" ? "Apply Now" : "Select Plan"}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
