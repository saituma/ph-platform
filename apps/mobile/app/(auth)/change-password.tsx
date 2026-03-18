import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View, Alert } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { Text, TextInput } from "@/components/ScaledText";

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
  const { colors } = useAppTheme();
  const { token } = useAppSelector((state) => state.user);

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
      Alert.alert("Success", "Your password has been changed successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setFormError(err?.message ?? "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-app">
      <View className="px-4 pt-4">
        <Pressable onPress={() => router.back()} className="p-2 self-start bg-secondary rounded-full">
          <Feather
            name="arrow-left"
            size={24}
            color={colors.text}
          />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
      >
        <View className="mb-8">
          <Text className="text-4xl font-telma-bold text-app mb-3">
            Change Password
          </Text>
          <Text className="text-base font-outfit text-secondary leading-6">
            Keep your account secure by updating your password regularly.
          </Text>
        </View>

        <View className="gap-4 mb-8">
          <View className="flex-row items-center bg-input border border-app rounded-xl px-4 h-14">
            <Feather name="lock" size={20} color={colors.textSecondary} />
            <TextInput
              className="flex-1 ml-3 text-app text-base font-outfit"
              placeholder="Current Password"
              placeholderTextColor={colors.placeholder}
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry={!showOldPassword}
            />
            <Pressable onPress={() => setShowOldPassword(!showOldPassword)}>
              <Feather
                name={showOldPassword ? "eye" : "eye-off"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <View className="flex-row items-center bg-input border border-app rounded-xl px-4 h-14">
            <Feather name="shield" size={20} color={colors.textSecondary} />
            <TextInput
              className="flex-1 ml-3 text-app text-base font-outfit"
              placeholder="New Password"
              placeholderTextColor={colors.placeholder}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
            />
            <Pressable onPress={() => setShowNewPassword(!showNewPassword)}>
              <Feather
                name={showNewPassword ? "eye" : "eye-off"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <View className="flex-row items-center bg-input border border-app rounded-xl px-4 h-14">
            <Feather name="shield" size={20} color={colors.textSecondary} />
            <TextInput
              className="flex-1 ml-3 text-app text-base font-outfit"
              placeholder="Confirm New Password"
              placeholderTextColor={colors.placeholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <Pressable
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
          onPress={handleSubmit}
          className={`bg-accent h-14 rounded-xl items-center justify-center mb-4 ${isSubmitting ? "opacity-70" : ""}`}
          disabled={isSubmitting}
        >
          <Text className="text-white font-bold text-lg font-outfit">
            {isSubmitting ? "Updating..." : "Update Password"}
          </Text>
        </Pressable>

        {formError ? (
          <Text className="text-danger text-sm font-outfit text-center">
            {formError}
          </Text>
        ) : null}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
