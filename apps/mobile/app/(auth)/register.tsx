import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-app">
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
          <Text className="text-4xl font-clash text-app mb-2">
            Create Account
          </Text>
          <Text className="text-base font-outfit text-secondary">
            Sign up to get started on your journey.
          </Text>
        </View>

        <View className="gap-4 mb-6">
          <View className="flex-row items-center bg-input border border-app rounded-xl px-4 h-14">
            <Feather name="user" size={20} color="#64748b" />
            <TextInput
              className="flex-1 ml-3 text-app text-base font-outfit"
              placeholder="Full Name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View className="flex-row items-center bg-input border border-app rounded-xl px-4 h-14">
            <Feather name="mail" size={20} color="#64748b" />
            <TextInput
              className="flex-1 ml-3 text-app text-base font-outfit"
              placeholder="Email Address"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View className="flex-row items-center bg-input border border-app rounded-xl px-4 h-14">
            <Feather name="lock" size={20} color="#64748b" />
            <TextInput
              className="flex-1 ml-3 text-app text-base font-outfit"
              placeholder="Password"
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

          <View>
            <View
              className={`flex-row items-center bg-input border rounded-xl px-4 h-14 ${
                confirmPassword.length > 0
                  ? password === confirmPassword
                    ? "border-green-500"
                    : "border-red-500"
                  : "border-app"
              }`}
            >
              <Feather name="lock" size={20} color="#64748b" />
              <TextInput
                className="flex-1 ml-3 text-app text-base font-outfit"
                placeholder="Confirm Password"
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
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text className="text-red-500 text-xs font-outfit mt-1 ml-1">
                Passwords do not match
              </Text>
            )}
          </View>
        </View>

        <Pressable
          className="flex-row items-center mb-8"
          onPress={() => setIsChecked(!isChecked)}
        >
          <View
            className={`w-6 h-6 rounded-md border items-center justify-center ${isChecked ? "bg-accent border-accent" : "bg-app border-app"}`}
          >
            {isChecked && <Feather name="check" size={16} color="white" />}
          </View>
          <Text className="ml-3 text-secondary text-base font-outfit">
            I agree to the{" "}
            <Text className="text-accent font-bold">Terms & Conditions</Text>
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(auth)/verify")}
          className="bg-accent h-14 rounded-xl items-center justify-center mb-8"
        >
          <Text className="text-white font-bold text-lg font-outfit">
            Sign Up
          </Text>
        </Pressable>

        <View className="flex-row justify-center items-center">
          <Text className="text-secondary text-base font-outfit">
            Already have an account?{" "}
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text className="text-accent font-bold text-base font-outfit">
              Log In
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
