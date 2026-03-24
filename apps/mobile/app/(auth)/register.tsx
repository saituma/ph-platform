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
import { Text, TextInput } from "@/components/ScaledText";
import {
  AuthFieldRow,
  AuthFormGroup,
  AuthHeader,
  AuthPrimaryButton,
} from "@/components/auth/AuthPrimitives";
import { LegalModal, LegalSection } from "@/components/ui/LegalModal";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must include an uppercase letter")
      .regex(/[a-z]/, "Password must include a lowercase letter")
      .regex(/[0-9]/, "Password must include a number")
      .regex(/[^A-Za-z0-9]/, "Password must include a special character"),
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
  const [showTerms, setShowTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const router = useRouter();
  const { isDark, toggleColorScheme, colors } = useAppTheme();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema as any),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      isChecked: false,
    },
    mode: "onChange",
  });

  const passwordValue = watch("password") ?? "";
  const passwordRules = {
    minLength: passwordValue.length >= 8,
    uppercase: /[A-Z]/.test(passwordValue),
    lowercase: /[a-z]/.test(passwordValue),
    number: /[0-9]/.test(passwordValue),
    special: /[^A-Za-z0-9]/.test(passwordValue),
  };

  const onSubmit = async (data: RegisterFormData) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: { name: data.name, email: data.email, password: data.password },
      });
      router.push({
        pathname: "/(auth)/verify",
        params: { email: data.email, password: data.password },
      });
    } catch (err: any) {
      console.error("Register failed", err);
      const message = extractAuthErrorMessage(err);
      if (message.toLowerCase().includes("already exists")) {
        router.replace("/(auth)/login");
        return;
      }
      setFormError(getFriendlyAuthErrorMessage(err, "register"));
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
          title="Create account"
          subtitle="Set up your profile so training plans, coaching, and family access are ready from day one."
        />

        <View className="space-y-4 gap-4 mb-6">
          <AuthFormGroup>
            <AuthFieldRow
              icon="user"
              label="Full name"
              error={errors.name?.message}
            >
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="text-app font-outfit"
                    style={{ fontSize: 17, lineHeight: 22, paddingVertical: 0 }}
                    placeholder="Your full name"
                    placeholderTextColor={colors.placeholder}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                )}
              />
            </AuthFieldRow>
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
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                )}
              />
            </AuthFieldRow>
            <AuthFieldRow
              icon="lock"
              label="Password"
              error={errors.password?.message}
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
                    placeholder="Create a password"
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
            </AuthFieldRow>
            {passwordValue.length > 0 ? (
              <View className="mt-3 ml-4 gap-1">
                <Text
                  className="text-xs font-outfit"
                  style={{ color: passwordRules.minLength ? colors.success : colors.textSecondary }}
                >
                  At least 8 characters
                </Text>
                <Text
                  className="text-xs font-outfit"
                  style={{ color: passwordRules.uppercase ? colors.success : colors.textSecondary }}
                >
                  1 uppercase letter (A-Z)
                </Text>
                <Text
                  className="text-xs font-outfit"
                  style={{ color: passwordRules.lowercase ? colors.success : colors.textSecondary }}
                >
                  1 lowercase letter (a-z)
                </Text>
                <Text
                  className="text-xs font-outfit"
                  style={{ color: passwordRules.number ? colors.success : colors.textSecondary }}
                >
                  1 number (0-9)
                </Text>
                <Text
                  className="text-xs font-outfit"
                  style={{ color: passwordRules.special ? colors.success : colors.textSecondary }}
                >
                  1 special character
                </Text>
              </View>
            ) : null}
            <AuthFieldRow
              icon="lock"
              label="Confirm password"
              error={errors.confirmPassword?.message}
              isLast
              trailing={
                <Pressable
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Feather
                    name={showConfirmPassword ? "eye" : "eye-off"}
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
              }
            >
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="text-app font-outfit"
                    style={{ fontSize: 17, lineHeight: 22, paddingVertical: 0 }}
                    placeholder="Re-enter your password"
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
            </AuthFieldRow>
          </AuthFormGroup>
        </View>

        <View>
          <Controller
            control={control}
            name="isChecked"
            render={({ field: { onChange, value } }) => (
              <View className="flex-row items-center mb-8">
                <View
                  className={`w-6 h-6 rounded-md border items-center justify-center ${value ? "bg-accent border-accent" : "bg-input border-app"}`}
                >
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: value }}
                    className="w-6 h-6 items-center justify-center"
                    hitSlop={8}
                    onPress={() => onChange(!value)}
                  >
                    {value ? <Feather name="check" size={16} color="white" /> : null}
                  </Pressable>
                </View>
                <View className="ml-3 flex-row items-center">
                  <Text className="text-secondary text-base font-outfit">
                    I agree to the{" "}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setShowTerms(true)}
                  >
                    <Text className="text-accent font-outfit-semibold">
                      Terms & Conditions
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
          {errors.isChecked && (
            <Text className="text-danger text-xs font-outfit ml-2 -mt-6 mb-8">
              {errors.isChecked.message}
            </Text>
          )}
        </View>

        <AuthPrimaryButton
          onPress={handleSubmit(onSubmit)}
          isBusy={isSubmitting}
          label="Sign Up"
          busyLabel="Creating..."
        />
        {formError ? (
          <Text className="text-danger text-sm font-outfit mb-4" selectable>
            {formError}
          </Text>
        ) : null}

        <View className="flex-row justify-center items-center">
          <Text className="text-secondary text-base font-outfit">
            Already have an account?{" "}
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text className="text-accent text-base font-outfit-semibold">
              Log In
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>

      <LegalModal visible={showTerms} onClose={() => setShowTerms(false)} title="Terms & Conditions">
        <View className="mb-6">
          <Text className="text-base font-outfit text-secondary mb-4">Last updated: February 05, 2024</Text>
          <Text className="text-base font-outfit text-secondary">
            By accessing or using the PHP Coaching application, you agree to be bound by these Terms of Service.
          </Text>
        </View>
        <LegalSection
          title="1. Agreement to Terms"
          content="By accessing or using the PHP Coaching application, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app."
        />
        <LegalSection
          title="2. Eligibility"
          content="The app is designed for athletes and their guardians. Guardians are responsible for the management of minor accounts and all coaching bookings."
        />
        <LegalSection
          title="3. Coaching & Subscriptions"
          content="Subscriptions provide access to specific training tiers (PHP, Plus, Premium). Features and availability may vary based on your selected plan."
        />
        <LegalSection
          title="4. Safety & Liability"
          content="Physical training involves inherent risks. Users must ensure they are in proper physical condition before proceeding with any training program provided."
        />
        <LegalSection
          title="5. Termination"
          content="We reserve the right to suspend or terminate accounts that violate our community guidelines or fail to maintain valid subscriptions."
        />
      </LegalModal>
    </SafeAreaView>
  );
}
