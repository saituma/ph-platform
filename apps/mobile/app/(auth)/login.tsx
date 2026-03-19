import { Feather } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import * as z from "zod";
import { useAppTheme } from "../theme/AppThemeProvider";
import { apiRequest } from "../../lib/api";
import {
  extractAuthErrorMessage,
  getFriendlyAuthErrorMessage,
} from "../../lib/auth-error-message";
import { useAppDispatch } from "../../store/hooks";
import { Text, TextInput } from "@/components/ScaledText";
import {
  AuthFieldRow,
  AuthFormGroup,
  AuthHeader,
  AuthPrimaryButton,
} from "@/components/auth/AuthPrimitives";
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
    resolver: zodResolver(loginSchema as any),
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
        refreshToken?: string | null;
      }>("/auth/login", {
        method: "POST",
        body: { email: data.email, password: data.password },
      });

      const token = login.idToken ?? login.accessToken;
      if (!token) {
        throw new Error("Login failed");
      }

      const me = await apiRequest<{
        user: { id: number; name: string; email: string; profilePicture?: string | null };
      }>("/auth/me", {
        token,
      });

      dispatch(
        setCredentials({
          token,
          refreshToken: login.refreshToken ?? null,
          profile: {
            id: String(me.user.id),
            name: me.user.name,
            email: me.user.email,
            avatar: me.user.profilePicture ?? null,
          },
        })
      );
      const onboarding = await apiRequest<{ athlete: { onboardingCompleted?: boolean; userId?: number } | null }>(
        "/onboarding",
        { token, suppressStatusCodes: [401], skipCache: true, forceRefresh: true }
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
          skipCache: true,
        });
        dispatch(setProgramTier(status?.currentProgramTier ?? null));
        dispatch(setLatestSubscriptionRequest(status?.latestRequest ?? null));
      } catch {
        dispatch(setProgramTier(null));
        dispatch(setLatestSubscriptionRequest(null));
      }
      router.replace(completed ? "/(tabs)" : "/(tabs)/onboarding");
    } catch (err: any) {
      const message = extractAuthErrorMessage(err);
      if (message.toLowerCase().includes("not confirmed")) {
        router.replace({
          pathname: "/(auth)/verify",
          params: { email: data.email, password: data.password },
        });
        return;
      }
      setFormError(getFriendlyAuthErrorMessage(err, "login"));
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
          paddingHorizontal: 20,
          paddingBottom: 32,
          paddingTop: 8,
        }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
      >
        <AuthHeader
          title="Welcome back"
          subtitle="Sign in to keep your training progress, coach feedback, and schedule in sync."
        />

        <View className="gap-4 mb-5">
          <AuthFormGroup>
            <AuthFieldRow
              icon="mail"
              label="Email"
              error={errors.email?.message}
            >
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="text-app font-outfit"
                    style={{ fontSize: 17, lineHeight: 22, paddingVertical: 0 }}
                    placeholder="name@example.com"
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
            </AuthFieldRow>
            <AuthFieldRow
              icon="lock"
              label="Password"
              error={errors.password?.message}
              isLast
              trailing={
                <Pressable
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather
                    name={showPassword ? "eye" : "eye-off"}
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
              }
            >
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="text-app font-outfit"
                    style={{ fontSize: 17, lineHeight: 22, paddingVertical: 0 }}
                    placeholder="Enter your password"
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
            </AuthFieldRow>
          </AuthFormGroup>
        </View>

        <View className="flex-row justify-end mb-6">
          <Pressable onPress={() => router.push("/forgot")}>
            <Text className="text-accent text-sm font-outfit-semibold">
              Forgot Password?
            </Text>
          </Pressable>
        </View>

        <AuthPrimaryButton
          onPress={handleSubmit(onSubmit)}
          isBusy={isSubmitting}
          label="Sign In"
          busyLabel="Signing In..."
        />
        {formError ? (
          <Text className="text-danger text-sm font-outfit mb-4" selectable>
            {formError}
          </Text>
        ) : null}
        <View className="flex-row justify-center items-center">
          <Text className="text-secondary text-base font-outfit">
            {"Don't"} have an account?{" "}
          </Text>
          <Pressable onPress={() => router.push("/(auth)/register")}>
            <Text className="text-accent text-base font-outfit-semibold">
              Sign Up
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
