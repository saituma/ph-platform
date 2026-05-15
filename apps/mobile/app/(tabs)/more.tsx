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
import { Pressable, View, Dimensions } from "react-native";
import { Image } from "expo-image";
import Svg, { Circle as SvgCircle } from "react-native-svg";
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
  Flame,
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
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useStreakStore } from "@/lib/streakStore";

const AVATAR_SIZE = 88;
const AVATAR_RING_SIZE = AVATAR_SIZE + 8;
const BANNER_HEIGHT = 140;

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
              coverImage?: string | null;
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
                coverImage: me.user.coverImage ?? null,
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

  const streak = useStreakStore((ss) => ss.currentStreak);

  /* Build menu items with index for alternating colors */
  let menuIndex = 0;

  const ringRadius = (AVATAR_RING_SIZE - 4) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;

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
        {/* ── Profile Card (screenshot style) ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, marginBottom: 24 }}>
          <View
            style={{
              overflow: "hidden",
              borderRadius: 28,
              borderCurve: "continuous",
              backgroundColor: p.cardWhite,
            }}
          >
            {/* Banner */}
            <View style={{ height: BANNER_HEIGHT, overflow: "hidden" }}>
              {profile.coverImage ? (
                <Image
                  source={{ uri: profile.coverImage }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <LinearGradient
                  colors={[p.accentSoft, p.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: "100%", height: "100%", opacity: 0.4 }}
                />
              )}
            </View>

            {/* Avatar overlapping banner */}
            <View style={{ alignItems: "center", marginTop: -(AVATAR_SIZE / 2) }}>
              <View style={{ width: AVATAR_RING_SIZE, height: AVATAR_RING_SIZE, alignItems: "center", justifyContent: "center" }}>
                {/* Progress ring around avatar */}
                <Svg width={AVATAR_RING_SIZE} height={AVATAR_RING_SIZE} style={{ position: "absolute" }}>
                  <SvgCircle
                    cx={AVATAR_RING_SIZE / 2}
                    cy={AVATAR_RING_SIZE / 2}
                    r={ringRadius}
                    stroke={p.accentSoft}
                    strokeWidth={3}
                    fill="none"
                  />
                  <SvgCircle
                    cx={AVATAR_RING_SIZE / 2}
                    cy={AVATAR_RING_SIZE / 2}
                    r={ringRadius}
                    stroke={p.accent}
                    strokeWidth={3}
                    fill="none"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringCircumference * 0.25}
                    strokeLinecap="round"
                    rotation={-90}
                    origin={`${AVATAR_RING_SIZE / 2}, ${AVATAR_RING_SIZE / 2}`}
                  />
                </Svg>

                {isLoading ? (
                  <Skeleton circle width={AVATAR_SIZE} height={AVATAR_SIZE} />
                ) : profile.avatar ? (
                  <View style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, overflow: "hidden", borderWidth: 3, borderColor: p.cardWhite }}>
                    <Image
                      source={{ uri: profile.avatar }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  </View>
                ) : (
                  <View style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: p.inputBg, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: p.cardWhite }}>
                    <User size={36} color={p.accent} />
                  </View>
                )}
              </View>

              {/* Streak badge */}
              {streak > 0 && (
                <View style={{ position: "absolute", top: AVATAR_SIZE / 2 + 6, right: "50%", marginRight: -(AVATAR_RING_SIZE / 2) - 4, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: p.cardWhite, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
                  <Flame size={12} color="#FF9500" fill="#FF9500" />
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: p.textPrimary }}>{streak}</Text>
                </View>
              )}
            </View>

            {/* Name + Email */}
            <View style={{ alignItems: "center", paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 }}>
              {isLoading ? (
                <View style={{ alignItems: "center", gap: 8 }}>
                  <Skeleton width={160} height={22} />
                  <Skeleton width={120} height={14} />
                </View>
              ) : (
                <>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 22, fontFamily: "Outfit-Bold", color: p.textPrimary, letterSpacing: -0.5 }}
                  >
                    {profile.name || "Profile"}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary, marginTop: 4 }}
                  >
                    {profile.email || (isAuthenticated ? "Email unavailable" : "Not signed in")}
                  </Text>
                </>
              )}
            </View>

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
              <MenuItem
                Icon={BookOpen}
                label="Community Guidelines"
                onPress={() => router.navigate("/community-guidelines" as any)}
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
          backgroundColor: p.cardWhite,
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
