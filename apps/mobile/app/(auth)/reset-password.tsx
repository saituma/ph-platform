import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Shield, Lock, Eye, EyeOff } from "lucide-react-native";
import { useAdminPastel } from "../../components/admin/AdminUI";
import { apiRequest } from "../../lib/api";
import { getFriendlyAuthErrorMessage } from "../../lib/auth-error-message";
import { Text, TextInput } from "../../components/ScaledText";

export default function ResetPasswordScreen() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const router = useRouter();
  const p = useAdminPastel();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const normalizedCode = code.replace(/\D/g, "").slice(0, 6);

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
            Reset Password
          </Text>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 16, lineHeight: 24, color: p.textMuted, maxWidth: 340 }}>
            Your identity has been verified. Set your new password.
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
            <Shield size={20} color={p.textMuted} strokeWidth={2} />
            <TextInput
              accessibilityRole="text"
              accessibilityLabel="Verification Code"
              style={{ flex: 1, marginLeft: 12, fontFamily: "Outfit-Regular", fontSize: 16, color: p.textPrimary }}
              placeholder="Verification Code"
              placeholderTextColor={p.textMuted}
              keyboardType="number-pad"
              value={normalizedCode}
              onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
            />
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
            <Lock size={20} color={p.textMuted} strokeWidth={2} />
            <TextInput
              accessibilityRole="text"
              accessibilityLabel="New Password"
              style={{ flex: 1, marginLeft: 12, fontFamily: "Outfit-Regular", fontSize: 16, color: p.textPrimary }}
              placeholder="New Password"
              placeholderTextColor={p.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
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
            <Lock size={20} color={p.textMuted} strokeWidth={2} />
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
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: "#E53935", marginBottom: 16 }}>
            {formError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSubmitting ? "Resetting" : "Reset Password"}
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          onPress={async () => {
            setFormError(null);
            if (!email) {
              setFormError("Missing email address");
              return;
            }
            if (normalizedCode.length !== 6) {
              setFormError("Please enter the 6-digit verification code.");
              return;
            }
            if (!password || password !== confirmPassword) {
              setFormError("Passwords do not match");
              return;
            }
            setIsSubmitting(true);
            try {
              await apiRequest("/auth/forgot/confirm", {
                method: "POST",
                body: { email, code: normalizedCode, password },
              });
              router.replace("/(auth)/login");
            } catch (err: any) {
              setFormError(getFriendlyAuthErrorMessage(err, "reset-password"));
            } finally {
              setIsSubmitting(false);
            }
          }}
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
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
