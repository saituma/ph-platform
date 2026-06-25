import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Bell, BellOff, Camera } from "lucide-react-native";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { getNotifications } from "@/lib/notifications";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { registerDevicePushToken } from "@/lib/pushRegistration";

const STORAGE_KEY = "ph:permission_prompt_dismissed_at";
// Only show once per 7 days so users who dismiss aren't immediately re-prompted.
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

type PermStatus = "granted" | "denied" | "undetermined";

type PermissionItem = {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  status: PermStatus;
  onRequest: () => Promise<void>;
};

async function getNotificationStatus(): Promise<PermStatus> {
  const Notifications = await getNotifications();
  if (!Notifications) return "undetermined";
  const p = await Notifications.getPermissionsAsync();
  return p.status as PermStatus;
}

async function getCameraStatus(): Promise<PermStatus> {
  if (Platform.OS === "web") return "undetermined";
  try {
    const { Camera } = await import("expo-camera");
    const p = await Camera.getCameraPermissionsAsync();
    return p.status as PermStatus;
  } catch {
    return "undetermined";
  }
}


type Props = {
  /** Called when the sheet is dismissed (close or all granted). */
  onDismiss?: () => void;
};

export function PermissionPromptSheet({ onDismiss }: Props) {
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.user.token);
  const bootstrapReady = useAppSelector((s) => s.app?.bootstrapReady ?? false);

  const [visible, setVisible] = useState(false);
  const [notifStatus, setNotifStatus] = useState<PermStatus>("undetermined");
  const [cameraStatus, setCameraStatus] = useState<PermStatus>("undetermined");
  const checkedRef = useRef(false);

  const refreshStatuses = useCallback(async () => {
    const [n, c] = await Promise.all([
      getNotificationStatus(),
      getCameraStatus(),
    ]);
    setNotifStatus(n);
    setCameraStatus(c);
    return { n, c };
  }, []);

  useEffect(() => {
    if (!bootstrapReady || !token || checkedRef.current) return;
    checkedRef.current = true;

    const decide = async () => {
      // Respect cooldown so dismissed users aren't re-prompted immediately.
      const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      if (raw) {
        const dismissedAt = Number(raw);
        if (!isNaN(dismissedAt) && Date.now() - dismissedAt < COOLDOWN_MS) return;
      }

      const { n, c } = await refreshStatuses();

      const anyMissing = n !== "granted" || c !== "granted";
      if (anyMissing) setVisible(true);
    };

    // Small delay so the home screen renders first — this is a non-critical prompt.
    const t = setTimeout(() => void decide(), 1200);
    return () => clearTimeout(t);
  }, [bootstrapReady, token, refreshStatuses]);

  const dismiss = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem(STORAGE_KEY, String(Date.now())).catch(() => {});
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const requestNotifications = useCallback(async () => {
    if (!token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (notifStatus === "denied") {
      await Linking.openSettings();
      return;
    }
    const result = await registerDevicePushToken({ token, dispatch, requestPermission: true });
    setNotifStatus(result.permissionStatus as PermStatus);
  }, [token, dispatch, notifStatus]);

  const requestCamera = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (cameraStatus === "denied") {
      await Linking.openSettings();
      return;
    }
    try {
      const { Camera } = await import("expo-camera");
      const result = await Camera.requestCameraPermissionsAsync();
      setCameraStatus(result.status as PermStatus);
    } catch {}
  }, [cameraStatus]);

  // Auto-close when everything is granted.
  useEffect(() => {
    if (!visible) return;
    if (notifStatus === "granted" && cameraStatus === "granted") {
      setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 600);
    }
  }, [notifStatus, cameraStatus, visible, onDismiss]);

  const items: PermissionItem[] = [
    {
      key: "notifications",
      icon: <Bell size={20} color={notifStatus === "granted" ? p.success : p.accent} />,
      title: "Notifications",
      description: "Messages, program updates, and coach feedback.",
      status: notifStatus,
      onRequest: requestNotifications,
    },
    {
      key: "camera",
      icon: <Camera size={20} color={cameraStatus === "granted" ? p.success : p.accent} />,
      title: "Camera",
      description: "Send photos and videos to your coach.",
      status: cameraStatus,
      onRequest: requestCamera,
    },
  ].filter((item) => item.status !== "granted");

  if (!visible || items.length === 0) return null;

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(180)}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]}
          onPress={dismiss}
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        entering={SlideInDown.springify().damping(22).stiffness(200)}
        exiting={SlideOutDown.duration(220)}
        style={[
          styles.sheet,
          {
            backgroundColor: p.cardWhite,
            paddingBottom: insets.bottom + 12,
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: p.textMuted + "44" }]} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: p.textPrimary }]}>
            Allow access
          </Text>
          <Text style={[styles.subtitle, { color: p.textMuted }]}>
            These help the app work at its best. You can change them anytime in Settings.
          </Text>
        </View>

        {/* Permission rows */}
        <View style={styles.items}>
          {items.map((item) => (
            <PermissionRow
              key={item.key}
              item={item}
              colors={p}
            />
          ))}
        </View>

        {/* Dismiss */}
        <Pressable
          onPress={dismiss}
          style={({ pressed }) => [
            styles.dismissBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          hitSlop={8}
        >
          <Text style={[styles.dismissText, { color: p.textMuted }]}>
            Not now
          </Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

function PermissionRow({
  item,
  colors,
}: {
  item: PermissionItem;
  colors: ReturnType<typeof useAdminPastel>;
}) {
  const [loading, setLoading] = useState(false);
  const isDenied = item.status === "denied";

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await item.onRequest();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.pageBg,
          borderColor: colors.border ?? "rgba(0,0,0,0.06)",
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: item.status === "granted" ? colors.successSoft : colors.accentSoft },
        ]}
      >
        {item.icon}
      </View>

      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
          {item.title}
        </Text>
        <Text style={[styles.rowDesc, { color: colors.textMuted }]}>
          {item.description}
        </Text>
      </View>

      <Pressable
        onPress={handlePress}
        disabled={loading}
        style={({ pressed }) => [
          styles.allowBtn,
          {
            backgroundColor: isDenied ? colors.warningSoft : colors.accentSoft,
            opacity: pressed || loading ? 0.7 : 1,
          },
        ]}
      >
        {isDenied ? (
          <BellOff size={13} color={colors.warning} />
        ) : null}
        <Text
          style={[
            styles.allowText,
            { color: isDenied ? colors.warning : colors.accent },
          ]}
        >
          {isDenied ? "Settings" : "Allow"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    // Android elevation
    elevation: 24,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  header: {
    marginBottom: 16,
    gap: 4,
  },
  title: {
    fontFamily: "Outfit-Bold",
    fontSize: 22,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: "Outfit-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  items: {
    gap: 10,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: "Outfit-SemiBold",
    fontSize: 15,
  },
  rowDesc: {
    fontFamily: "Outfit-Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  allowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
  },
  allowText: {
    fontFamily: "Outfit-Bold",
    fontSize: 13,
  },
  dismissBtn: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dismissText: {
    fontFamily: "Outfit-Medium",
    fontSize: 14,
  },
});
