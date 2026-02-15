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
import { apiRequest } from "../../lib/api";
import { useAppDispatch } from "../../store/hooks";
import {
  setCredentials,
  setOnboardingCompleted,
  setAthleteUserId,
  setProgramTier,
  setLatestSubscriptionRequest,
} from "../../store/slices/userSlice";

const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const { isDark, toggleColorScheme, colors } = useAppTheme();
  const dispatch = useAppDispatch();

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

  const onSubmit = async (data: LoginFormData) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const login = await apiRequest<{
        accessToken?: string;
        idToken?: string;
      }>("/auth/login", {
        method: "POST",
        body: { email: data.email, password: data.password },
      });

      const token = login.idToken ?? login.accessToken;
      if (!token) {
        throw new Error("Login failed");
      }

      const me = await apiRequest<{ user: { id: number; name: string; email: string } }>("/auth/me", {
        token,
      });

      dispatch(
        setCredentials({
          token,
          profile: {
            id: String(me.user.id),
            name: me.user.name,
            email: me.user.email,
            avatar: null,
          },
        })
      );
      const onboarding = await apiRequest<{ athlete: { onboardingCompleted?: boolean } | null }>(
        "/onboarding",
        { token, suppressStatusCodes: [401] }
      );
      const completed = Boolean(onboarding.athlete?.onboardingCompleted);
      dispatch(setOnboardingCompleted(completed));
      dispatch(setAthleteUserId(onboarding.athlete?.userId ?? null));
      try {
        const status = await apiRequest<{
          currentProgramTier?: string | null;
          latestRequest?: {
            status?: string | null;
            paymentStatus?: string | null;
            planTier?: string | null;
            createdAt?: string | null;
          } | null;
        }>("/billing/status", {
          token,
          suppressStatusCodes: [401, 403, 404],
        });
        dispatch(setProgramTier(status?.currentProgramTier ?? null));
        dispatch(setLatestSubscriptionRequest(status?.latestRequest ?? null));
      } catch {
        dispatch(setProgramTier(null));
        dispatch(setLatestSubscriptionRequest(null));
      }
      router.replace(completed ? "/(tabs)" : "/(tabs)/onboarding");
    } catch (err: any) {
      const message = err?.message ?? "Login failed";
      if (message.toLowerCase().includes("not confirmed")) {
        router.replace({
          pathname: "/(auth)/verify",
          params: { email: data.email, password: data.password },
        });
        return;
      }
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
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
            Welcome Back
          </Text>
          <Text className="text-base font-outfit text-secondary">
            Please enter your details to sign in.
          </Text>
        </View>

        <View className="gap-4 mb-4">
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
                    keyboardType="email-address"
                    autoCorrect={false}
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
          className={`bg-accent h-14 rounded-xl items-center justify-center mb-8 ${isSubmitting ? "opacity-70" : ""}`}
          disabled={isSubmitting}
        >
          <Text className="text-white font-bold text-lg font-outfit">
            {isSubmitting ? "Signing In..." : "Sign In"}
          </Text>
        </Pressable>
        {formError ? (
          <Text className="text-danger text-xs font-outfit mb-4">
            {formError}
          </Text>
        ) : null}
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
