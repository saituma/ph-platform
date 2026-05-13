import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Lock, Shield, Trash2, Key, Eye, ChevronLeft, AlertTriangle } from "lucide-react-native";
import { apiRequest } from "@/lib/api";
import { fonts } from "@/constants/theme";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { useAppToast } from "@/hooks/useAppToast";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
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
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);
  const toast = useAppToast();

  const p = useAdminPastel();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const pageBg = p.pageBg;
  const textPrimary = "#FFFFFF";
  const textSecondary = "rgba(255,255,255,0.75)";
  const accent = p.accent;
  const danger = p.danger;
  const cardRadius = 28;
  const cardBg = p.cardMint;
  const dangerCardBg = p.cardPink;
  const modalCardBg = p.cardLavender;
  const dangerBg = p.dangerSoft;
  const cardBorder = p.inputBorder;

  const performDelete = useCallback(async () => {
    if (!token || deleteBusy) return;
    if (deletePassword.length < 8) {
      toast.warning("Password required", "Enter your current password (at least 8 characters).");
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
      toast.success("Account closed", "Your account has been deleted.");
      setTimeout(() => router.replace("/(auth)/login"), 800);
    } catch (e: any) {
      const msg = String(e?.message ?? "Could not delete account").replace(/^\d+\s+/, "");
      toast.error("Could not delete", msg);
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
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: pageBg }}>
      <MoreStackHeader
        title="Privacy & Security"
        subtitle="Password and account deletion."
        badge="Security"
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <ThemedScrollView
        onRefresh={async () => {
          await new Promise((r) => setTimeout(r, 800));
        }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 40,
        }}
      >
        {/* Section header */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <View style={{ height: 24, width: 6, borderRadius: 99, backgroundColor: accent }} />
            <Text style={{ fontSize: 24, fontFamily: "TelmaBold", color: textPrimary }}>
              Account safety
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontFamily: "Outfit", lineHeight: 22, color: textSecondary }}>
            Manage password and account access.
          </Text>
        </View>

        {/* Change Password card */}
        <Pressable onPress={() => router.navigate("/change-password")} style={{ marginBottom: 24 }}>
          <View
            style={{
              height: 56,
              borderRadius: cardRadius,
              backgroundColor: cardBg,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <Key size={20} color={textPrimary} />
            <Text
              style={{
                color: textPrimary,
                fontFamily: "ClashDisplay-Bold",
                fontSize: 16,
              }}
            >
              Change Password
            </Text>
          </View>
        </Pressable>

        {/* Danger zone card */}
        <View
          style={{
            borderRadius: cardRadius,
                        overflow: "hidden",
            marginBottom: 8,
            backgroundColor: dangerCardBg,
          }}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={12} color={danger} />
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: fonts.bodyBold,
                  textTransform: "uppercase",
                  letterSpacing: 1.3,
                  color: danger,
                }}
              >
                Danger zone
              </Text>
            </View>
            <Text style={{ fontSize: 18, fontFamily: "ClashDisplay-Bold", marginTop: 8, color: textPrimary }}>
              Delete account
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "Outfit", marginTop: 8, lineHeight: 20, color: textSecondary }}>
              Permanently close your account. You must enter your current password. Staff accounts cannot use this from the app.
              {"\n\n"}
              Alternatively, you can request account deletion on our website at:
            </Text>
            <Pressable onPress={() => Linking.openURL("https://phperformance.uk/delete-account")}>
              <Text style={{ fontSize: 14, fontFamily: fonts.bodyBold, color: accent, marginTop: 4 }}>
                phperformance.uk/delete-account
              </Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setDeleteOpen(true)} style={{ marginHorizontal: 20, marginBottom: 20, marginTop: 8 }}>
            <View
              style={{
                height: 52,
                borderRadius: 100,
                                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                backgroundColor: dangerBg,
              }}
            >
              <Trash2 size={16} color={danger} />
              <Text style={{ fontSize: 14, fontFamily: fonts.bodyBold, color: danger }}>
                Delete my account…
              </Text>
            </View>
          </Pressable>
        </View>
      </ThemedScrollView>
      </KeyboardAvoidingView>

      {/* Delete confirmation modal */}
      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => !deleteBusy && setDeleteOpen(false)}>
        <Pressable
          style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20, backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={() => !deleteBusy && setDeleteOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              borderRadius: cardRadius,
                            padding: 20,
              backgroundColor: modalCardBg,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Lock size={20} color={textPrimary} />
              <Text style={{ fontSize: 18, fontFamily: "ClashDisplay-Bold", color: textPrimary }}>
                Confirm password
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontFamily: "Outfit", marginTop: 8, lineHeight: 20, color: textSecondary }}>
              Enter the password you use to sign in. Then confirm deletion in the next step.
            </Text>
            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!deleteBusy}
              placeholder="Current password"
              placeholderTextColor={textSecondary}
              style={{
                marginTop: 16,
                borderRadius: 22,
                                paddingHorizontal: 16,
                paddingVertical: 12,
                fontFamily: "Outfit",
                fontSize: 15,
                color: textPrimary,
                backgroundColor: p.pageBg,
              }}
            />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <Pressable
                onPress={() => !deleteBusy && setDeleteOpen(false)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 22,
                  backgroundColor: p.pageBg,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontSize: 14, fontFamily: fonts.bodyBold, color: textSecondary }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                disabled={deleteBusy}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 22,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: danger,
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
