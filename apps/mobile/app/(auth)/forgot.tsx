import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Mail } from "lucide-react-native";
import { useAdminPastel } from "../../components/admin/AdminUI";
import { apiRequest } from "../../lib/api";
import { getFriendlyAuthErrorMessage } from "../../lib/auth-error-message";
import { Text, TextInput } from "../../components/ScaledText";

export default function ForgotScreen() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const p = useAdminPastel();
  const normalizedEmail = email.trim().toLowerCase();
  const isEmailValid = /^\S+@\S+\.\S+$/.test(normalizedEmail);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ padding: 10, alignSelf: "flex-start", borderRadius: 100, backgroundColor: p.cardMint }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
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
            Forgot Password?
          </Text>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 16, lineHeight: 24, color: p.textMuted, maxWidth: 340 }}>
            Enter your email address and we&apos;ll send you an OTP to reset your password.
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: p.inputBg,
            borderRadius: 22,
            paddingHorizontal: 16,
            height: 56,
            marginBottom: 24,
          }}
        >
          <Mail size={20} color={p.textMuted} strokeWidth={2} />
          <TextInput
            accessibilityRole="text"
            accessibilityLabel="Email Address"
            style={{
              flex: 1,
              marginLeft: 12,
              fontFamily: "Outfit-Regular",
              fontSize: 16,
              color: p.textPrimary,
            }}
            placeholder="Email Address"
            placeholderTextColor={p.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
        </View>

        {formError ? (
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: "#E53935", marginBottom: 16 }}>
            {formError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSubmitting ? "Sending" : "Send OTP"}
          accessibilityState={{ disabled: isSubmitting || !normalizedEmail, busy: isSubmitting }}
          onPress={async () => {
            setFormError(null);
            if (!normalizedEmail) {
              setFormError("Please enter your email.");
              return;
            }
            if (!isEmailValid) {
              setFormError("Enter a valid email address.");
              return;
            }
            setIsSubmitting(true);
            try {
              await apiRequest("/auth/forgot", {
                method: "POST",
                body: { email: normalizedEmail },
              });
              router.push({
                pathname: "/(auth)/reset-password",
                params: { email: normalizedEmail },
              });
            } catch (err: any) {
              setFormError(getFriendlyAuthErrorMessage(err, "forgot"));
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
            marginBottom: 28,
            opacity: isSubmitting || !normalizedEmail ? 0.6 : 1,
          }}
          disabled={isSubmitting || !normalizedEmail}
        >
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 17, color: p.buttonPrimaryText }}>
            {isSubmitting ? "Sending..." : "Send OTP"}
          </Text>
        </Pressable>

        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4 }}>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 15, color: p.textSecondary }}>
            Remember your password?
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Log In"
            onPress={() => router.back()}
          >
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.accent }}>
              Log In
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
