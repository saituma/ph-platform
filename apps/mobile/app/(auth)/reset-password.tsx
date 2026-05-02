import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/AppThemeProvider";
import { apiRequest } from "../../lib/api";
import { getFriendlyAuthErrorMessage } from "../../lib/auth-error-message";
import { Text, TextInput } from "@/components/ScaledText";

export default function ResetPasswordScreen() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const router = useRouter();
  const { colors } = useAppTheme();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const normalizedCode = code.replace(/\D/g, "").slice(0, 6);

  return (
    <SafeAreaView className="flex-1 bg-app">
      <View className="px-4 pt-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          className="p-2 self-start"
        >
          <Feather
            name="arrow-left"
            size={24}
            color={colors.textSecondary}
          />
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
        enableOnAndroid={true}
      >
        <View className="mb-8">
          <Text className="text-4xl font-telma-bold text-app mb-3">
            Reset Password
          </Text>
          <Text className="text-base font-outfit text-secondary leading-6">
            Your identity has been verified. Set your new password.
          </Text>
        </View>

        <View className="gap-4 mb-8">
          <View className="flex-row items-center bg-input border border-app rounded-2xl px-4 h-14">
            <Feather
              name="shield"
              size={20}
              color={colors.textSecondary}
            />
            <TextInput
              accessibilityRole="text"
              accessibilityLabel="Verification Code"
              className="flex-1 ml-3 text-app text-base font-outfit"
              placeholder="Verification Code"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              value={normalizedCode}
              onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
            />
          </View>

          <View className="flex-row items-center bg-input border border-app rounded-2xl px-4 h-14">
            <Feather name="lock" size={20} color={colors.textSecondary} />
            <TextInput
              accessibilityRole="text"
              accessibilityLabel="New Password"
              className="flex-1 ml-3 text-app text-base font-outfit"
              placeholder="New Password"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Feather
                name={showPassword ? "eye" : "eye-off"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <View className="flex-row items-center bg-input border border-app rounded-2xl px-4 h-14">
            <Feather name="lock" size={20} color={colors.textSecondary} />
            <TextInput
              accessibilityRole="text"
              accessibilityLabel="Confirm New Password"
              className="flex-1 ml-3 text-app text-base font-outfit"
              placeholder="Confirm New Password"
              placeholderTextColor={colors.placeholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Feather
                name={showConfirmPassword ? "eye" : "eye-off"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>

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
          className={`bg-accent h-14 rounded-xl items-center justify-center mb-8 ${isSubmitting ? "opacity-70" : ""}`}
          disabled={isSubmitting}
        >
          <Text className="text-white font-bold text-lg font-outfit">
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </Text>
        </Pressable>
        {formError ? (
          <Text className="text-danger text-xs font-outfit mb-4">
            {formError}
          </Text>
        ) : null}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
