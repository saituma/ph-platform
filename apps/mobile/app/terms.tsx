import { ActionButton } from "@/components/dashboard/ActionButton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TermsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();

  const handleBack = () => {
    if (params.from) {
      router.navigate(params.from as any);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-app">
        <TouchableOpacity
          onPress={handleBack}
          className="h-10 w-10 items-center justify-center bg-secondary rounded-full"
        >
          <Feather name="arrow-left" size={20} className="text-app" />
        </TouchableOpacity>
        <Text className="text-xl font-clash text-app font-bold">
          Terms of Service
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
          <Text className="text-3xl font-clash text-app mb-2">Legal Terms</Text>
          <Text className="text-base font-outfit text-secondary mt-1">
            Last updated: February 05, 2024
          </Text>
        </View>

        <View className="gap-8">
          <LegalSection
            title="1. Agreement to Terms"
            content="By accessing or using the PHP Coaching application, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app."
          />
          <LegalSection
            title="2. Eligibility"
            content="The app is designed for athletes and their guardians. Guardians are responsible for the management of minor accounts and all coaching bookings."
          />
          <LegalSection
            title="3. Coaching & Subscriptions"
            content="Subscriptions provide access to specific training tiers (PHP, Plus, Premium). Features and availability may vary based on your selected plan."
          />
          <LegalSection
            title="4. Safety & Liability"
            content="Physical training involves inherent risks. Users must ensure they are in proper physical condition before proceeding with any training program provided."
          />
          <LegalSection
            title="5. Termination"
            content="We reserve the right to suspend or terminate accounts that violate our community guidelines or fail to maintain valid subscriptions."
          />
        </View>

        <View className="mt-12">
          <ActionButton
            label="I Understand"
            onPress={() => router.back()}
            color="bg-secondary"
            icon="check"
            fullWidth={true}
          />
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}

function LegalSection({ title, content }: { title: string; content: string }) {
  return (
    <View>
      <Text className="text-lg font-bold font-clash text-app mb-3 tracking-tight">
        {title}
      </Text>
      <Text className="text-base font-outfit text-secondary leading-relaxed">
        {content}
      </Text>
    </View>
  );
}
