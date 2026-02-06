import { ActionButton } from "@/components/dashboard/ActionButton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacySecurityScreen() {
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
          Privacy & Security
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
            Account Safety
          </Text>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Manage your data, passwords, and two-factor authentication.
          </Text>
        </View>

        <View className="bg-input rounded-[32px] overflow-hidden border border-app shadow-sm mb-8">
          <SecurityLink label="Change Password" icon="key" onPress={() => {}} />
          <SecurityLink
            label="Two-Factor Authentication"
            icon="shield"
            onPress={() => {}}
          />
          <SecurityLink
            label="Authorized Devices"
            icon="tablet"
            onPress={() => {}}
          />
          <SecurityLink
            label="Download My Data"
            icon="download"
            onPress={() => {}}
            isLast
          />
        </View>

        <View className="bg-red-50 dark:bg-red-950/20 rounded-[32px] overflow-hidden border border-red-100 dark:border-red-900/30 p-2 mb-8">
          <SecurityLink
            label="Delete Account"
            icon="trash-2"
            onPress={() => {}}
            isLast
            color="text-red-500"
          />
        </View>

        <ActionButton
          label="Close"
          onPress={() => router.navigate("/(tabs)/more")}
          color="bg-secondary"
          icon="x"
          fullWidth={true}
        />
      </ThemedScrollView>
    </SafeAreaView>
  );
}

function SecurityLink({
  label,
  onPress,
  icon,
  isLast = false,
  color = "text-app",
}: {
  label: string;
  onPress: () => void;
  icon: any;
  isLast?: boolean;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center p-5 active:bg-secondary ${!isLast ? "border-b border-app" : ""}`}
    >
      <View className="w-10 h-10 items-center justify-center bg-secondary rounded-full mr-4">
        <Feather name={icon} size={18} className={color} />
      </View>
      <Text className={`flex-1 font-outfit text-base font-bold ${color}`}>
        {label}
      </Text>
      <Feather name="chevron-right" size={16} className="text-secondary" />
    </TouchableOpacity>
  );
}
