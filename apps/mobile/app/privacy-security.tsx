
import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <MoreStackHeader
        title="Privacy & Security"
        subtitle="Keep access tight, review protection tools, and stay in control of your account safety."
        badge="Security"
      />

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
        <View className="mb-6">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text className="text-3xl font-clash text-app">
              Account Safety
            </Text>
          </View>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Manage your passwords and account security settings.
          </Text>
        </View>

        <View
          className="bg-input rounded-[32px] overflow-hidden border border-app shadow-sm mb-6"
          style={
            isDark
              ? undefined
              : {
                  shadowColor: "#0F172A",
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 6,
                }
          }
        >
          <SecurityLink
            label="Change Password"
            icon="key"
            onPress={() => router.navigate("/(auth)/change-password")}
            isLast
          />
        </View>
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
      <View className="w-10 h-10 items-center justify-center bg-secondary rounded-2xl mr-4">
        <Feather name={icon} size={16} className={color} />
      </View>
      <Text className={`flex-1 font-outfit text-base font-bold ${color}`}>
        {label}
      </Text>
      <Feather name="chevron-right" size={16} className="text-secondary" />
    </TouchableOpacity>
  );
}