import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { useRefreshContext } from "@/context/RefreshContext";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { apiRequest } from "@/lib/api";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  logout,
  updateProfile,
} from "../../store/slices/userSlice";
import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";
import {
  normalizeProgramTier,
} from "@/lib/planAccess";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

function formatExperienceLabel(cfg: {
  title?: string | null;
  uiPreset?: string | null;
}) {
  const t = cfg.title?.trim();
  if (t) return t;
  const p = cfg.uiPreset;
  if (p === "playful") return "Playful";
  if (p === "performance") return "Performance";
  return "Standard";
}

function formatAccessTierLabel(tier: string | null | undefined): string {
  const n = normalizeProgramTier(tier ?? null);
  const labels: Record<string, string> = {
    PHP: "PHP",
    PHP_Premium: "Premium",
    PHP_Premium_Plus: "Plus",
    PHP_Pro: "Pro",
  };
  if (!n) return "Standard";
  return labels[n] ?? n.replace(/_/g, " ");
}

export default function MoreScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.user.profile);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const token = useAppSelector((state) => state.user.token);
  const programTier = useAppSelector((state) => state.user.programTier);
  const capabilities = useAppSelector((state) => state.user.capabilities);
  const {
    config: ageConfig,
    isLoading: ageExperienceLoading,
    refreshExperience,
  } = useAgeExperience();
  const { isLoading } = useRefreshContext();
  const transition = useSharedValue(1);
  const isPremiumPlus = normalizeProgramTier(programTier) === "PHP_Premium_Plus"
    || normalizeProgramTier(programTier) === "PHP_Pro";
  const isPro = normalizeProgramTier(programTier) === "PHP_Pro";
  const showParentPlatform =
    isAuthenticated && (Boolean(capabilities?.parentContent) || isPremiumPlus);
  const canAccessFoodDiary = Boolean(capabilities?.nutrition) || isPremiumPlus;
  const showPhysioReferrals = Boolean(capabilities?.physioReferrals) || isPro;

  useEffect(() => {
    transition.value = 0;
    transition.value = withTiming(1, {
      duration: 140,
      easing: Easing.out(Easing.cubic),
    });
  }, [transition]);

  const transitionStyle = useAnimatedStyle(() => ({
    opacity: transition.value,
    transform: [{ translateY: (1 - transition.value) * 10 }],
  }));

  const experienceLabel = useMemo(
    () => formatExperienceLabel(ageConfig),
    [ageConfig],
  );

  const handleRefresh = useCallback(async () => {
    if (!token) {
      refreshExperience();
      return;
    }
    await Promise.all([
      (async () => {
        try {
          const me = await apiRequest<{
            user?: {
              name?: string | null;
              email?: string | null;
              profilePicture?: string | null;
            };
          }>("/auth/me", {
            token,
            suppressStatusCodes: [401, 403],
            skipCache: true,
            forceRefresh: true,
          });
          if (me.user) {
            dispatch(
              updateProfile({
                name: me.user.name ?? null,
                email: me.user.email ?? null,
                avatar: me.user.profilePicture ?? null,
              }),
            );
          }
        } catch {
          /* keep existing profile */
        }
      })(),
    ]);
    refreshExperience();
  }, [token, dispatch, refreshExperience]);

  const versionLine = useMemo(() => {
    const appVersion = Constants.expoConfig?.version ?? "—";
    const expoCfg = Constants.expoConfig as
      | { ios?: { buildNumber?: string }; android?: { versionCode?: string } }
      | undefined;
    const build =
      Constants.nativeBuildVersion ??
      expoCfg?.ios?.buildNumber ??
      (expoCfg?.android?.versionCode != null
        ? String(expoCfg.android.versionCode)
        : "");
    return build
      ? `Version ${appVersion} (Build ${build})`
      : `Version ${appVersion}`;
  }, []);

  const insets = useAppSafeAreaInsets();
  const tabBarOverlayHeightEstimate = 86 + Math.max(insets.bottom, 12);

  const cardBg = isDark ? "hsl(220, 8%, 12%)" : "hsl(150, 20%, 97%)";
  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.06)";
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";
  const textPrimary = isDark ? "hsl(220, 5%, 94%)" : "hsl(220, 8%, 10%)";
  const subtleBg = isDark
    ? "rgba(255,255,255,0.05)"
    : "rgba(255,255,255,0.84)";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemedScrollView
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: tabBarOverlayHeightEstimate + 24,
        }}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: 32,
              fontFamily: "Telma-Bold",
              color: textPrimary,
              letterSpacing: -0.5,
            }}
          >
            More
          </Text>
          <ThemeToggle size={52} iconSize={24} />
        </View>

        {/* Profile Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          <View
            style={{
              overflow: "hidden",
              borderRadius: 28,
              borderWidth: 1,
              borderCurve: "continuous",
              padding: 24,
              backgroundColor: cardBg,
              borderColor: cardBorder,
            }}
          >
            <View
              style={{
                position: "absolute",
                right: -28,
                top: -28,
                height: 100,
                width: 100,
                borderRadius: 50,
                backgroundColor: isDark
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(34,197,94,0.08)",
              }}
            />

            {isLoading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                <Skeleton circle width={60} height={60} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Skeleton width="60%" height={22} />
                  <Skeleton width="40%" height={14} />
                </View>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  {profile.avatar ? (
                    <View
                      style={{
                        height: 60,
                        width: 60,
                        borderRadius: 20,
                        borderCurve: "continuous",
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: cardBorder,
                      }}
                    >
                      <Image
                        source={{ uri: profile.avatar }}
                        style={{ width: 60, height: 60 }}
                        contentFit="cover"
                      />
                    </View>
                  ) : (
                    <View
                      style={{
                        height: 60,
                        width: 60,
                        borderRadius: 20,
                        borderCurve: "continuous",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: subtleBg,
                        borderWidth: 1,
                        borderColor: cardBorder,
                      }}
                    >
                      <Ionicons name="person-outline" size={26} color={colors.accent} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 20,
                        fontFamily: "ClashDisplay-Bold",
                        color: textPrimary,
                        lineHeight: 24,
                      }}
                    >
                      {profile.name || "Profile"}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: "Outfit",
                        fontSize: 14,
                        color: labelColor,
                        marginTop: 4,
                      }}
                    >
                      {profile.email ||
                        (isAuthenticated ? "Email unavailable" : "Not signed in")}
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 12 }}>
                  <View
                    style={{
                      borderRadius: 16,
                      borderCurve: "continuous",
                      paddingHorizontal: 20,
                      paddingVertical: 18,
                      backgroundColor: subtleBg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: fonts.labelBold,
                        textTransform: "uppercase",
                        letterSpacing: 1.2,
                        color: labelColor,
                      }}
                    >
                      Access
                    </Text>
                    <Text
                      style={{
                        marginTop: 6,
                        fontSize: 17,
                        fontFamily: "ClashDisplay-Semibold",
                        color: textPrimary,
                      }}
                    >
                      {formatAccessTierLabel(programTier)}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 16,
                      borderCurve: "continuous",
                      paddingHorizontal: 20,
                      paddingVertical: 18,
                      backgroundColor: subtleBg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: fonts.labelBold,
                        textTransform: "uppercase",
                        letterSpacing: 1.2,
                        color: labelColor,
                      }}
                    >
                      Experience
                    </Text>
                    <Text
                      style={{
                        marginTop: 6,
                        fontSize: 17,
                        fontFamily: "ClashDisplay-Semibold",
                        color: textPrimary,
                      }}
                    >
                      {isAuthenticated && ageExperienceLoading
                        ? "…"
                        : experienceLabel}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Menu Items — flat list, no group borders */}
        <Animated.View style={[{ paddingHorizontal: 20 }, transitionStyle]}>
          {isLoading ? (
            <View style={{ gap: 16, paddingHorizontal: 4 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Skeleton width={48} height={48} style={{ borderRadius: 16 }} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width="55%" height={16} />
                    <Skeleton width="35%" height={12} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <>
              <SectionLabel text="Account" color={labelColor} />

              <MenuItem
                icon="person-outline"
                label="Profile Information"
                subtitle="Name, email, avatar"
                onPress={() => router.navigate("/profile-settings")}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />
              <MenuItem
                icon="shield-checkmark-outline"
                label="Permissions"
                subtitle="Notifications & push"
                onPress={() => router.navigate("/permissions")}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />
              {showParentPlatform ? (
                <MenuItem
                  icon="book-outline"
                  label="Parent Platform"
                  subtitle="Resources for parents"
                  onPress={() => router.push("/parent-platform")}
                  accentColor={colors.accent}
                  textColor={textPrimary}
                  subtitleColor={labelColor}
                  isDark={isDark}
                />
              ) : null}
              {canAccessFoodDiary ? (
                <MenuItem
                  icon="nutrition-outline"
                  label="Nutrition Tracking"
                  subtitle="Food diary & meals"
                  onPress={() => router.push("/nutrition")}
                  accentColor={colors.accent}
                  textColor={textPrimary}
                  subtitleColor={labelColor}
                  isDark={isDark}
                />
              ) : null}
              {showPhysioReferrals ? (
                <MenuItem
                  icon="pulse-outline"
                  label="Referrals"
                  subtitle="Physio referrals"
                  onPress={() => router.push("/physio-referral")}
                  accentColor={colors.accent}
                  textColor={textPrimary}
                  subtitleColor={labelColor}
                  isDark={isDark}
                />
              ) : null}
              <MenuItem
                icon="notifications-outline"
                label="Notifications"
                subtitle="Alerts & reminders"
                onPress={() => router.navigate("/notifications")}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />
              <MenuItem
                icon="lock-closed-outline"
                label="Privacy & Security"
                subtitle="Password & app lock"
                onPress={() => router.navigate("/privacy-security")}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />

              <SectionLabel text="Support & About" color={labelColor} />

              <MenuItem
                icon="star-outline"
                label="Submit Testimonial"
                subtitle="Share your experience"
                onPress={() => router.navigate("/submit-testimonial")}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />
              <MenuItem
                icon="megaphone-outline"
                label="Announcements"
                subtitle="Latest updates"
                onPress={() => router.push("/announcements" as any)}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />
              <MenuItem
                icon="help-circle-outline"
                label="Help Center"
                subtitle="FAQ & guides"
                onPress={() => router.push("/help-center")}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />
              <MenuItem
                icon="chatbubble-ellipses-outline"
                label="Send Feedback"
                subtitle="Report issues or ideas"
                onPress={() => router.push("/feedback")}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />
              <MenuItem
                icon="information-circle-outline"
                label="About App"
                subtitle="Version & credits"
                onPress={() => router.push("/about")}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />

              <SectionLabel text="Legal" color={labelColor} />

              <MenuItem
                icon="document-text-outline"
                label="Terms of Service"
                onPress={() => router.navigate("/terms")}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />
              <MenuItem
                icon="shield-outline"
                label="Privacy Policy"
                onPress={() => router.navigate("/privacy-policy")}
                accentColor={colors.accent}
                textColor={textPrimary}
                subtitleColor={labelColor}
                isDark={isDark}
              />

              {/* Logout */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Logout"
                onPress={() => {
                  dispatch(logout());
                  router.replace("/(auth)/login");
                }}
                style={({ pressed }) => ({
                  marginTop: 32,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <View
                  style={{
                    height: 56,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 20,
                    borderCurve: "continuous",
                    gap: 10,
                    backgroundColor: "#DC2626",
                  }}
                >
                  <Ionicons name="log-out-outline" size={20} color="#FAFAFA" />
                  <Text
                    style={{
                      fontFamily: "ClashDisplay-Bold",
                      color: "#FAFAFA",
                      fontSize: 16,
                    }}
                  >
                    Logout
                  </Text>
                </View>
              </Pressable>

              <Text
                style={{
                  textAlign: "center",
                  fontFamily: "Outfit",
                  fontSize: 12,
                  color: labelColor,
                  marginTop: 24,
                  opacity: 0.6,
                }}
              >
                {versionLine}
              </Text>
            </>
          )}
        </Animated.View>
      </ThemedScrollView>
    </View>
  );
}

function SectionLabel({ text, color }: { text: string; color: string }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontFamily: fonts.labelBold,
        color,
        textTransform: "uppercase",
        letterSpacing: 1.2,
        marginTop: 32,
        marginBottom: 8,
        paddingHorizontal: 4,
      }}
    >
      {text}
    </Text>
  );
}

function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
  accentColor,
  textColor,
  subtitleColor,
  isDark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  accentColor: string;
  textColor: string;
  subtitleColor: string;
  isDark: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginVertical: 6,
        borderRadius: 20,
        borderCurve: "continuous",
        backgroundColor: pressed
          ? isDark
            ? "rgba(255,255,255,0.04)"
            : "rgba(0,0,0,0.03)"
          : "transparent",
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 16,
            borderCurve: "continuous",
            marginRight: 16,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.06)"
              : `${accentColor}12`,
          }}
        >
          <Ionicons name={icon} size={22} color={accentColor} />
        </View>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 16,
              color: textColor,
            }}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: "Outfit",
                fontSize: 13,
                color: subtitleColor,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDark ? "hsl(220, 5%, 35%)" : "hsl(220, 5%, 72%)"}
        />
      </View>
    </Pressable>
  );
}
