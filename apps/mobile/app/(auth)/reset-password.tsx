import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResetPasswordScreen() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-app">
      {/* Back Button */}
      <View className="px-4 pt-4">
        <Pressable onPress={() => router.back()} className="p-2 self-start">
          <Feather name="arrow-left" size={24} color="#64748b" />
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
          <Text className="text-4xl font-clash text-app mb-3">
            Reset Password
          </Text>
          <Text className="text-base font-outfit text-secondary leading-6">
            Your identity has been verified. Set your new password.
          </Text>
        </View>

        <View className="gap-4 mb-8">
          <View className="flex-row items-center bg-input border border-app rounded-xl px-4 h-14">
            <Feather name="shield" size={20} color="#64748b" />
            <TextInput
              className="flex-1 ml-3 text-app text-base font-outfit"
              placeholder="Verification Code"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
            />
          </View>

          <View className="flex-row items-center bg-input border border-app rounded-xl px-4 h-14">
            <Feather name="lock" size={20} color="#64748b" />
            <TextInput
              className="flex-1 ml-3 text-app text-base font-outfit"
              placeholder="New Password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Feather
                name={showPassword ? "eye" : "eye-off"}
                size={20}
                color="#64748b"
              />
            </Pressable>
          </View>

          <View className="flex-row items-center bg-input border border-app rounded-xl px-4 h-14">
            <Feather name="lock" size={20} color="#64748b" />
            <TextInput
              className="flex-1 ml-3 text-app text-base font-outfit"
              placeholder="Confirm New Password"
              placeholderTextColor="#94a3b8"
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
                color="#64748b"
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => router.replace("/(auth)/login")}
          className="bg-accent h-14 rounded-xl items-center justify-center mb-8"
        >
          <Text className="text-white font-bold text-lg font-outfit">
            Reset Password
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
