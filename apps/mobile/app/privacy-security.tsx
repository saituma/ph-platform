import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "@/lib/api";
import { fonts } from "@/constants/theme";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/userSlice";
import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "authToken";
const AUTH_REFRESH_KEY = "authRefreshToken";

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const cardBg = isDark ? "hsl(220, 8%, 12%)" : "hsl(150, 30%, 97%)";
  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.06)";
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";
  const textPrimary = isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)";
  const dangerColor = isDark ? "hsl(0, 35%, 60%)" : "hsl(0, 40%, 48%)";
  const dangerBg = isDark ? "hsla(0, 35%, 60%, 0.12)" : "hsla(0, 40%, 48%, 0.08)";
  const dangerBorder = isDark ? "hsla(0, 35%, 60%, 0.2)" : "hsla(0, 40%, 48%, 0.15)";

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
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
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
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <View style={{ height: 24, width: 6, borderRadius: 99, backgroundColor: colors.accent }} />
            <Text style={{ fontSize: 24, fontFamily: "TelmaBold", color: textPrimary }}>
              Account safety
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontFamily: "Outfit", lineHeight: 22, color: labelColor }}>
            Manage password and account access.
          </Text>
        </View>

        <View
          style={{
            borderRadius: 20,
            borderWidth: 1,
            overflow: "hidden",
            marginBottom: 24,
            backgroundColor: cardBg,
            borderColor: cardBorder,
          }}
        >
          <Pressable
            onPress={() => router.navigate("/(auth)/change-password")}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              padding: 20,
              backgroundColor: pressed
                ? isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)"
                : "transparent",
            })}
          >
            <View
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                backgroundColor: isDark ? `${colors.accent}18` : `${colors.accent}14`,
                marginRight: 16,
              }}
            >
              <Ionicons name="key-outline" size={18} color={colors.accent} />
            </View>
            <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: textPrimary }}>
              Change password
            </Text>
            <Ionicons name="chevron-forward" size={17} color={isDark ? "hsl(220,5%,35%)" : "hsl(220,5%,60%)"} />
          </Pressable>
        </View>

        <View
          style={{
            borderRadius: 20,
            borderWidth: 1,
            overflow: "hidden",
            marginBottom: 8,
            backgroundColor: cardBg,
            borderColor: dangerBorder,
          }}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
            <Text
              style={{
                fontSize: 10,
                fontFamily: fonts.bodyBold,
                textTransform: "uppercase",
                letterSpacing: 1.3,
                color: dangerColor,
              }}
            >
              Danger zone
            </Text>
            <Text style={{ fontSize: 18, fontFamily: "ClashDisplay-Bold", marginTop: 8, color: textPrimary }}>
              Delete account
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "Outfit", marginTop: 8, lineHeight: 20, color: labelColor }}>
              Permanently close your account. You must enter your current password. Staff accounts cannot use this from the app.
              {"\n\n"}
              Alternatively, you can request account deletion on our website at:
            </Text>
            <Pressable onPress={() => Linking.openURL("https://phperformance.uk/delete-account")}>
              <Text style={{ fontSize: 14, fontFamily: fonts.bodyBold, color: colors.accent, marginTop: 4 }}>
                phperformance.uk/delete-account
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => setDeleteOpen(true)}
            style={({ pressed }) => ({
              marginHorizontal: 20,
              marginBottom: 20,
              marginTop: 8,
              height: 48,
              borderRadius: 14,
              borderWidth: 1,
              alignItems: "center",
              justifyContent: "center",
              borderColor: dangerBorder,
              backgroundColor: dangerBg,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Text style={{ fontSize: 14, fontFamily: fonts.bodyBold, color: dangerColor }}>
              Delete my account…
            </Text>
          </Pressable>
        </View>
      </ThemedScrollView>

      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => !deleteBusy && setDeleteOpen(false)}>
        <Pressable
          style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20, backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={() => !deleteBusy && setDeleteOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              borderRadius: 24,
              borderWidth: 1,
              padding: 20,
              backgroundColor: isDark ? "hsl(220, 8%, 14%)" : colors.card,
              borderColor: cardBorder,
            }}
          >
            <Text style={{ fontSize: 18, fontFamily: "ClashDisplay-Bold", color: textPrimary }}>
              Confirm password
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "Outfit", marginTop: 8, lineHeight: 20, color: labelColor }}>
              Enter the password you use to sign in. Then confirm deletion in the next step.
            </Text>
            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!deleteBusy}
              placeholder="Current password"
              placeholderTextColor={labelColor}
              style={{
                marginTop: 16,
                borderRadius: 14,
                borderWidth: 1,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontFamily: "Outfit",
                fontSize: 15,
                borderColor: cardBorder,
                color: textPrimary,
                backgroundColor: colors.background,
              }}
            />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <Pressable
                onPress={() => !deleteBusy && setDeleteOpen(false)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  borderWidth: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: cardBorder,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontSize: 14, fontFamily: fonts.bodyBold, color: labelColor }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                disabled={deleteBusy}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: dangerColor,
                  opacity: pressed || deleteBusy ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                {deleteBusy ? <ActivityIndicator color="hsl(220, 5%, 98%)" /> : null}
                <Text style={{ fontSize: 14, fontFamily: fonts.bodyBold, color: "hsl(220, 5%, 98%)" }}>
                  Continue
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
