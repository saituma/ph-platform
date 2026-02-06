import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/AppThemeProvider";

export default function VerifyScreen() {
  const [otp, setOtp] = useState("");
  const router = useRouter();
  const { isDark } = useAppTheme();

  return (
    <SafeAreaView className="flex-1 bg-app">
      <View className="px-4 pt-4">
        <Pressable onPress={() => router.back()} className="p-2 self-start">
          <Feather
            name="arrow-left"
            size={24}
            color={isDark ? "#94a3b8" : "#64748b"}
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
            Activate Account
          </Text>
          <Text className="text-base font-outfit text-secondary leading-6">
            Enter the activation code sent to your email to verify your account.
          </Text>
        </View>

        <View className="flex-row items-center bg-input border border-app rounded-xl px-4 h-14 mb-6">
          <Feather
            name="shield"
            size={20}
            color={isDark ? "#94a3b8" : "#64748b"}
          />
          <TextInput
            className="flex-1 ml-3 text-app text-xl font-outfit tracking-widest"
            placeholder="000000"
            placeholderTextColor="#94a3b8"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <Pressable
          onPress={() => router.push("/(tabs)/onboarding")}
          className="bg-accent h-14 rounded-xl items-center justify-center mb-8"
        >
          <Text className="text-white font-bold text-lg font-outfit">
            Verify Account
          </Text>
        </Pressable>

        <View className="flex-row justify-center items-center">
          <Text className="text-secondary text-base font-outfit">
            Didn't receive code?{" "}
          </Text>
          <Pressable
            onPress={() => {
              /* resend logic */
            }}
          >
            <Text className="text-accent font-bold text-base font-outfit">
              Resend
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
