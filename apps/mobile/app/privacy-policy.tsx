import { ActionButton } from "@/components/dashboard/ActionButton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyPolicyScreen() {
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
          Privacy Policy
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
            Data Protection
          </Text>
          <Text className="text-base font-outfit text-secondary mt-1">
            Last updated: February 05, 2024
          </Text>
        </View>

        <View className="gap-8">
          <PolicySection
            title="1. Data We Collect"
            content="We collect personal information such as name, email, and training progress to provide a personalized coaching experience. For minor athletes, we only collect data with guardian consent."
          />
          <PolicySection
            title="2. How We Use Data"
            content="Your data is used to track athletic progress, manage schedules, and communicate important updates. We do not sell your personal information to third parties."
          />
          <PolicySection
            title="3. Storage & Security"
            content="We implement industry-standard security measures to protect your data. All sensitive communications and payments are encrypted."
          />
          <PolicySection
            title="4. Your Rights"
            content="You have the right to access, correct, or delete your personal data at any time through the Privacy & Security settings or by contacting support."
          />
          <PolicySection
            title="5. Policy Updates"
            content="We may update this policy occasionally. Continued use of the app after changes constitutes acceptance of the new terms."
          />
        </View>

        <View className="mt-12">
          <ActionButton
            label="I Understand"
            onPress={handleBack}
            color="bg-secondary"
            icon="check"
            fullWidth={true}
          />
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}

function PolicySection({ title, content }: { title: string; content: string }) {
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
