import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sun, Moon, Eye, EyeOff } from "lucide-react-native";
import * as z from "zod";
import { useAppTheme } from "../theme/AppThemeProvider";
import { useAdminPastel } from "../../components/admin/AdminUI";
import { apiRequest } from "../../lib/api";
import { getAuthBaseUrl } from "../../lib/authBaseUrl";
import { signInWithWorkerAndExchange } from "../../lib/workerAuth";
import { getFriendlyAuthErrorMessage } from "../../lib/auth-error-message";
import { useAppDispatch } from "../../store/hooks";
import { Text, TextInput } from "../../components/ScaledText";
import {
  AuthFieldRow,
  AuthFormGroup,
  AuthPrimaryButton,
} from "../../components/auth/AuthPrimitives";
import {
  setCredentials,
  setApiUserRole,
  setAppRole,
  setAuthTeamMembership,
  setCapabilities,
  setManagedAthletes,
  setMessagingAccessTiers,
  setPlanFeatures,
  setProgramTier,
  type AppCapabilities,
} from "../../store/slices/userSlice";
import { enrichTeamFieldsIfOnboardingHasThem } from "../../lib/auth/enrichTeamFromOnboarding";
import { resolveAppRole } from "../../lib/appRole";
import { markLoginFresh } from "../../store/AuthPersist";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGIN_VIDEO_SOURCE: number | null = require("../../assets/videos/login-bg.mp4") as number;

