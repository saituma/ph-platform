import { Feather } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import * as z from "zod";
import { useAppTheme } from "../theme/AppThemeProvider";

const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { isDark, toggleColorScheme } = useAppTheme();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const onSubmit = (data: LoginFormData) => {
    console.log("Login submitted:", data);
    router.replace("/(tabs)");
  };

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
          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.email ? "border-red-500" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="mail"
                size={20}
                color={
                  errors.email ? "#ef4444" : isDark ? "#94a3b8" : "#64748b"
                }
              />
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 text-app text-base font-outfit"
                    placeholder="Email Address"
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                )}
              />
            </View>
            {errors.email && (
              <Text className="text-red-500 text-xs font-outfit ml-2 mt-1">
                {errors.email.message}
              </Text>
            )}
          </View>

          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.password ? "border-red-500" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="lock"
                size={20}
                color={
                  errors.password ? "#ef4444" : isDark ? "#94a3b8" : "#64748b"
                }
              />
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 text-app text-base font-outfit"
                    placeholder="Password"
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Feather
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color={isDark ? "#94a3b8" : "#64748b"}
                />
              </Pressable>
            </View>
            {errors.password && (
              <Text className="text-red-500 text-xs font-outfit ml-2 mt-1">
                {errors.password.message}
              </Text>
            )}
          </View>
        </View>

        <View className="flex-row justify-end mb-8">
          <Pressable onPress={() => router.push("/forgot")}>
            <Text className="text-accent font-bold text-sm font-outfit">
              Forgot Password?
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleSubmit(onSubmit)}
          className="bg-accent h-14 rounded-xl items-center justify-center mb-8"
        >
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
