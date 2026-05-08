import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { Bell, Camera, MapPin, Shield, ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useRouter } from "expo-router";
import { getNotifications } from "@/lib/notifications";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { registerDevicePushToken } from "@/lib/pushRegistration";
import { useAdminPastel } from "@/components/admin/AdminUI";

type PermissionStatus = "granted" | "denied" | "undetermined";

const formatStatus = (status: PermissionStatus) =>
  status === "granted" ? "Granted" : status === "denied" ? "Denied" : "Not asked";

export default function PermissionsScreen() {
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.user.token);
  const pushRegistration = useAppSelector((state) => state.app.pushRegistration);
  const [notificationStatus, setNotificationStatus] = useState<PermissionStatus>("undetermined");
  const [notificationsSupported, setNotificationsSupported] = useState(true);

  const p = useAdminPastel();

  const pageBg = p.pageBg;
  const cardBg = p.cardSage;
  const debugCardBg = p.cardPeach;
  const textPrimary = "#FFFFFF";
  const textSecondary = "rgba(255,255,255,0.75)";
  const accent = p.accent;
  const successColor = p.success;
  const warningColor = p.warning;
  const cardRadius = 28;
  const debugRowBg = p.cardLavender;

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
  const statusBadgeBg = isGranted ? p.successSoft : p.warningSoft;
  const statusBadgeText = isGranted ? successColor : warningColor;

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: pageBg }}>
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
              borderRadius: cardRadius,
              overflow: "hidden",
              padding: 20,
              gap: 16,
              backgroundColor: cardBg,
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
                  backgroundColor: p.accentSoft,
                }}
              >
                <Bell size={22} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontFamily: "Outfit-Bold", color: textPrimary }}>
                  Notifications
                </Text>
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: textSecondary, marginTop: 2 }}>
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
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: statusBadgeText }}>
                  {formatStatus(notificationStatus)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={requestNotifications}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 52,
                  borderRadius: 100,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: p.buttonPrimary,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Text style={{ color: p.buttonPrimaryText, fontFamily: "Outfit-Bold", fontSize: 14 }}>
                  Request Permission
                </Text>
              </Pressable>

              <Pressable
                onPress={() => Linking.openSettings()}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 52,
                  borderRadius: 100,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: p.buttonPrimary,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Text style={{ color: p.buttonPrimaryText, fontFamily: "Outfit-Bold", fontSize: 14 }}>
                  Open Settings
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Push debug card */}
          <View
            style={{
              borderRadius: cardRadius,
              overflow: "hidden",
              padding: 20,
              gap: 12,
              backgroundColor: debugCardBg,
                          }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Shield size={20} color={accent} />
              <Text style={{ fontSize: 18, fontFamily: "Outfit-Bold", color: textPrimary }}>
                Push Debug
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: textSecondary }}>
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
                  borderRadius: 22,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: debugRowBg,
                                  }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Outfit-Bold",
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                    color: textSecondary,
                  }}
                >
                  {label}
                </Text>
                <Text
                  selectable
                  style={{ marginTop: 4, fontSize: 12, fontFamily: "Outfit-Regular", color: textPrimary }}
                >
                  {value}
                </Text>
              </View>
            ))}
          </View>

        </View>
      </ThemedScrollView>
    </View>
  );
}
