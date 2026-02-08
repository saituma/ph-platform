import { ActionButton } from "@/components/dashboard/ActionButton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

export default function NotificationsScreen() {
  const router = useRouter();
  const { isDark, colors } = useAppTheme();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(true);

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
          Notifications
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
        <View className="mb-6">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text className="text-3xl font-clash text-app">
              Alert Preferences
            </Text>
          </View>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Stay updated with your coaching schedule, messages, and progress.
          </Text>
        </View>

        <View
          className="bg-input rounded-3xl overflow-hidden border border-app shadow-sm mb-8"
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
          <NotificationToggle
            label="Push Notifications"
            description="Receive alerts on your device for new messages and events."
            value={pushEnabled}
            onToggle={setPushEnabled}
            icon="bell"
          />
          <NotificationToggle
            label="Email Updates"
            description="Get weekly digests and important account alerts via email."
            value={emailEnabled}
            onToggle={setEmailEnabled}
            icon="mail"
          />
          <NotificationToggle
            label="SMS Alerts"
            description="Receive urgent schedule changes via text message."
            value={smsEnabled}
            onToggle={setSmsEnabled}
            icon="message-circle"
            isLast
          />
        </View>

        <ActionButton
          label="Save Preferences"
          onPress={() => router.navigate("/(tabs)/more")}
          color="bg-accent"
          icon="check"
          fullWidth={true}
        />
      </ThemedScrollView>
    </SafeAreaView>
  );
}

function NotificationToggle({
  label,
  description,
  value,
  onToggle,
  icon,
  isLast = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  icon: any;
  isLast?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      className={`flex-row items-center p-5 ${!isLast ? "border-b border-app" : ""}`}
    >
      <View className="flex-1 mr-4">
        <View className="flex-row items-center mb-1 gap-2">
          <View className="h-6 w-6 rounded-lg bg-secondary items-center justify-center">
            <Feather name={icon} size={14} className="text-accent" />
          </View>
          <Text className="text-lg font-bold font-clash text-app">{label}</Text>
        </View>
        <Text className="text-sm font-outfit text-secondary leading-relaxed">
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.background}
      />
    </View>
  );
}
