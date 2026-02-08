import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/AppThemeProvider";

export default function ForgotScreen() {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <SafeAreaView className="flex-1 bg-app">
      <View className="px-4 pt-4">
        <Pressable onPress={() => router.back()} className="p-2 self-start">
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
        }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
      >
        <View className="mb-8">
          <Text className="text-4xl font-clash text-app mb-3">
            Forgot Password?
          </Text>
          <Text className="text-base font-outfit text-secondary leading-6">
            Enter your email address and we'll send you an OTP to reset your
            password.
          </Text>
        </View>

        <View className="flex-row items-center bg-input border border-app rounded-xl px-4 h-14 mb-6">
          <Feather
            name="mail"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            className="flex-1 ml-3 text-app text-base font-outfit"
            placeholder="Email Address"
            placeholderTextColor={colors.placeholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <Pressable
          onPress={() => router.push("/(auth)/reset-password")}
          className="bg-accent h-14 rounded-xl items-center justify-center mb-8"
        >
          <Text className="text-white font-bold text-lg font-outfit">
            Send OTP
          </Text>
        </Pressable>

        <View className="flex-row justify-center items-center">
          <Text className="text-secondary text-base font-outfit">
            Remember your password?{" "}
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
