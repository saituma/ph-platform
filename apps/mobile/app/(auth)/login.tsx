import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
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
const LOGIN_BG = require("@/assets/images/home-bg.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const APP_ICON = require("@/assets/images/splash-icon.png");

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
            email: data.email.trim().toLowerCase(),
            password: data.password,
          })
        : await apiRequest<{
            accessToken?: string;
            idToken?: string;
            refreshToken?: string | null;
          }>("/auth/login", {
            method: "POST",
            body: { email: data.email.trim().toLowerCase(), password: data.password },
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
    <View style={{ flex: 1 }}>
      {/* Background */}
      <Image source={LOGIN_BG} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.58)" }]} />

      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
        {/* Theme toggle */}
        <View style={styles.topBar}>
          <Pressable
            onPress={toggleColorScheme}
            style={styles.themeToggle}
            accessibilityRole="button"
            accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <Sun size={18} color="rgba(255,255,255,0.65)" strokeWidth={2} />
            ) : (
              <Moon size={18} color="rgba(255,255,255,0.65)" strokeWidth={2} />
            )}
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          {/* Logo + Branding */}
          <Animated.View entering={FadeInDown.duration(500).springify().damping(18)} style={styles.brandArea}>
            <View style={styles.logoRing}>
              <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
              <Image source={APP_ICON} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Animated.View entering={FadeIn.delay(200).duration(400)}>
              <Text style={styles.brandName}>PH Performance</Text>
            </Animated.View>
          </Animated.View>

          {/* Form card */}
          <Animated.View
            entering={FadeInDown.delay(120).duration(480).springify().damping(18)}
            style={styles.card}
          >
            <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.cardInner}>
              {/* Heading */}
              <View style={{ marginBottom: 22 }}>
                <Text style={styles.heading}>Welcome back</Text>
                <Text style={styles.subheading}>
                  Sign in to access your training, schedule, and coach feedback.
                </Text>
              </View>

              {/* Fields */}
              <View style={styles.fieldsContainer}>
                <AuthFieldRow icon="mail" label="Email" error={errors.email?.message} onDark>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={styles.input}
                        placeholder="name@example.com"
                        placeholderTextColor="rgba(47,159,61,0.38)"
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
                  onDark
                  isLast
                  trailing={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                      hitSlop={10}
                      onPress={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <Eye size={18} color="rgba(47,159,61,0.55)" strokeWidth={2} />
                      ) : (
                        <EyeOff size={18} color="rgba(47,159,61,0.55)" strokeWidth={2} />
                      )}
                    </Pressable>
                  }
                >
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your password"
                        placeholderTextColor="rgba(47,159,61,0.38)"
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
              </View>

              {/* Forgot password */}
              <View style={{ alignItems: "flex-end", marginTop: 12, marginBottom: 4 }}>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Forgot Password"
                  onPress={() => router.push("/forgot" as any)}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </Pressable>
              </View>

              {/* Error */}
              {formError ? (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBox}>
                  <Text style={styles.errorText}>{formError}</Text>
                </Animated.View>
              ) : null}

              {/* Sign in button */}
              <View style={{ marginTop: 20 }}>
                <AuthPrimaryButton
                  onPress={handleSubmit(onSubmit)}
                  isBusy={isSubmitting}
                  label="Sign In"
                  busyLabel="Signing In..."
                />
              </View>

              {/* EULA agreement */}
              <View style={{ marginTop: 14, paddingHorizontal: 2 }}>
                <Text style={styles.eulaText}>
                  By signing in, you agree to our{" "}
                  <Text
                    style={styles.eulaLink}
                    onPress={() => router.push("/terms" as any)}
                  >
                    Terms of Use
                  </Text>
                  {" "}and{" "}
                  <Text
                    style={styles.eulaLink}
                    onPress={() => router.push("/community-guidelines" as any)}
                  >
                    Community Guidelines
                  </Text>
                  . Accounts for minor athletes are created and monitored by a parent or guardian. We have zero tolerance for objectionable content or abusive users.
                </Text>
              </View>

              {/* Register row */}
              <View style={styles.registerRow}>
                <Text style={styles.registerText}>Don&apos;t have an account?</Text>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Register"
                  onPress={() => {
                    void Linking.openURL("https://phperformance.uk/register");
                  }}
                  style={styles.registerBtn}
                >
                  <Text style={styles.registerBtnText}>Register</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    alignItems: "flex-end",
  },
  themeToggle: {
    padding: 9,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    gap: 28,
  },
  brandArea: {
    alignItems: "center",
    gap: 16,
  },
  logoRing: {
    width: 88,
    height: 88,
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  brandName: {
    fontFamily: "Outfit-Bold",
    fontSize: 22,
    color: "rgba(255,255,255,0.92)",
    letterSpacing: -0.4,
  },
  card: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  cardInner: {
    padding: 24,
  },
  heading: {
    fontFamily: "Outfit-Bold",
    fontSize: 28,
    letterSpacing: -0.6,
    color: "rgba(255,255,255,0.95)",
    marginBottom: 6,
  },
  subheading: {
    fontFamily: "Outfit-Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.50)",
  },
  fieldsContainer: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  input: {
    fontFamily: "Outfit-Regular",
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 0,
    color: "rgba(255,255,255,0.90)",
  },
  forgotText: {
    fontFamily: "Outfit-SemiBold",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
  },
  errorBox: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(229,57,53,0.15)",
    borderWidth: 1,
    borderColor: "rgba(229,57,53,0.30)",
  },
  errorText: {
    fontFamily: "Outfit-Regular",
    fontSize: 13,
    color: "#FF6B6B",
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  registerText: {
    fontFamily: "Outfit-Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
  },
  registerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  registerBtnText: {
    fontFamily: "Outfit-Bold",
    fontSize: 13,
    color: "rgba(255,255,255,0.82)",
    letterSpacing: 0.2,
  },
  eulaText: {
    fontFamily: "Outfit-Regular",
    fontSize: 11,
    lineHeight: 16,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
  },
  eulaLink: {
    fontFamily: "Outfit-SemiBold",
    color: "rgba(255,255,255,0.50)",
    textDecorationLine: "underline",
  },
});
