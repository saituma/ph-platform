import React from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { Feather } from "@/components/ui/theme-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { SectionHeader } from "./SectionHeader";

interface DebugPushSectionProps {
  pushRegistration: any;
  pushToken: string | null;
  isSendingTestPush: boolean;
  onTestPush: () => void;
}

export function DebugPushSection({
  pushRegistration,
  pushToken,
  isSendingTestPush,
  onTestPush,
}: DebugPushSectionProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View
      className="bg-input rounded-3xl p-6 shadow-sm border border-app mt-4"
      style={isDark ? Shadows.none : Shadows.sm}
    >
      <SectionHeader
        title="Debug & Notifications"
        subtitle="Verify push notification status."
        icon="bell"
      />
      
      <View className="gap-4">
        <View>
          <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.5px] font-bold mb-2">Push Support</Text>
          <View className="bg-app border border-app rounded-xl p-3">
            <Text className="text-[11px] font-mono text-secondary">
              {pushRegistration.support}
            </Text>
          </View>
        </View>

        <View>
          <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.5px] font-bold mb-2">Permission</Text>
          <View className="bg-app border border-app rounded-xl p-3">
            <Text className="text-[11px] font-mono text-secondary">
              {pushRegistration.permissionStatus}
            </Text>
          </View>
        </View>

        <View>
          <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.5px] font-bold mb-2">Expo Project ID</Text>
          <View className="bg-app border border-app rounded-xl p-3">
            <Text className="text-[11px] font-mono text-secondary" numberOfLines={2}>
              {pushRegistration.projectId || "Missing"}
            </Text>
          </View>
        </View>

        <View>
          <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.5px] font-bold mb-2">Expo Push Token</Text>
          <View className="bg-app border border-app rounded-xl p-3">
            <Text className="text-[11px] font-mono text-secondary" numberOfLines={2}>
              {pushToken || pushRegistration.expoPushToken || "Token not available (check permissions)"}
            </Text>
          </View>
        </View>

        <View>
          <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.5px] font-bold mb-2">
            Device Push Token ({pushRegistration.devicePushTokenType ?? "?"})
          </Text>
          <View className="bg-app border border-app rounded-xl p-3">
            <Text className="text-[11px] font-mono text-secondary" numberOfLines={2}>
              {pushRegistration.devicePushToken ||
                pushRegistration.devicePushTokenError ||
                "Token not available (check google-services + permissions)"}
            </Text>
          </View>
        </View>

        <View>
          <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.5px] font-bold mb-2">Last Sync State</Text>
          <View className="bg-app border border-app rounded-xl p-3">
            <Text className="text-[11px] font-mono text-secondary" numberOfLines={3}>
              {pushRegistration.lastError
                ? `Error: ${pushRegistration.lastError}`
                : pushRegistration.lastSyncedAt
                ? `Synced at ${pushRegistration.lastSyncedAt}`
                : pushRegistration.lastAttemptAt
                ? `Attempted at ${pushRegistration.lastAttemptAt}`
                : "Not attempted"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onTestPush}
          disabled={isSendingTestPush}
          className="rounded-2xl border border-app py-4 flex-row items-center justify-center gap-2"
          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC" }}
        >
          {isSendingTestPush ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Feather name="send" size={16} color={colors.accent} />
          )}
          <Text className="text-sm font-outfit font-bold text-accent uppercase tracking-wider">
            {isSendingTestPush ? "Sending..." : "Send Test Push"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
