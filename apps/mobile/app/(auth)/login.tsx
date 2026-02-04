import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/AppThemeProvider";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { isDark, toggleColorScheme } = useAppTheme();

  return (
    <SafeAreaView className="flex-1 bg-app">
      <View className="px-4 pt-4 flex-row justify-end">
        <Pressable onPress={toggleColorScheme} className="p-2">
          <Feather
            name={isDark ? "sun" : "moon"}
            size={24}
            color={isDark ? "#FCD34D" : "#4F46E5"}
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
        <View className="mb-10">
          <Text className="text-4xl font-telma-bold text-app mb-2">
            Welcome Back
          </Text>
          <Text className="text-base font-outfit text-secondary">
            Please enter your details to sign in.
          </Text>
        </View>

        <View className="gap-4 mb-4">
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
        </View>

        <View className="flex-row justify-end mb-8">
          <Pressable onPress={() => router.push("/forgot")}>
            <Text className="text-accent font-bold text-sm font-outfit">
              Forgot Password?
            </Text>
          </Pressable>
        </View>

        <Pressable className="bg-accent h-14 rounded-xl items-center justify-center mb-8">
          <Text className="text-white font-bold text-lg font-outfit">
            Sign In
          </Text>
        </Pressable>
        <View className="flex-row justify-center items-center">
          <Text className="text-secondary text-base font-outfit">
            Don't have an account?{" "}
          </Text>
          <Pressable onPress={() => router.push("/(auth)/register")}>
            <Text className="text-accent font-bold text-base font-outfit">
              Register
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
