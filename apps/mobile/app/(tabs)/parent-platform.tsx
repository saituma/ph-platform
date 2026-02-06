import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const CATEGORIES = [
  {
    id: "1",
    title: "Growth and Maturation",
    icon: "trending-up",
    color: "bg-blue-500",
  },
  {
    id: "2",
    title: "Injury Prevention",
    icon: "shield",
    color: "bg-green-500",
  },
  {
    id: "3",
    title: "Sleep and Recovery",
    icon: "moon",
    color: "bg-purple-500",
  },
  {
    id: "4",
    title: "Nutrition for Youth",
    icon: "coffee",
    color: "bg-orange-500",
  },
  { id: "5", title: "Training Load", icon: "bar-chart-2", color: "bg-red-500" },
  {
    id: "6",
    title: "Mindset & Confidence",
    icon: "smile",
    color: "bg-teal-500",
  },
];

export default function ParentPlatformScreen() {
  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView
        onRefresh={async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        <View className="mb-8">
          <Text className="text-4xl font-clash text-app mb-2">
            Parent Platform
          </Text>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Essential education hub for parents of young athletes.
          </Text>
        </View>

        <View className="flex-row flex-wrap justify-between">
          {CATEGORIES.map((cat, index) => (
            <Animated.View
              key={cat.id}
              entering={FadeInDown.delay(index * 100).springify()}
              className="w-[48%] mb-4"
            >
              <TouchableOpacity
                activeOpacity={0.7}
                className="bg-input border border-app rounded-[24px] p-5 shadow-sm h-40 justify-between"
              >
                <View
                  className={`${cat.color} h-12 w-12 rounded-2xl items-center justify-center`}
                >
                  <Feather name={cat.icon as any} size={24} color="white" />
                </View>
                <Text className="font-outfit font-bold text-app text-base leading-tight">
                  {cat.title}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View className="mt-8 bg-accent/10 rounded-3xl p-6 border border-accent/20">
          <View className="flex-row items-center mb-2">
            <Feather name="info" size={20} className="text-accent mr-2" />
            <Text className="text-accent font-bold font-clash text-lg">
              Full Access
            </Text>
          </View>
          <Text className="text-app font-outfit text-sm leading-relaxed">
            PHP Plus and Premium members receive exclusive articles and video
            guides in every category.
          </Text>
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}
