import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { Feather } from "@/components/ui/theme-icons";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getNotifications } from "@/lib/notifications";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { registerDevicePushToken } from "@/lib/pushRegistration";

type PermissionStatus = "granted" | "denied" | "undetermined";

const formatStatus = (status: PermissionStatus) =>
  status === "granted" ? "Granted" : status === "denied" ? "Denied" : "Not asked";

export default function PermissionsScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.user.token);
  const pushRegistration = useAppSelector((state) => state.app.pushRegistration);
  const [notificationStatus, setNotificationStatus] = useState<PermissionStatus>("undetermined");
  const [notificationsSupported, setNotificationsSupported] = useState(true);

  const refreshStatuses = useCallback(async () => {
    const notifications = await getNotifications();
    if (!notifications) {
      setNotificationsSupported(false);
      setNotificationStatus("undetermined");
      return;
    }
    setNotificationsSupported(true);
    const permissionStatus = await notifications.getPermissionsAsync();
    setNotificationStatus(permissionStatus.status);
  }, []);

  useEffect(() => {
    void refreshStatuses();
  }, [refreshStatuses]);

  const requestNotifications = async () => {
    if (!token) {
      return;
    }
    const result = await registerDevicePushToken({
      token,
      dispatch,
      requestPermission: true,
    });
    if (result.support !== "supported") {
      setNotificationsSupported(false);
      await Linking.openURL("https://docs.expo.dev/develop/development-builds/introduction/");
      return;
    }
    setNotificationsSupported(true);
    setNotificationStatus(result.permissionStatus);
  };

  return (
    <SafeAreaView className="flex-1 bg-app">
      <ThemedScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <MoreStackHeader
          title="Permissions"
          subtitle="Control notification access with clearer status and less friction."
          badge="Access"
          onBack={() => router.replace("/(tabs)/more")}
        />

        <View className="px-6 gap-6">
          <PermissionCard
            icon="bell"
            title="Notifications"
            description={
              notificationsSupported
                ? "Get alerts for messages and updates."
                : "Push notifications need a development build (not Expo Go)."
            }
            status={notificationStatus}
            onRequest={requestNotifications}
            onRevoke={() => Linking.openSettings()}
            accentColor={colors.accent}
            isDark={isDark}
          />

          <View className="bg-input rounded-3xl overflow-hidden shadow-sm border border-app p-5 gap-3">
            <Text className="text-lg font-clash text-app">Push Debug</Text>
            <Text className="text-xs font-outfit text-secondary">
              Current native build push status for this device.
            </Text>
            {[
              ["Support", pushRegistration.support],
              ["Permission", pushRegistration.permissionStatus],
              ["Project ID", pushRegistration.projectId || "Missing"],
              ["Expo token", pushRegistration.expoPushToken || "Not available"],
              [
                `Device token (${pushRegistration.devicePushTokenType ?? "?"})`,
                pushRegistration.devicePushToken ||
                  pushRegistration.devicePushTokenError ||
                  "Not available",
              ],
              ["Last error", pushRegistration.lastError || "None"],
            ].map(([label, value]) => (
              <View key={label} className="rounded-2xl border border-app px-4 py-3">
                <Text className="text-[11px] font-outfit font-semibold uppercase tracking-[1.2px] text-secondary">
                  {label}
                </Text>
                <Text className="mt-1 text-xs font-outfit text-app">{value}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => Linking.openSettings()}
            className="bg-secondary rounded-3xl px-5 py-4 border border-app"
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.98 : 1 }],
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-accent/15">
                <Feather name="settings" size={18} color={colors.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-clash text-app">
                  Open System Settings
                </Text>
                <Text className="text-xs font-outfit text-secondary">
                  Manage all app permissions in system settings.
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={`${colors.accent}99`} />
            </View>
          </Pressable>
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}

function PermissionCard({
  icon,
  title,
  description,
  status,
  onRequest,
  onRevoke,
  accentColor,
  isDark,
}: {
  icon: any;
  title: string;
  description: string;
  status: PermissionStatus;
  onRequest: () => void;
  onRevoke?: () => void;
  accentColor: string;
  isDark: boolean;
}) {
  const isGranted = status === "granted";
  const badgeBg = isGranted ? "bg-emerald-100" : "bg-amber-100";
  const badgeText = isGranted ? "text-emerald-700" : "text-amber-700";
  const badgeBgDark = isGranted ? "bg-emerald-500/15" : "bg-amber-400/15";
  const badgeTextDark = isGranted ? "text-emerald-300" : "text-amber-300";

  return (
    <View className="bg-input rounded-3xl overflow-hidden shadow-sm border border-app p-5 gap-4">
      <View className="flex-row items-center gap-4">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
          <Feather name={icon} size={22} color={accentColor} />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-clash text-app">{title}</Text>
          <Text className="text-xs font-outfit text-secondary">{description}</Text>
        </View>
        <View
          className={`px-3 py-1 rounded-full ${isDark ? badgeBgDark : badgeBg}`}
        >
          <Text className={`text-xs font-outfit font-semibold ${isDark ? badgeTextDark : badgeText}`}>
            {formatStatus(status)}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onRequest}
        className="bg-accent rounded-2xl px-4 py-3 items-center"
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.92 : 1,
        })}
      >
        <Text className="text-white font-bold font-outfit text-sm">
          Request Permission
        </Text>
      </Pressable>
      {onRevoke ? (
        <Pressable
          onPress={onRevoke}
          className="bg-secondary rounded-2xl px-4 py-3 items-center border border-app"
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.98 : 1 }],
            opacity: pressed ? 0.92 : 1,
          })}
        >
          <Text className="text-app font-bold font-outfit text-sm">
            Revoke in System Settings
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