const HAS_VIDEO = LOGIN_VIDEO_SOURCE !== null;

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
  const { isDark, toggleColorScheme } = useAppTheme();
  const p = useAdminPastel();
  const dispatch = useAppDispatch();

  const player = useVideoPlayer(LOGIN_VIDEO_SOURCE, (pl) => {
    pl.loop = true;
    pl.muted = true;
    if (HAS_VIDEO) pl.play();
  });

  useEffect(() => {
    if (!HAS_VIDEO) return;
    const sub = player.addListener("statusChange", ({ status, error }) => {
      if (status === "error") {
        console.warn("[LoginScreen] video bg error:", error?.message);
      }
    });
    return () => sub.remove();
  }, [player]);

  const headingColor = HAS_VIDEO ? "rgba(255,255,255,0.95)" : p.textPrimary;
  const subtitleColor = HAS_VIDEO ? "rgba(255,255,255,0.62)" : p.textMuted;
  const inputColor = p.textPrimary;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema as any),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  const onSubmit = async (data: LoginFormData) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const authBase = getAuthBaseUrl();
      const login = authBase
        ? await signInWithWorkerAndExchange({
            authBaseUrl: authBase,
            email: data.email,
            password: data.password,
          })
        : await apiRequest<{
            accessToken?: string;
            idToken?: string;
            refreshToken?: string | null;
          }>("/auth/login", {
            method: "POST",
            body: { email: data.email, password: data.password },
          });

      const token = login.idToken ?? login.accessToken;
      if (!token) throw new Error("Login failed");

      const me = await apiRequest<{
        user: {
          id: number;
          name: string;
          email: string;
          role?: string | null;
          profilePicture?: string | null;
          coverImage?: string | null;
          programTier?: string | null;
          messagingAccessTiers?: string[];
          capabilities?: AppCapabilities | null;
          planFeatures?: string[];
          allAthletes?: {
            id?: number;
            userId?: number | null;
            name?: string | null;
            age?: number | null;
            athleteType?: "youth" | "adult" | null;
            team?: string | null;
            teamId?: number | null;
            level?: string | null;
            trainingPerWeek?: number | null;
            profilePicture?: string | null;
          }[] | null;
          team?: unknown;
          teamId?: number | null;
          athleteType?: "youth" | "adult" | null;
        };
      }>("/auth/me", { token, forceRefresh: true });

      const apiRole = me.user.role ?? null;

      const { fields: teamFields, athleteType: athleteTypeResolved } =
        await enrichTeamFieldsIfOnboardingHasThem({ token, meUser: me.user });

      markLoginFresh();
      dispatch(
        setCredentials({
          token,
          refreshToken: login.refreshToken ?? null,
          profile: {
            id: String(me.user.id),
            name: me.user.name,
            email: me.user.email,
            avatar: me.user.profilePicture ?? null,
            coverImage: me.user.coverImage ?? null,
          },
        }),
      );
      dispatch(setApiUserRole(apiRole));
      dispatch(setProgramTier(me.user.programTier ?? null));
      dispatch(setMessagingAccessTiers(me.user.messagingAccessTiers ?? []));
      dispatch(setCapabilities(me.user.capabilities ?? null));
      dispatch(setPlanFeatures(me.user.planFeatures ?? []));
      if (Array.isArray(me.user.allAthletes)) {
        dispatch(setManagedAthletes(me.user.allAthletes));
      }
      dispatch(setAuthTeamMembership({ team: teamFields.team, teamId: teamFields.teamId }));
      dispatch(
        setAppRole(
          resolveAppRole({
            userRole: apiRole ?? "guardian",
            athlete: {
              team: teamFields.team,
              teamId: teamFields.teamId,
              athleteType: athleteTypeResolved ?? me.user.athleteType ?? null,
            },
          }),
        ),
      );

      router.replace("/");
    } catch (err: any) {
      setFormError(getFriendlyAuthErrorMessage(err, "login"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      {HAS_VIDEO && (
        <>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.52)" }]} />
        </>
      )}

      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 4, alignItems: "flex-end" }}>
          <Pressable
            onPress={toggleColorScheme}
            style={{ padding: 10, borderRadius: 100, backgroundColor: HAS_VIDEO ? "rgba(255,255,255,0.12)" : p.cardMint }}
            accessibilityRole="button"
            accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <Sun size={20} color={HAS_VIDEO ? "rgba(255,255,255,0.70)" : p.accent} strokeWidth={2} />
            ) : (
              <Moon size={20} color={HAS_VIDEO ? "rgba(255,255,255,0.70)" : p.accent} strokeWidth={2} />
            )}
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
          enableOnAndroid
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 10, marginBottom: 28 }}>
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 34,
                lineHeight: 38,
                letterSpacing: -0.7,
                color: headingColor,
              }}
            >
              Welcome back
            </Text>
            <Text
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 16,
                lineHeight: 24,
                color: subtitleColor,
                maxWidth: 360,
              }}
            >
              Sign in to keep your training progress, coach feedback, and schedule in sync.
            </Text>
          </View>

          <View style={{ gap: 16, marginBottom: 20 }}>
            <AuthFormGroup>
              <AuthFieldRow icon="mail" label="Email" error={errors.email?.message}>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={{ fontFamily: "Outfit-Regular", fontSize: 17, lineHeight: 22, paddingVertical: 0, color: inputColor }}
                      placeholder="name@example.com"
                      placeholderTextColor={p.textMuted}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                      textContentType="emailAddress"
                      autoComplete="email"
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
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    hitSlop={10}
                    onPress={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <Eye size={18} color={p.textMuted} strokeWidth={2} />
                    ) : (
                      <EyeOff size={18} color={p.textMuted} strokeWidth={2} />
                    )}
                  </Pressable>
                }
              >
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={{ fontFamily: "Outfit-Regular", fontSize: 17, lineHeight: 22, paddingVertical: 0, color: inputColor }}
                      placeholder="Enter your password"
                      placeholderTextColor={p.textMuted}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="password"
                      autoComplete="current-password"
                    />
                  )}
                />
              </AuthFieldRow>
            </AuthFormGroup>
          </View>

          <View style={{ alignItems: "flex-end", marginBottom: 24 }}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Forgot Password"
              onPress={() => router.push("/forgot")}
            >
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.accent }}>
                Forgot Password?
              </Text>
            </Pressable>
          </View>

          {formError ? (
            <Text
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 14,
                color: "#E53935",
                marginBottom: 16,
              }}
            >
              {formError}
            </Text>
          ) : null}

          <AuthPrimaryButton
            onPress={handleSubmit(onSubmit)}
            isBusy={isSubmitting}
            label="Sign In"
            busyLabel="Signing In..."
          />

          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 4 }}>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: subtitleColor }}>
              Don&apos;t have an account?
            </Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Register"
              onPress={() => {
                const url =
                  (process.env.EXPO_PUBLIC_ONBOARDING_URL ?? "").trim() ||
                  "https://ph-platform-onboarding.vercel.app/";
                void Linking.openURL(url);
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 7,
                borderRadius: 100,
                backgroundColor: p.accent,
              }}
            >
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.buttonPrimaryText, letterSpacing: 0.3 }}>
                Register
              </Text>
            </Pressable>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}
