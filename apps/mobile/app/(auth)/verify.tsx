import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/AppThemeProvider";
import { apiRequest } from "../../lib/api";
import { useAppDispatch } from "../../store/hooks";
import { setCredentials, setOnboardingCompleted, setAthleteUserId } from "../../store/slices/userSlice";

export default function VerifyScreen() {
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const { colors } = useAppTheme();
  const dispatch = useAppDispatch();
  const { email, password } = useLocalSearchParams<{ email?: string; password?: string }>();

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
            color={colors.textSecondary}
          />
          <TextInput
            className="flex-1 ml-3 text-app text-xl font-outfit tracking-widest"
            placeholder="000000"
            placeholderTextColor={colors.placeholder}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <Pressable
          onPress={async () => {
            setFormError(null);
            if (!email) {
              setFormError("Missing email address");
              return;
            }
            setIsSubmitting(true);
            try {
              await apiRequest("/auth/confirm", {
                method: "POST",
                body: { email, code: otp },
              });
              if (password) {
                const login = await apiRequest<{
                  accessToken?: string;
                  idToken?: string;
                  refreshToken?: string | null;
                }>("/auth/login", {
                  method: "POST",
                  body: { email, password },
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
                    refreshToken: login.refreshToken ?? null,
                    profile: {
                      id: String(me.user.id),
                      name: me.user.name,
                      email: me.user.email,
                      avatar: null,
                    },
                  })
                );
                const onboarding = await apiRequest<{ athlete: { onboardingCompleted?: boolean; userId?: number } | null }>(
                  "/onboarding",
                  { token, suppressStatusCodes: [401] }
                );
                const completed = Boolean(onboarding.athlete?.onboardingCompleted);
                dispatch(setOnboardingCompleted(completed));
                dispatch(setAthleteUserId(onboarding.athlete?.userId ?? null));
                router.replace(completed ? "/(tabs)" : "/(tabs)/onboarding");
                return;
              }
              router.replace("/(auth)/login");
            } catch (err: any) {
              setFormError(err?.message ?? "Verification failed");
            } finally {
              setIsSubmitting(false);
            }
          }}
          className={`bg-accent h-14 rounded-xl items-center justify-center mb-8 ${isSubmitting ? "opacity-70" : ""}`}
          disabled={isSubmitting}
        >
          <Text className="text-white font-bold text-lg font-outfit">
            {isSubmitting ? "Verifying..." : "Verify Account"}
          </Text>
        </Pressable>
        {formError ? (
          <Text className="text-danger text-xs font-outfit mb-4">
            {formError}
          </Text>
        ) : null}

        <View className="flex-row justify-center items-center">
          <Text className="text-secondary text-base font-outfit">
            {"Didn't"} receive code?{" "}
          </Text>
          <Pressable
            onPress={async () => {
              setFormError(null);
              if (!email) {
                setFormError("Missing email address");
                return;
              }
              setIsSubmitting(true);
              try {
                await apiRequest("/auth/resend", {
                  method: "POST",
                  body: { email },
                });
              } catch (err: any) {
                setFormError(err?.message ?? "Failed to resend");
              } finally {
                setIsSubmitting(false);
              }
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
