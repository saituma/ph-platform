import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Lock, Shield, Eye, EyeOff } from "lucide-react-native";
import { useAdminPastel } from "../../components/admin/AdminUI";
import { apiRequest } from "../../lib/api";
import { getFriendlyAuthErrorMessage } from "../../lib/auth-error-message";
import { useAppSelector } from "../../store/hooks";
import { Text, TextInput } from "../../components/ScaledText";
import { useAppToast } from "../../hooks/useAppToast";

export default function ChangePasswordScreen() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const router = useRouter();
  const p = useAdminPastel();
  const { token } = useAppSelector((state) => state.user);
  const toast = useAppToast();

  const handleSubmit = async () => {
    setFormError(null);
    if (!oldPassword || !newPassword || !confirmPassword) {
      setFormError("All fields are required");
      return;
    }
    if (newPassword.length < 8) {
      setFormError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }
    if (oldPassword === newPassword) {
      setFormError("New password cannot be the same as the old password");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        token,
        body: { oldPassword, newPassword },
      });
      toast.success("Success", "Your password has been changed successfully.");
      setTimeout(() => router.back(), 600);
    } catch (err: any) {
      setFormError(getFriendlyAuthErrorMessage(err, "change-password"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={{ padding: 10, alignSelf: "flex-start", borderRadius: 100, backgroundColor: p.cardMint }}
        >
          <ArrowLeft size={22} color={p.textPrimary} strokeWidth={2} />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingBottom: 32,
        }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
      >
        <View style={{ marginBottom: 28, gap: 10 }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 34, lineHeight: 38, letterSpacing: -0.7, color: p.textPrimary }}>
            Change Password
          </Text>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 16, lineHeight: 24, color: p.textMuted, maxWidth: 340 }}>
            Keep your account secure by updating your password regularly.
          </Text>
        </View>

        <View style={{ gap: 12, marginBottom: 28 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: p.inputBg,
              borderRadius: 22,
              paddingHorizontal: 16,
              height: 56,
            }}
          >
            <Lock size={20} color={p.textMuted} strokeWidth={2} />
            <TextInput
              accessibilityRole="text"
              accessibilityLabel="Current Password"
              style={{ flex: 1, marginLeft: 12, fontFamily: "Outfit-Regular", fontSize: 16, color: p.textPrimary }}
              placeholder="Current Password"
              placeholderTextColor={p.textMuted}
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry={!showOldPassword}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showOldPassword ? "Hide current password" : "Show current password"}
              onPress={() => setShowOldPassword(!showOldPassword)}
            >
              {showOldPassword ? (
                <Eye size={20} color={p.textMuted} strokeWidth={2} />
              ) : (
                <EyeOff size={20} color={p.textMuted} strokeWidth={2} />
              )}
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: p.inputBg,
              borderRadius: 22,
              paddingHorizontal: 16,
              height: 56,
            }}
          >
            <Shield size={20} color={p.textMuted} strokeWidth={2} />
            <TextInput
              accessibilityRole="text"
              accessibilityLabel="New Password"
              style={{ flex: 1, marginLeft: 12, fontFamily: "Outfit-Regular", fontSize: 16, color: p.textPrimary }}
              placeholder="New Password"
              placeholderTextColor={p.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showNewPassword ? "Hide new password" : "Show new password"}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? (
                <Eye size={20} color={p.textMuted} strokeWidth={2} />
              ) : (
                <EyeOff size={20} color={p.textMuted} strokeWidth={2} />
              )}
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: p.inputBg,
              borderRadius: 22,
              paddingHorizontal: 16,
              height: 56,
            }}
          >
            <Shield size={20} color={p.textMuted} strokeWidth={2} />
            <TextInput
              accessibilityRole="text"
              accessibilityLabel="Confirm New Password"
              style={{ flex: 1, marginLeft: 12, fontFamily: "Outfit-Regular", fontSize: 16, color: p.textPrimary }}
              placeholder="Confirm New Password"
              placeholderTextColor={p.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <Eye size={20} color={p.textMuted} strokeWidth={2} />
              ) : (
                <EyeOff size={20} color={p.textMuted} strokeWidth={2} />
              )}
            </Pressable>
          </View>
        </View>

        {formError ? (
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: "#E53935", textAlign: "center", marginBottom: 16 }}>
            {formError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSubmitting ? "Updating" : "Update Password"}
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          onPress={handleSubmit}
          style={{
            backgroundColor: p.accent,
            height: 56,
            borderRadius: 100,
            alignItems: "center",
            justifyContent: "center",
            opacity: isSubmitting ? 0.6 : 1,
          }}
          disabled={isSubmitting}
        >
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 17, color: p.buttonPrimaryText }}>
            {isSubmitting ? "Updating..." : "Update Password"}
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
