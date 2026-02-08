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

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
    isChecked: z.boolean().refine((val) => val === true, {
      message: "Please agree to the Terms & Conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const { isDark, toggleColorScheme, colors } = useAppTheme();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      isChecked: false,
    },
    mode: "onChange",
  });

  const onSubmit = (data: RegisterFormData) => {
    console.log("Form submitted:", data);
    router.push("/(auth)/verify");
  };

  return (
    <SafeAreaView className="flex-1 bg-app">
      <View className="px-4 pt-4 flex-row justify-end">
        <Pressable onPress={toggleColorScheme} className="p-2">
          <Feather
            name={isDark ? "sun" : "moon"}
            size={24}
            color={colors.themeToggleIcon}
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
            Create Account
          </Text>
          <Text className="text-base font-outfit text-secondary">
            Sign up to get started on your journey.
          </Text>
        </View>

        <View className="space-y-4 gap-4 mb-6">
          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.name ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="user"
                size={20}
                color={errors.name ? colors.danger : colors.textSecondary}
              />
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 text-app text-base font-outfit"
                    placeholder="Full Name"
                    placeholderTextColor={colors.placeholder}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                )}
              />
            </View>
            {errors.name && (
              <Text className="text-danger text-xs font-outfit ml-2 mt-1">
                {errors.name.message}
              </Text>
            )}
          </View>

          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.email ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="mail"
                size={20}
                color={errors.email ? colors.danger : colors.textSecondary}
              />
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 text-app text-base font-outfit"
                    placeholder="Email Address"
                    placeholderTextColor={colors.placeholder}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                )}
              />
            </View>
            {errors.email && (
              <Text className="text-danger text-xs font-outfit ml-2 mt-1">
                {errors.email.message}
              </Text>
            )}
          </View>

          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.password ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="lock"
                size={20}
                color={errors.password ? colors.danger : colors.textSecondary}
              />
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 text-app text-base font-outfit"
                    placeholder="Password"
                    placeholderTextColor={colors.placeholder}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!showPassword}
                  />
                )}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Feather
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
            {errors.password && (
              <Text className="text-danger text-xs font-outfit ml-2 mt-1">
                {errors.password.message}
              </Text>
            )}
          </View>

          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.confirmPassword ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="lock"
                size={20}
                color={
                  errors.confirmPassword
                    ? colors.danger
                    : colors.textSecondary
                }
              />
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 text-app text-base font-outfit"
                    placeholder="Confirm Password"
                    placeholderTextColor={colors.placeholder}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!showConfirmPassword}
                  />
                )}
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
            {errors.confirmPassword && (
              <Text className="text-danger text-xs font-outfit ml-2 mt-1">
                {errors.confirmPassword.message}
              </Text>
            )}
          </View>
        </View>

        <View>
          <Controller
            control={control}
            name="isChecked"
            render={({ field: { onChange, value } }) => (
              <Pressable
                className="flex-row items-center mb-8"
                onPress={() => onChange(!value)}
              >
                <View
                  className={`w-6 h-6 rounded-md border items-center justify-center ${value ? "bg-accent border-accent" : "bg-input border-app"}`}
                >
                  {value && <Feather name="check" size={16} color="white" />}
                </View>
                <Text className="ml-3 text-secondary text-base font-outfit">
                  I agree to the{" "}
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/terms",
                        params: { from: "/(auth)/register" },
                      })
                    }
                  >
                    <Text className="text-accent font-bold">
                      Terms & Conditions
                    </Text>
                  </Pressable>
                </Text>
              </Pressable>
            )}
          />
          {errors.isChecked && (
            <Text className="text-danger text-xs font-outfit ml-2 mt-[-24] mb-8">
              {errors.isChecked.message}
            </Text>
          )}
        </View>

        <Pressable
          onPress={handleSubmit(onSubmit)}
          className="bg-accent h-14 rounded-xl items-center justify-center shadow-sm active:opacity-90 mb-8"
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
