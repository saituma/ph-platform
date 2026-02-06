import { ActionButton } from "@/components/dashboard/ActionButton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HelpCenterScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-app">
        <TouchableOpacity
          onPress={() => router.navigate("/(tabs)/more")}
          className="h-10 w-10 items-center justify-center bg-secondary rounded-full"
        >
          <Feather name="arrow-left" size={20} className="text-app" />
        </TouchableOpacity>
        <Text className="text-xl font-clash text-app font-bold">
          Help Center
        </Text>
        <View className="w-10" />
      </View>

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
          <Text className="text-3xl font-clash text-app mb-2">
            How can we help?
          </Text>
          <View className="flex-row items-center bg-input border border-app rounded-2xl px-4 py-3 mt-4">
            <Feather name="search" size={18} className="text-secondary mr-3" />
            <TextInput
              placeholder="Search help articles..."
              className="flex-1 font-outfit text-app"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        <Text className="text-xs font-bold font-outfit text-gray-400 uppercase mb-4 ml-2 tracking-wider">
          Categories
        </Text>

        <View className="flex-row flex-wrap justify-between mb-8">
          <HelpCategory icon="user" label="Account" />
          <HelpCategory icon="activity" label="Training" />
          <HelpCategory icon="credit-card" label="Payments" />
          <HelpCategory icon="shield" label="Security" />
        </View>

        <Text className="text-xs font-bold font-outfit text-gray-400 uppercase mb-4 ml-2 tracking-wider">
          Popular Articles
        </Text>
        <View className="bg-input rounded-3xl overflow-hidden border border-app shadow-sm mb-8">
          <ArticleLink label="How to reset my password?" />
          <ArticleLink label="Changing my training program" />
          <ArticleLink label="Managing family members" isLast />
        </View>

        <ActionButton
          label="Contact Support"
          onPress={() => router.navigate("/feedback")}
          color="bg-accent"
          icon="message-square"
          fullWidth={true}
        />
      </ThemedScrollView>
    </SafeAreaView>
  );
}

function HelpCategory({ icon, label }: { icon: any; label: string }) {
  return (
    <TouchableOpacity className="w-[48%] bg-input border border-app rounded-3xl p-6 items-center mb-4 shadow-sm">
      <View className="w-12 h-12 bg-secondary rounded-2xl items-center justify-center mb-3">
        <Feather name={icon} size={24} className="text-accent" />
      </View>
      <Text className="font-clash font-bold text-app">{label}</Text>
    </TouchableOpacity>
  );
}

function ArticleLink({
  label,
  isLast = false,
}: {
  label: string;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      className={`flex-row items-center p-5 active:bg-secondary ${!isLast ? "border-b border-app" : ""}`}
    >
      <Text className="flex-1 font-outfit text-base text-app font-medium">
        {label}
      </Text>
      <Feather name="chevron-right" size={16} className="text-secondary" />
    </TouchableOpacity>
  );
}
