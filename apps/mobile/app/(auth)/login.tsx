import { Feather } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import * as z from "zod";
import { useAppTheme } from "../theme/AppThemeProvider";
import { apiRequest } from "../../lib/api";
import { getAuthBaseUrl } from "../../lib/authBaseUrl";
import { signInWithWorkerAndExchange } from "../../lib/workerAuth";
import { getFriendlyAuthErrorMessage } from "../../lib/auth-error-message";
import { useAppDispatch } from "../../store/hooks";
import { Text, TextInput } from "@/components/ScaledText";
import {
  AuthFieldRow,
  AuthFormGroup,
  AuthPrimaryButton,
} from "@/components/auth/AuthPrimitives";
import {
  setCredentials,
  setApiUserRole,
  setAppRole,
  setAuthTeamMembership,
} from "../../store/slices/userSlice";
import { enrichTeamFieldsIfOnboardingHasThem } from "@/lib/auth/enrichTeamFromOnboarding";
import { resolveAppRole } from "@/lib/appRole";

// ─── Background video ─────────────────────────────────────────────────────────
// Drop your video file at:  apps/mobile/assets/videos/login-bg.mp4
// Then change `null` below to:  require("../../assets/videos/login-bg.mp4")
//
// Requirements: short loop (5–15s), H.264 MP4, < 5 MB, no audio needed.
// Using a local bundled asset means zero network requests and no rate-limit risk.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGIN_VIDEO_SOURCE: number | null = require("../../assets/videos/login-bg.mp4") as number;
// ─────────────────────────────────────────────────────────────────────────────

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
  const { isDark, toggleColorScheme, colors } = useAppTheme();
  const dispatch = useAppDispatch();

  // useVideoPlayer is always called (rules of hooks).
  // When LOGIN_VIDEO_SOURCE is null the player stays idle — no network request,
  // no render, no error.
  const player = useVideoPlayer(LOGIN_VIDEO_SOURCE, (p) => {
    p.loop = true;
    p.muted = true;
    if (HAS_VIDEO) p.play();
  });

  // Silence any playback errors so they never bubble up as render errors.
  useEffect(() => {
    if (!HAS_VIDEO) return;
    const sub = player.addListener("statusChange", ({ status, error }) => {
      if (status === "error") {
        console.warn("[LoginScreen] video bg error:", error?.message);
      }
    });
    return () => sub.remove();
  }, [player]);

  // Text colors adapt: white when the dark video overlay is active,
  // otherwise use the current theme tokens.
  const headingColor  = HAS_VIDEO ? "rgba(255,255,255,0.95)" : colors.text;
  const subtitleColor = HAS_VIDEO ? "rgba(255,255,255,0.62)" : colors.textSecondary;

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
          team?: unknown;
          teamId?: number | null;
          athleteType?: "youth" | "adult" | null;
        };
      }>("/auth/me", { token, forceRefresh: true });

      const apiRole = me.user.role ?? null;

      const { fields: teamFields, athleteType: athleteTypeResolved } =
        await enrichTeamFieldsIfOnboardingHasThem({ token, meUser: me.user });

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
        }),
      );
      dispatch(setApiUserRole(apiRole));
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
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Video background (only mounted when a source is configured) ── */}
      {HAS_VIDEO && (
        <>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
          {/* Dark overlay keeps text legible regardless of video content */}
          <View style={[StyleSheet.absoluteFill, styles.overlay]} />
        </>
      )}

      {/* ── Content (always above the video layer) ─────────────────────── */}
      <SafeAreaView style={styles.safeArea}>

        {/* Theme toggle */}
        <View style={styles.topRow}>
          <Pressable
            onPress={toggleColorScheme}
            style={styles.themeBtn}
            accessibilityRole="button"
            accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Feather
              name={isDark ? "sun" : "moon"}
              size={22}
              color={HAS_VIDEO ? "rgba(255,255,255,0.70)" : colors.themeToggleIcon}
            />
          </Pressable>
        </View>

        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          showsVerticalScrollIndicator={false}
        >
          {/* Header — inline so color overrides work over the video overlay */}
          <View style={styles.header}>
            <Text
              className="font-outfit-semibold"
              selectable
              style={[styles.title, { color: headingColor }]}
            >
              Welcome back
            </Text>
            <Text
              className="font-outfit"
              selectable
              style={[styles.subtitle, { color: subtitleColor }]}
            >
              Sign in to keep your training progress, coach feedback, and schedule in sync.
            </Text>
          </View>

          {/* Form fields */}
          <View style={styles.formGap}>
            <AuthFormGroup>
              <AuthFieldRow icon="mail" label="Email" error={errors.email?.message}>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="text-app font-outfit"
                      style={styles.input}
                      placeholder="name@example.com"
                      placeholderTextColor={colors.placeholder}
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
                    hitSlop={10}
                    onPress={() => setShowPassword((v) => !v)}
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
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.placeholder}
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

          {/* Forgot password */}
          <View style={styles.forgotRow}>
            <Pressable onPress={() => router.push("/forgot")}>
              <Text className="font-outfit-semibold" style={{ fontSize: 14, color: colors.accent }}>
                Forgot Password?
              </Text>
            </Pressable>
          </View>

          {formError ? (
            <Text className="text-danger text-sm font-outfit mb-4" selectable>
              {formError}
            </Text>
          ) : null}

          <AuthPrimaryButton
            onPress={handleSubmit(onSubmit)}
            isBusy={isSubmitting}
            label="Sign In"
            busyLabel="Signing In..."
          />

          {/* Register */}
          <View style={styles.registerRow}>
            <Text
              className="text-sm font-outfit text-center"
              style={{ color: subtitleColor }}
            >
              Don&apos;t have an account?
            </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                const url =
                  (process.env.EXPO_PUBLIC_ONBOARDING_URL ?? "").trim() ||
                  "https://ph-platform-onboarding.vercel.app/";
                void Linking.openURL(url);
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: colors.accent,
              }}
            >
              <Text
                className="font-outfit-bold"
                style={{ fontSize: 13, color: "#FFFFFF", letterSpacing: 0.3 }}
              >
                Register
              </Text>
            </Pressable>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  topRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
    alignItems: "flex-end",
  },
  themeBtn: {
    padding: 8,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  header: {
    gap: 10,
    marginBottom: 28,
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 360,
  },
  formGap: {
    gap: 16,
    marginBottom: 20,
  },
  input: {
    fontSize: 17,
    lineHeight: 22,
    paddingVertical: 0,
  },
  forgotRow: {
    alignItems: "flex-end",
    marginBottom: 24,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
});
