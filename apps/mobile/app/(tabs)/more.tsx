import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { useRefreshContext } from "@/context/RefreshContext";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAdminPastel } from "@/components/admin/AdminUI";
import type { AdminPastelColors } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import {
  User,
  Bell,
  Lock,
  Star,
  Megaphone,
  HelpCircle,
  MessageCircle,
  Info,
  FileText,
  Shield,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  BookOpen,
  Apple,
  Activity,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  logout,
  updateProfile,
  setCapabilities,
  setPlanFeatures,
  setProgramTier,
} from "../../store/slices/userSlice";
import type { AppCapabilities } from "../../store/slices/userSlice";
import { Text } from "@/components/ScaledText";
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
  const { isDark, toggleColorScheme } = useAppTheme();
  const p = useAdminPastel();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.user.profile);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const appRole = useAppSelector((state) => state.user.appRole);
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
  const isAdultUserRole =
    appRole === "adult_athlete" || appRole === "adult_athlete_team";
  const showParentPlatform =
    isAuthenticated && Boolean(capabilities?.parentContent) && !isAdultUserRole;
  const canAccessFoodDiary = Boolean(capabilities?.nutrition);
  const showPhysioReferrals = Boolean(capabilities?.physioReferrals);

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
              capabilities?: AppCapabilities | null;
              planFeatures?: string[];
              programTier?: string | null;
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
            dispatch(setCapabilities(me.user.capabilities ?? null));
            dispatch(setPlanFeatures(me.user.planFeatures ?? []));
            dispatch(setProgramTier(me.user.programTier ?? null));
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

  /* Build menu items with index for alternating colors */
  let menuIndex = 0;

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
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
            width: "100%",
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 20,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: 32,
              fontFamily: "Outfit-Bold",
              color: p.textPrimary,
              letterSpacing: -0.5,
            }}
          >
            More
          </Text>
        </View>

        {/* Profile Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          <View
            style={{
              overflow: "hidden",
              borderRadius: 28,
              borderCurve: "continuous",
              padding: 24,
              backgroundColor: p.cardSage,
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
                backgroundColor: p.accentSoft,
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
                        borderColor: p.divider,
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
                        backgroundColor: p.inputBg,
                        borderWidth: 1,
                        borderColor: p.divider,
                      }}
                    >
                      <User size={26} color={p.accent} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 20,
                        fontFamily: "Outfit-Bold",
                        color: p.textPrimary,
                        lineHeight: 24,
                      }}
                    >
                      {profile.name || "Profile"}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: "Outfit-Regular",
                        fontSize: 14,
                        color: p.textSecondary,
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
                      backgroundColor: p.inputBg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: "Outfit-Bold",
                        textTransform: "uppercase",
                        letterSpacing: 1.2,
                        color: p.textMuted,
                      }}
                    >
                      Access
                    </Text>
                    <Text
                      style={{
                        marginTop: 6,
                        fontSize: 17,
                        fontFamily: "Outfit-Bold",
                        color: p.textPrimary,
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
                      backgroundColor: p.inputBg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: "Outfit-Bold",
                        textTransform: "uppercase",
                        letterSpacing: 1.2,
                        color: p.textMuted,
                      }}
                    >
                      Experience
                    </Text>
                    <Text
                      style={{
                        marginTop: 6,
                        fontSize: 17,
                        fontFamily: "Outfit-Bold",
                        color: p.textPrimary,
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

        {/* Menu Items */}
        <Animated.View style={[{ paddingHorizontal: 20, width: "100%" }, transitionStyle]}>
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
              {/* Appearance switch */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: p.cardWhite,
                  borderRadius: 99,
                  padding: 4,
                  marginBottom: 8,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Light mode"
                  accessibilityState={{ selected: !isDark }}
                  onPress={() => { if (isDark) toggleColorScheme(); }}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    paddingVertical: 11,
                    borderRadius: 99,
                    backgroundColor: !isDark ? p.accent : "transparent",
                  }}
                >
                  <Sun size={16} color={!isDark ? "#FFFFFF" : p.textMuted} />
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: !isDark ? "#FFFFFF" : p.textMuted }}>
                    Light
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dark mode"
                  accessibilityState={{ selected: isDark }}
                  onPress={() => { if (!isDark) toggleColorScheme(); }}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    paddingVertical: 11,
                    borderRadius: 99,
                    backgroundColor: isDark ? p.accent : "transparent",
                  }}
                >
                  <Moon size={16} color={isDark ? "#FFFFFF" : p.textMuted} />
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: isDark ? "#FFFFFF" : p.textMuted }}>
                    Dark
                  </Text>
                </Pressable>
              </View>

              <SectionLabel text="Account" p={p} />

              <MenuItem
                Icon={User}
                label="Profile Information"
                subtitle="Name, email, avatar"
                onPress={() => router.navigate("/profile-settings")}
                p={p}
                index={menuIndex++}
              />
              {showParentPlatform ? (
                <MenuItem
                  Icon={BookOpen}
                  label="Parent Platform"
                  subtitle="Resources for parents"
                  onPress={() => router.push("/parent-platform")}
                  p={p}
                  index={menuIndex++}
                />
              ) : null}
              {canAccessFoodDiary ? (
                <MenuItem
                  Icon={Apple}
                  label="Nutrition Tracking"
                  subtitle="Food diary & meals"
                  onPress={() => router.push("/nutrition")}
                  p={p}
                  index={menuIndex++}
                />
              ) : null}
              {showPhysioReferrals ? (
                <MenuItem
                  Icon={Activity}
                  label="Referrals"
                  subtitle="Physio referrals"
                  onPress={() => router.push("/physio-referral")}
                  p={p}
                  index={menuIndex++}
                />
              ) : null}
              <MenuItem
                Icon={Bell}
                label="Notifications"
                subtitle="Alerts & reminders"
                onPress={() => router.navigate("/notifications")}
                p={p}
                index={menuIndex++}
              />
              <MenuItem
                Icon={Lock}
                label="Privacy & Security"
                subtitle="Password & app lock"
                onPress={() => router.navigate("/privacy-security")}
                p={p}
                index={menuIndex++}
              />

              <SectionLabel text="Support & About" p={p} />

              <MenuItem
                Icon={Star}
                label="Submit Testimonial"
                subtitle="Share your experience"
                onPress={() => router.navigate("/submit-testimonial")}
                p={p}
                index={menuIndex++}
              />
              <MenuItem
                Icon={Megaphone}
                label="Announcements"
                subtitle="Latest updates"
                onPress={() => router.push("/announcements" as any)}
                p={p}
                index={menuIndex++}
              />
              <MenuItem
                Icon={HelpCircle}
                label="Help Center"
                subtitle="FAQ & guides"
                onPress={() => router.push("/help-center")}
                p={p}
                index={menuIndex++}
              />
              <MenuItem
                Icon={MessageCircle}
                label="Send Feedback"
                subtitle="Report issues or ideas"
                onPress={() => router.push("/feedback")}
                p={p}
                index={menuIndex++}
              />
              <MenuItem
                Icon={Info}
                label="About App"
                subtitle="Version & credits"
                onPress={() => router.push("/about")}
                p={p}
                index={menuIndex++}
              />

              <SectionLabel text="Legal" p={p} />

              <MenuItem
                Icon={FileText}
                label="Terms of Service"
                onPress={() => router.navigate("/terms")}
                p={p}
                index={menuIndex++}
              />
              <MenuItem
                Icon={Shield}
                label="Privacy Policy"
                onPress={() => router.navigate("/privacy-policy")}
                p={p}
                index={menuIndex++}
              />

              {/* Logout */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Logout"
                onPress={() => {
                  if (token) {
                    import("@/lib/pushRegistration").then(({ clearDevicePushToken }) => {
                      void clearDevicePushToken(token);
                    });
                  }
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
                    borderRadius: 100,
                    borderCurve: "continuous",
                    gap: 10,
                    backgroundColor: p.danger,
                  }}
                >
                  <LogOut size={20} color="#FFFFFF" />
                  <Text
                    style={{
                      fontFamily: "Outfit-Bold",
                      color: "#FFFFFF",
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
                  fontFamily: "Outfit-Regular",
                  fontSize: 12,
                  color: p.textMuted,
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

function SectionLabel({ text, p }: { text: string; p: AdminPastelColors }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontFamily: "Outfit-Bold",
        color: p.textMuted,
        textTransform: "uppercase",
        letterSpacing: 1.2,
        marginTop: 24,
        marginBottom: 12,
        paddingHorizontal: 4,
      }}
    >
      {text}
    </Text>
  );
}

function MenuItem({
  Icon,
  label,
  subtitle,
  onPress,
  p,
  index,
}: {
  Icon: LucideIcon;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  p: AdminPastelColors;
  index: number;
}) {
  const bg = index % 2 === 0 ? p.cardWhite : p.cardSage;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={subtitle || undefined}
      style={{ marginBottom: 16 }}
    >
      <View
        style={{
          paddingHorizontal: 18,
          paddingVertical: 18,
          borderRadius: 20,
          borderCurve: "continuous",
          backgroundColor: bg,
        }}
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
              backgroundColor: p.accentSoft,
            }}
          >
            <Icon size={22} color={p.accent} />
          </View>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 16,
                color: p.textPrimary,
              }}
            >
              {label}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 13,
                  color: p.textSecondary,
                  marginTop: 2,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          <ChevronRight size={18} color={p.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}
