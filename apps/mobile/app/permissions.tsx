import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/constants/theme";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useRouter } from "expo-router";
import { getNotifications } from "@/lib/notifications";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { registerDevicePushToken } from "@/lib/pushRegistration";

type PermissionStatus = "granted" | "denied" | "undetermined";

const formatStatus = (status: PermissionStatus) =>
  status === "granted" ? "Granted" : status === "denied" ? "Denied" : "Not asked";

export default function PermissionsScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.user.token);
  const pushRegistration = useAppSelector((state) => state.app.pushRegistration);
  const [notificationStatus, setNotificationStatus] = useState<PermissionStatus>("undetermined");
  const [notificationsSupported, setNotificationsSupported] = useState(true);

  const cardBg = isDark ? "hsl(220, 8%, 12%)" : colors.card;
  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.06)";
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";
  const textPrimary = isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)";
  const successColor = isDark ? "hsl(155, 30%, 55%)" : "hsl(155, 40%, 38%)";
  const warningColor = isDark ? "hsl(40, 35%, 60%)" : "hsl(40, 45%, 42%)";

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
    if (!token) return;
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

  const isGranted = notificationStatus === "granted";
  const statusBadgeBg = isGranted
    ? isDark ? "hsla(155, 30%, 55%, 0.15)" : "hsla(155, 40%, 38%, 0.1)"
    : isDark ? "hsla(40, 35%, 60%, 0.15)" : "hsla(40, 45%, 42%, 0.1)";
  const statusBadgeText = isGranted ? successColor : warningColor;

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
      <ThemedScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <MoreStackHeader
          title="Permissions"
          subtitle="Control notification access with clearer status and less friction."
          badge="Access"
          onBack={() => router.replace("/(tabs)/more")}
        />

        <View style={{ paddingHorizontal: 24, gap: 24 }}>
          {/* Notification permission card */}
          <View
            style={{
              borderRadius: 20,
              borderWidth: 1,
              overflow: "hidden",
              padding: 20,
              gap: 16,
              backgroundColor: cardBg,
              borderColor: cardBorder,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View
                style={{
                  height: 48,
                  width: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 16,
                  backgroundColor: isDark ? `${colors.accent}18` : `${colors.accent}12`,
                }}
              >
                <Ionicons name="notifications-outline" size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontFamily: "ClashDisplay-Bold", color: textPrimary }}>
                  Notifications
                </Text>
                <Text style={{ fontSize: 12, fontFamily: "Outfit", color: labelColor, marginTop: 2 }}>
                  {notificationsSupported
                    ? "Get alerts for messages and updates."
                    : "Push notifications need a development build (not Expo Go)."}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 99,
                  backgroundColor: statusBadgeBg,
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: fonts.bodyBold, color: statusBadgeText }}>
                  {formatStatus(notificationStatus)}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={requestNotifications}
              style={({ pressed }) => ({
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 12,
                alignItems: "center",
                backgroundColor: colors.accent,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={{ color: "hsl(220, 5%, 98%)", fontFamily: fonts.bodyBold, fontSize: 14 }}>
                Request Permission
              </Text>
            </Pressable>

            <Pressable
              onPress={() => Linking.openSettings()}
              style={({ pressed }) => ({
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: cardBorder,
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={{ color: textPrimary, fontFamily: fonts.bodyBold, fontSize: 14 }}>
                Revoke in System Settings
              </Text>
            </Pressable>
          </View>

          {/* Push debug card */}
          <View
            style={{
              borderRadius: 20,
              borderWidth: 1,
              overflow: "hidden",
              padding: 20,
              gap: 12,
              backgroundColor: cardBg,
              borderColor: cardBorder,
            }}
          >
            <Text style={{ fontSize: 18, fontFamily: "ClashDisplay-Bold", color: textPrimary }}>
              Push Debug
            </Text>
            <Text style={{ fontSize: 12, fontFamily: "Outfit", color: labelColor }}>
              Current native build push status for this device.
            </Text>
            {([
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
            ] as [string, string][]).map(([label, value]) => (
              <View
                key={label}
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: fonts.bodyBold,
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                    color: labelColor,
                  }}
                >
                  {label}
                </Text>
                <Text
                  selectable
                  style={{ marginTop: 4, fontSize: 12, fontFamily: "Outfit", color: textPrimary }}
                >
                  {value}
                </Text>
              </View>
            ))}
          </View>

          {/* Open system settings */}
          <Pressable
            onPress={() => Linking.openSettings()}
            style={({ pressed }) => ({
              borderRadius: 20,
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderWidth: 1,
              borderColor: cardBorder,
              backgroundColor: cardBg,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  height: 40,
                  width: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  backgroundColor: isDark ? `${colors.accent}18` : `${colors.accent}14`,
                }}
              >
                <Ionicons name="settings-outline" size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: "ClashDisplay-Bold", color: textPrimary }}>
                  Open System Settings
                </Text>
                <Text style={{ fontSize: 12, fontFamily: "Outfit", color: labelColor, marginTop: 2 }}>
                  Manage all app permissions in system settings.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={isDark ? "hsl(220,5%,35%)" : "hsl(220,5%,60%)"} />
            </View>
          </Pressable>
        </View>
      </ThemedScrollView>
    </View>
  );
}
