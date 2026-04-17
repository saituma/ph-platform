import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@expo/vector-icons";
import { apiRequest } from "@/lib/api";
import { Shadows } from "@/constants/theme";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/userSlice";
import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "authToken";
const AUTH_REFRESH_KEY = "authRefreshToken";

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors, isDark } = useAppTheme();
  const token = useAppSelector((s) => s.user.token);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const cardStyle = {
    backgroundColor: isDark ? colors.cardElevated : "#F7FFF9",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
    ...(isDark ? Shadows.none : Shadows.sm),
  };

  const performDelete = useCallback(async () => {
    if (!token || deleteBusy) return;
    if (deletePassword.length < 8) {
      Alert.alert("Password required", "Enter your current password (at least 8 characters).");
      return;
    }
    setDeleteBusy(true);
    try {
      await apiRequest<{ ok?: boolean }>("/auth/delete-account", {
        method: "POST",
        token,
        body: { password: deletePassword },
        suppressStatusCodes: [400, 401, 403, 404],
      });
      setDeleteOpen(false);
      setDeletePassword("");
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(AUTH_REFRESH_KEY).catch(() => {});
      dispatch(logout());
      Alert.alert("Account closed", "Your account has been deleted. You can register again with a new account if needed.", [
        { text: "OK", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (e: any) {
      const msg = String(e?.message ?? "Could not delete account").replace(/^\d+\s+/, "");
      Alert.alert("Could not delete", msg);
    } finally {
      setDeleteBusy(false);
    }
  }, [deleteBusy, deletePassword, dispatch, router, token]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      "Delete account permanently?",
      "This removes your login and disables the account. Training history may be kept for records. This cannot be undone from the app.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void performDelete() },
      ],
    );
  }, [performDelete]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={["top"]}>
      <MoreStackHeader
        title="Privacy & Security"
        subtitle="Password and account deletion."
        badge="Security"
      />

      <ThemedScrollView
        onRefresh={async () => {
          await new Promise((r) => setTimeout(r, 800));
        }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 40,
        }}
      >
        <View className="mb-5">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="h-6 w-1.5 rounded-full" style={{ backgroundColor: colors.accent }} />
            <Text className="text-2xl font-telma-bold" style={{ color: colors.text }}>
              Account safety
            </Text>
          </View>
          <Text className="text-[15px] font-outfit leading-[22px]" style={{ color: colors.textSecondary }}>
            Manage password and account access.
          </Text>
        </View>

        <View className="rounded-[28px] border overflow-hidden mb-6" style={cardStyle}>
          <SecurityLink
            label="Change password"
            icon="key"
            onPress={() => router.navigate("/(auth)/change-password")}
            isLast={false}
            colors={colors}
            isDark={isDark}
          />
        </View>

        <View className="rounded-[28px] border overflow-hidden mb-2" style={cardStyle}>
          <View className="px-5 pt-5 pb-2">
            <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]" style={{ color: colors.danger }}>
              Danger zone
            </Text>
            <Text className="text-lg font-clash mt-2" style={{ color: colors.text }}>
              Delete account
            </Text>
            <Text className="text-sm font-outfit mt-2 leading-5" style={{ color: colors.textSecondary }}>
              Permanently close your account. You must enter your current password. Staff accounts cannot use this from the app.
              {"\n\n"}
              Alternatively, you can request account deletion on our website at:
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL("https://phperformance.uk/delete-account")}>
              <Text className="text-sm font-outfit text-accent font-bold mt-1">
                phperformance.uk/delete-account
              </Text>
            </TouchableOpacity>
          </View>
          <Pressable
            onPress={() => setDeleteOpen(true)}
            className="mx-5 mb-5 mt-2 h-12 rounded-2xl border items-center justify-center active:opacity-90"
            style={{ borderColor: colors.danger, backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)" }}
          >
            <Text className="text-sm font-clash font-bold" style={{ color: colors.danger }}>
              Delete my account…
            </Text>
          </Pressable>
        </View>
      </ThemedScrollView>

      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => !deleteBusy && setDeleteOpen(false)}>
        <Pressable className="flex-1 justify-center px-5" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => !deleteBusy && setDeleteOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-[24px] border p-5"
            style={{ backgroundColor: colors.cardElevated, borderColor: colors.border, ...(isDark ? Shadows.none : Shadows.md) }}
          >
            <Text className="text-lg font-clash" style={{ color: colors.text }}>
              Confirm password
            </Text>
            <Text className="text-sm font-outfit mt-2 leading-5" style={{ color: colors.textSecondary }}>
              Enter the password you use to sign in. Then confirm deletion in the next step.
            </Text>
            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!deleteBusy}
              placeholder="Current password"
              placeholderTextColor={colors.placeholder}
              className="mt-4 rounded-2xl border px-4 py-3 font-outfit text-base"
              style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.background }}
            />
            <View className="flex-row gap-3 mt-5">
              <Pressable
                onPress={() => !deleteBusy && setDeleteOpen(false)}
                className="flex-1 h-12 rounded-2xl border items-center justify-center"
                style={{ borderColor: colors.border }}
              >
                <Text className="text-sm font-outfit font-semibold" style={{ color: colors.textSecondary }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                disabled={deleteBusy}
                className="flex-1 h-12 rounded-2xl items-center justify-center flex-row gap-2"
                style={{ backgroundColor: colors.danger }}
              >
                {deleteBusy ? <ActivityIndicator color="#fff" /> : null}
                <Text className="text-sm font-clash font-bold text-white">Continue</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function SecurityLink({
  label,
  onPress,
  icon,
  isLast,
  colors,
  isDark,
}: {
  label: string;
  onPress: () => void;
  icon: keyof typeof Feather.glyphMap;
  isLast: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className={`flex-row items-center p-5 ${!isLast ? "border-b" : ""}`}
      style={!isLast ? { borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" } : undefined}
    >
      <View
        className="w-10 h-10 items-center justify-center rounded-2xl mr-4"
        style={{ backgroundColor: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.10)" }}
      >
        <Feather name={icon} size={18} color={colors.accent} />
      </View>
      <Text className="flex-1 font-outfit text-base font-semibold" style={{ color: colors.text }}>
        {label}
      </Text>
      <Feather name="chevron-right" size={18} color={colors.icon} />
    </TouchableOpacity>
  );
}
